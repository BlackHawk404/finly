/**
 * Natural-language → structured expense parser.
 *
 * Examples it handles:
 *   "I spent 250 rupees on groceries yesterday with card"
 *   "lunch 15 dollars cash"
 *   "uber 12.50 yesterday"
 *   "paid 50 for coffee this morning"
 *   "300 on amazon last monday upi"
 *
 * Returns best-guess fields + a list of fields it found vs missed.
 */

import { format, subDays, parse } from "date-fns";
import { getCategoriesFor } from "./categories";
import { todayISO } from "./format";
import { PaymentMethod, TxType } from "./db";

export interface ParsedExpense {
  amount: number | null;
  currency: string | null;
  categoryId: string;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  confidence: {
    amount: boolean;
    category: boolean;
    date: boolean;
    paymentMethod: boolean;
  };
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

const CURRENCY_MAP: Record<string, string> = {
  $: "USD", usd: "USD", dollar: "USD", dollars: "USD", buck: "USD", bucks: "USD",
  "€": "EUR", eur: "EUR", euro: "EUR", euros: "EUR",
  "£": "GBP", gbp: "GBP", pound: "GBP", pounds: "GBP",
  "₹": "INR", inr: "INR", rupee: "INR", rupees: "INR", rs: "INR",
  "₨": "PKR", pkr: "PKR",
  yen: "JPY", "¥": "JPY", jpy: "JPY",
  aed: "AED", dirham: "AED", dirhams: "AED",
  sar: "SAR", riyal: "SAR", riyals: "SAR",
};

const PAYMENT_KEYWORDS: Record<string, PaymentMethod> = {
  cash: "cash",
  card: "card",
  credit: "card", "credit card": "card",
  debit: "card", "debit card": "card",
  visa: "card", mastercard: "card", amex: "card",
  upi: "upi", paytm: "upi", gpay: "upi", "google pay": "upi", phonepe: "upi",
  bank: "bank", transfer: "bank", "bank transfer": "bank", neft: "bank", imps: "bank", ach: "bank",
  cheque: "bank", check: "bank",
};

// ---------------- Amount extraction ----------------

function wordsToNumber(words: string[]): number | null {
  let total = 0;
  let current = 0;
  let matched = false;
  for (const w of words) {
    const n = NUMBER_WORDS[w.toLowerCase()];
    if (n === undefined) return null;
    matched = true;
    if (n === 100 || n === 1000) {
      current = (current || 1) * n;
    } else {
      current += n;
    }
    if (n >= 1000) {
      total += current;
      current = 0;
    }
  }
  if (!matched) return null;
  return total + current;
}

function extractAmount(text: string): { amount: number | null; currency: string | null; matchSpan: [number, number] | null } {
  const t = text.toLowerCase();

  // 1) Currency symbol attached: $50 or 50$
  const symbolNumber = /([₹$€£₨¥])\s*(\d+(?:[.,]\d+)?)/.exec(t);
  if (symbolNumber) {
    const cur = CURRENCY_MAP[symbolNumber[1]] ?? null;
    return {
      amount: parseFloat(symbolNumber[2].replace(",", ".")),
      currency: cur,
      matchSpan: [symbolNumber.index, symbolNumber.index + symbolNumber[0].length],
    };
  }
  const numberSymbol = /(\d+(?:[.,]\d+)?)\s*([₹$€£₨¥])/.exec(t);
  if (numberSymbol) {
    return {
      amount: parseFloat(numberSymbol[1].replace(",", ".")),
      currency: CURRENCY_MAP[numberSymbol[2]] ?? null,
      matchSpan: [numberSymbol.index, numberSymbol.index + numberSymbol[0].length],
    };
  }

  // 2) Number followed by currency word: "50 dollars", "250 rupees", "100 rs"
  const numberWord =
    /(\d+(?:[.,]\d+)?)\s*(usd|eur|gbp|inr|pkr|aed|sar|jpy|dollars?|euros?|pounds?|rupees?|rs\.?|bucks?|dirhams?|riyals?|yen)\b/.exec(
      t
    );
  if (numberWord) {
    const cur = CURRENCY_MAP[numberWord[2].replace(/\.$/, "")] ?? null;
    return {
      amount: parseFloat(numberWord[1].replace(",", ".")),
      currency: cur,
      matchSpan: [numberWord.index, numberWord.index + numberWord[0].length],
    };
  }

  // 3) Currency word followed by number: "rupees 250", "dollars 15"
  const wordNumber =
    /(usd|eur|gbp|inr|pkr|aed|sar|dollars?|euros?|pounds?|rupees?|rs\.?|dirhams?|riyals?)\s*(\d+(?:[.,]\d+)?)/.exec(
      t
    );
  if (wordNumber) {
    const cur = CURRENCY_MAP[wordNumber[1].replace(/\.$/, "")] ?? null;
    return {
      amount: parseFloat(wordNumber[2].replace(",", ".")),
      currency: cur,
      matchSpan: [wordNumber.index, wordNumber.index + wordNumber[0].length],
    };
  }

  // 4) Plain number near "spent", "paid", "for", "of" etc.
  const plain = /(?:spent|paid|cost|costs|of|for|was|is)\s+(\d+(?:[.,]\d+)?)/.exec(t);
  if (plain) {
    return {
      amount: parseFloat(plain[1].replace(",", ".")),
      currency: null,
      matchSpan: [plain.index + plain[0].indexOf(plain[1]), plain.index + plain[0].length],
    };
  }

  // 5) Standalone number anywhere
  const standalone = /\b(\d+(?:[.,]\d+)?)\b/.exec(t);
  if (standalone) {
    return {
      amount: parseFloat(standalone[1].replace(",", ".")),
      currency: null,
      matchSpan: [standalone.index, standalone.index + standalone[0].length],
    };
  }

  // 6) Words like "fifty dollars"
  const tokens = t.split(/\s+/);
  for (let len = Math.min(tokens.length, 4); len > 0; len--) {
    for (let i = 0; i <= tokens.length - len; i++) {
      const slice = tokens.slice(i, i + len);
      const n = wordsToNumber(slice);
      if (n && n > 0) {
        return { amount: n, currency: null, matchSpan: null };
      }
    }
  }

  return { amount: null, currency: null, matchSpan: null };
}

// ---------------- Category extraction ----------------

function extractCategory(text: string, type: TxType): { categoryId: string; matched: boolean } {
  const t = ` ${text.toLowerCase()} `;
  const categories = getCategoriesFor(type);
  let bestId = categories[categories.length - 1].id;
  let bestScore = 0;

  for (const cat of categories) {
    for (const kw of cat.keywords) {
      const pattern = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(t)) {
        const score = kw.length;
        if (score > bestScore) {
          bestScore = score;
          bestId = cat.id;
        }
      }
    }
  }

  return { categoryId: bestId, matched: bestScore > 0 };
}

// ---------------- Date extraction ----------------

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function extractDate(text: string): { date: string; matched: boolean } {
  const t = text.toLowerCase();

  if (/\btoday\b/.test(t)) return { date: todayISO(), matched: true };
  if (/\byesterday\b/.test(t)) return { date: format(subDays(new Date(), 1), "yyyy-MM-dd"), matched: true };
  if (/\bday before yesterday\b/.test(t))
    return { date: format(subDays(new Date(), 2), "yyyy-MM-dd"), matched: true };
  if (/\bthis morning|this afternoon|this evening|tonight\b/.test(t))
    return { date: todayISO(), matched: true };
  if (/\blast night\b/.test(t)) return { date: format(subDays(new Date(), 1), "yyyy-MM-dd"), matched: true };

  // "last monday", "last friday"
  const lastWeekday = /\blast (sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(t);
  if (lastWeekday) {
    const today = new Date();
    const targetIdx = WEEKDAYS.indexOf(lastWeekday[1]);
    let diff = today.getDay() - targetIdx;
    if (diff <= 0) diff += 7;
    return { date: format(subDays(today, diff), "yyyy-MM-dd"), matched: true };
  }

  // "on monday" etc — assume most recent
  const onWeekday = /\bon (sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(t);
  if (onWeekday) {
    const today = new Date();
    const targetIdx = WEEKDAYS.indexOf(onWeekday[1]);
    let diff = today.getDay() - targetIdx;
    if (diff < 0) diff += 7;
    if (diff === 0) diff = 7;
    return { date: format(subDays(today, diff), "yyyy-MM-dd"), matched: true };
  }

  // "3 days ago"
  const daysAgo = /\b(\d+)\s+days?\s+ago\b/.exec(t);
  if (daysAgo) {
    const n = parseInt(daysAgo[1], 10);
    return { date: format(subDays(new Date(), n), "yyyy-MM-dd"), matched: true };
  }

  // "may 5", "5th may", "12/05/2024"
  const numericDate = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/.exec(t);
  if (numericDate) {
    try {
      const fmt = numericDate[3] ? "M/d/yyyy" : "M/d";
      const parsed = parse(
        numericDate[3]
          ? `${numericDate[1]}/${numericDate[2]}/${numericDate[3].length === 2 ? "20" + numericDate[3] : numericDate[3]}`
          : `${numericDate[1]}/${numericDate[2]}`,
        fmt,
        new Date()
      );
      if (!isNaN(parsed.getTime())) {
        return { date: format(parsed, "yyyy-MM-dd"), matched: true };
      }
    } catch {
      // fall through
    }
  }

  return { date: todayISO(), matched: false };
}

// ---------------- Payment method extraction ----------------

function extractPayment(text: string, fallback: PaymentMethod): { paymentMethod: PaymentMethod; matched: boolean } {
  const t = ` ${text.toLowerCase()} `;
  // Sort longer keys first so "credit card" beats "card" when both appear.
  const keys = Object.keys(PAYMENT_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const pattern = new RegExp(`\\b${k}\\b`, "i");
    if (pattern.test(t)) {
      return { paymentMethod: PAYMENT_KEYWORDS[k], matched: true };
    }
  }
  return { paymentMethod: fallback, matched: false };
}

// ---------------- Description extraction ----------------

const STOPWORDS = new Set([
  "i", "spent", "paid", "bought", "got", "had", "for", "on", "with", "the", "a", "an",
  "and", "of", "to", "in", "at", "by", "using", "via", "today", "yesterday", "morning",
  "evening", "afternoon", "tonight", "night", "last", "this", "ago", "just", "now",
]);

function extractDescription(text: string, removeSpans: ([number, number] | null)[]): string {
  // Strip out things we already extracted
  let cleaned = text;
  for (const span of removeSpans) {
    if (!span) continue;
    cleaned = cleaned.slice(0, span[0]) + " ".repeat(span[1] - span[0]) + cleaned.slice(span[1]);
  }
  // Remove obvious noise
  const tokens = cleaned
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t.toLowerCase()))
    .filter((t) => !/^\d+(\.\d+)?$/.test(t)) // pure numbers
    .filter((t) => !Object.keys(CURRENCY_MAP).includes(t.toLowerCase()))
    .filter((t) => !Object.keys(PAYMENT_KEYWORDS).includes(t.toLowerCase()))
    .filter((t) => !WEEKDAYS.includes(t.toLowerCase()))
    .filter((t) => !["today", "yesterday", "morning", "evening", "afternoon", "tonight"].includes(t.toLowerCase()));

  return tokens.join(" ").trim();
}

// ---------------- Public API ----------------

export function parseExpense(
  text: string,
  defaults: { currency: string; paymentMethod: PaymentMethod; type?: TxType }
): ParsedExpense {
  const txType: TxType = defaults.type ?? "expense";
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      amount: null,
      currency: defaults.currency,
      categoryId: txType === "income" ? "salary" : "other",
      description: "",
      date: todayISO(),
      paymentMethod: defaults.paymentMethod,
      confidence: { amount: false, category: false, date: false, paymentMethod: false },
    };
  }

  const amt = extractAmount(trimmed);
  const cat = extractCategory(trimmed, txType);
  const dateResult = extractDate(trimmed);
  const pay = extractPayment(trimmed, defaults.paymentMethod);
  const description = extractDescription(trimmed, [amt.matchSpan]);

  return {
    amount: amt.amount,
    currency: amt.currency ?? defaults.currency,
    categoryId: cat.categoryId,
    description,
    date: dateResult.date,
    paymentMethod: pay.paymentMethod,
    confidence: {
      amount: amt.amount !== null,
      category: cat.matched,
      date: dateResult.matched,
      paymentMethod: pay.matched,
    },
  };
}
