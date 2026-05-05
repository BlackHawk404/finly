// Receipt OCR text → structured ExpenseDraft fields.
// Heuristic, not perfect — the user always reviews in the form.

import { parse, isValid, format } from "date-fns";
import { getCategoriesFor } from "./categories";
import { todayISO } from "./format";
import { PaymentMethod, TxType } from "./db";

export interface ParsedReceipt {
  amount: number | null;
  currency: string | null;
  categoryId: string;
  description: string; // best guess at merchant / first non-junk line
  date: string; // ISO date; falls back to today
  paymentMethod: PaymentMethod;
  confidence: {
    amount: boolean;
    date: boolean;
    merchant: boolean;
  };
}

interface ParseOptions {
  currency: string;
  paymentMethod: PaymentMethod;
  type: TxType;
}

// Words that strongly indicate the line is the total (vs. a subtotal/item line)
const TOTAL_HINTS = [
  "grand total",
  "total amount",
  "total due",
  "amount due",
  "balance due",
  "net total",
  "total",
  "amount",
  "sum",
  "to pay",
  "payable",
];

// Lines we should ignore when guessing the merchant name
const NOISE_LINES =
  /^(?:receipt|invoice|tax\s*invoice|bill|cash\s*memo|gst\s*invoice|order\s*#|order\s*number|date|time|table|server|cashier|customer|copy|thank\s*you|please|web|www\.|http|tel|phone|fax|cust\s*id)/i;

const CURRENCY_TOKENS: { regex: RegExp; code: string }[] = [
  { regex: /\$/, code: "USD" },
  { regex: /€/, code: "EUR" },
  { regex: /£/, code: "GBP" },
  { regex: /₹|rs\.?\b|inr\b|rupees?/i, code: "INR" },
  { regex: /pkr\b|rupees?/i, code: "PKR" },
  { regex: /aed\b|د\.إ/i, code: "AED" },
  { regex: /sar\b|﷼/i, code: "SAR" },
  { regex: /¥|jpy\b|yen\b/i, code: "JPY" },
];

const PAYMENT_HINTS: { regex: RegExp; method: PaymentMethod }[] = [
  { regex: /\b(visa|master(card)?|amex|debit|credit|card|chip|nfc|contactless)\b/i, method: "card" },
  { regex: /\bcash\b/i, method: "cash" },
  { regex: /\bupi\b|\bgpay\b|\bphonepe\b|\bpaytm\b/i, method: "upi" },
  { regex: /\b(bank\s*transfer|neft|imps|rtgs|wire)\b/i, method: "bank" },
];

export function parseReceipt(rawText: string, opts: ParseOptions): ParsedReceipt {
  const text = (rawText ?? "").replace(/\r\n?/g, "\n");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const lower = text.toLowerCase();

  // ---- amount ----
  const amount = guessTotal(lines);

  // ---- currency ----
  let currency: string | null = null;
  for (const { regex, code } of CURRENCY_TOKENS) {
    if (regex.test(text)) {
      currency = code;
      break;
    }
  }

  // ---- date ----
  const dateGuess = guessDate(text);

  // ---- merchant / description ----
  const merchant = guessMerchant(lines);

  // ---- payment method ----
  let paymentMethod = opts.paymentMethod;
  for (const { regex, method } of PAYMENT_HINTS) {
    if (regex.test(lower)) {
      paymentMethod = method;
      break;
    }
  }

  // ---- category ----
  const categoryId = guessCategoryId(merchant + " " + lower, opts.type);

  return {
    amount,
    currency: currency ?? opts.currency,
    categoryId,
    description: merchant ?? "",
    date: dateGuess ?? todayISO(),
    paymentMethod,
    confidence: {
      amount: amount !== null,
      date: Boolean(dateGuess),
      merchant: Boolean(merchant),
    },
  };
}

// --------------- helpers ---------------

function guessTotal(lines: string[]): number | null {
  // Strategy 1: a line containing a "total" hint with a number on the same or next line.
  let candidate: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const hint = TOTAL_HINTS.find((h) => lower.includes(h));
    if (!hint) continue;

    // Same-line number
    const sameLine = extractMoneyAmounts(line);
    // Next-line number (some receipts put total label and value on separate lines)
    const next = lines[i + 1] ? extractMoneyAmounts(lines[i + 1]) : [];

    const all = [...sameLine, ...next];
    if (all.length > 0) {
      const max = Math.max(...all);
      // Prefer "grand total" / "amount due" matches over plain "total"
      const strongHint = ["grand total", "total due", "amount due", "balance due", "to pay", "payable"].includes(hint);
      if (strongHint) return max;
      // Hold the candidate but keep looking for a stronger hint
      if (candidate === null || max > candidate) candidate = max;
    }
  }
  if (candidate !== null) return candidate;

  // Strategy 2: fallback — return the largest currency-looking number anywhere.
  // Common case for thermal receipts where "TOTAL" line is mis-OCR'd.
  const all: number[] = [];
  for (const line of lines) all.push(...extractMoneyAmounts(line));
  if (all.length === 0) return null;
  // Filter out absurdly small values that are likely tax / quantities only when many.
  return Math.max(...all);
}

// Pull every number that looks like a currency amount from a line.
function extractMoneyAmounts(line: string): number[] {
  // Allow optional currency symbol before the number; reject phone numbers / dates.
  const re = /(?:[$€£¥₹]|\brs\.?|\binr|\bpkr|\baed|\bsar|\busd|\beur|\bgbp)?\s*([0-9]{1,3}(?:[ ,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2}))/gi;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const n = normalizeNumber(m[1]);
    if (Number.isFinite(n) && n > 0 && n < 10_000_000) out.push(n);
  }
  return out;
}

function normalizeNumber(raw: string): number {
  // Handle "1,234.56" and "1.234,56" and "1 234,56".
  const cleaned = raw.replace(/\s/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma === -1 && lastDot === -1) return Number(cleaned);
  if (lastComma > lastDot) {
    // comma is decimal sep
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }
  // dot is decimal sep
  return Number(cleaned.replace(/,/g, ""));
}

function guessDate(text: string): string | null {
  const formats = [
    "yyyy-MM-dd",
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "dd.MM.yyyy",
    "MM/dd/yyyy",
    "MM-dd-yyyy",
    "dd/MM/yy",
    "MM/dd/yy",
    "d MMM yyyy",
    "dd MMM yyyy",
    "MMM d, yyyy",
    "MMMM d, yyyy",
  ];
  // Capture date-like substrings from the OCR text.
  const candidates =
    text.match(
      /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b|\b\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{2,4}\b|\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}\b/g
    ) ?? [];

  for (const c of candidates) {
    for (const f of formats) {
      const d = parse(c, f, new Date());
      if (isValid(d) && d.getFullYear() > 2000 && d.getFullYear() < 2100) {
        return format(d, "yyyy-MM-dd");
      }
    }
  }
  return null;
}

function guessMerchant(lines: string[]): string | null {
  // Look at the first 5 lines; pick the first non-noisy line that looks like a name.
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (NOISE_LINES.test(line)) continue;
    if (line.length < 2) continue;
    if (/^[\d\W]+$/.test(line)) continue; // digits/punctuation only
    // Trim trailing junk and limit length.
    return line.replace(/\s{2,}/g, " ").slice(0, 60);
  }
  return null;
}

function guessCategoryId(haystack: string, type: TxType): string {
  const cats = getCategoriesFor(type);
  const hay = haystack.toLowerCase();
  for (const cat of cats) {
    for (const kw of cat.keywords) {
      if (hay.includes(kw.toLowerCase())) return cat.id;
    }
  }
  return type === "income" ? "salary" : "other";
}
