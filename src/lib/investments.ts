import {
  db,
  Investment,
  HoldingPrice,
  AssetType,
  InvestmentSide,
  uid,
} from "./db";
import { triggerSync } from "./sync";
import { useAuthStore } from "@/store/useAuthStore";

function now() {
  return new Date().toISOString();
}

function isSignedIn() {
  return Boolean(useAuthStore.getState().user);
}

export function holdingKey(assetType: AssetType, symbol: string): string {
  return `${assetType}:${symbol.trim().toUpperCase()}`;
}

export interface InvestmentDraft {
  assetType: AssetType;
  symbol: string;
  name: string;
  side: InvestmentSide;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  currency: string;
  date: string;
  notes: string;
}

export async function saveInvestment(draft: InvestmentDraft): Promise<Investment> {
  const ts = now();
  const inv: Investment = {
    id: uid(),
    createdAt: ts,
    updatedAt: ts,
    dirty: 1,
    ...draft,
    symbol: draft.symbol.trim().toUpperCase(),
    name: draft.name.trim(),
    notes: draft.notes.trim(),
  };
  await db.investments.put(inv);
  triggerSync();
  return inv;
}

export async function updateInvestment(
  id: string,
  patch: Partial<Omit<Investment, "id" | "createdAt">>
): Promise<void> {
  if (patch.symbol !== undefined) patch.symbol = patch.symbol.trim().toUpperCase();
  if (patch.name !== undefined) patch.name = patch.name.trim();
  if (patch.notes !== undefined) patch.notes = patch.notes.trim();
  await db.investments.update(id, { ...patch, updatedAt: now(), dirty: 1 });
  triggerSync();
}

export async function deleteInvestment(id: string): Promise<void> {
  if (isSignedIn()) {
    await db.investments.update(id, {
      deletedAt: now(),
      updatedAt: now(),
      dirty: 1,
    });
    triggerSync();
  } else {
    await db.investments.delete(id);
  }
}

// Manual price update for a holding (no live feeds).
export async function setHoldingPrice(
  assetType: AssetType,
  symbol: string,
  pricePerUnit: number,
  currency: string
): Promise<void> {
  const key = holdingKey(assetType, symbol);
  const ts = now();
  await db.holdingPrices.put({
    key,
    pricePerUnit,
    currency,
    asOf: ts,
    updatedAt: ts,
    dirty: 1,
  });
  triggerSync();
}

export async function deleteHoldingPrice(
  assetType: AssetType,
  symbol: string
): Promise<void> {
  const key = holdingKey(assetType, symbol);
  if (isSignedIn()) {
    await db.holdingPrices.update(key, {
      deletedAt: now(),
      updatedAt: now(),
      dirty: 1,
    });
    triggerSync();
  } else {
    await db.holdingPrices.delete(key);
  }
}

// ------------- Aggregations -------------

export interface Holding {
  key: string;
  assetType: AssetType;
  symbol: string;
  name: string;
  currency: string;
  quantity: number;       // net shares/units (buy - sell)
  invested: number;       // sum(buy qty * price + fees) - sum(sell proceeds + fees) — really cost basis of remaining shares (avg-cost method)
  costBasis: number;      // alias for invested
  avgPrice: number;       // invested / quantity (0 if quantity == 0)
  realizedPnL: number;    // from sells
  currentPrice: number | null;
  currentValue: number;   // quantity * currentPrice (0 if no price)
  unrealizedPnL: number;  // currentValue - invested (when currentPrice known)
  totalPnL: number;       // realizedPnL + unrealizedPnL
  lots: Investment[];     // sorted oldest -> newest
  lastActivity: string;   // most recent lot createdAt
}

// Average-cost method:
//   on buy: invested += qty * price + fees
//           quantity += qty
//   on sell: proportional cost reduction, realized PnL banked
export function aggregateHolding(
  lots: Investment[],
  price?: HoldingPrice | null
): Holding | null {
  if (lots.length === 0) return null;
  const sorted = lots
    .slice()
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
    );

  let quantity = 0;
  let costBasis = 0;
  let realizedPnL = 0;

  for (const lot of sorted) {
    if (lot.side === "buy") {
      costBasis += lot.quantity * lot.pricePerUnit + (lot.fees || 0);
      quantity += lot.quantity;
    } else {
      // sell
      const sellQty = Math.min(lot.quantity, quantity);
      const avgPriceNow = quantity > 0 ? costBasis / quantity : 0;
      const removedCost = avgPriceNow * sellQty;
      const proceeds = sellQty * lot.pricePerUnit - (lot.fees || 0);
      realizedPnL += proceeds - removedCost;
      costBasis -= removedCost;
      quantity -= sellQty;
      if (quantity < 0.000001) {
        quantity = 0;
        costBasis = 0;
      }
    }
  }

  const first = sorted[0];
  const currentPrice =
    price && !price.deletedAt && price.pricePerUnit > 0
      ? price.pricePerUnit
      : null;
  const currentValue = currentPrice !== null ? quantity * currentPrice : 0;
  const unrealizedPnL = currentPrice !== null ? currentValue - costBasis : 0;

  return {
    key: holdingKey(first.assetType, first.symbol),
    assetType: first.assetType,
    symbol: first.symbol,
    name: first.name || first.symbol,
    currency: first.currency,
    quantity,
    invested: costBasis,
    costBasis,
    avgPrice: quantity > 0 ? costBasis / quantity : 0,
    realizedPnL,
    currentPrice,
    currentValue,
    unrealizedPnL,
    totalPnL: realizedPnL + unrealizedPnL,
    lots: sorted,
    lastActivity:
      sorted.map((l) => l.createdAt).sort().reverse()[0] ?? first.createdAt,
  };
}

export function groupHoldings(
  lots: Investment[],
  prices: HoldingPrice[]
): Holding[] {
  const groups = new Map<string, Investment[]>();
  for (const lot of lots) {
    if (lot.deletedAt) continue;
    const k = holdingKey(lot.assetType, lot.symbol);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(lot);
  }

  const priceMap = new Map<string, HoldingPrice>();
  for (const p of prices) {
    if (!p.deletedAt) priceMap.set(p.key, p);
  }

  const holdings: Holding[] = [];
  for (const [key, items] of groups) {
    const h = aggregateHolding(items, priceMap.get(key) ?? null);
    if (h) holdings.push(h);
  }

  // Sort: open positions first (qty > 0), by current value desc, then by last activity desc.
  return holdings.sort((a, b) => {
    if (a.quantity > 0 && b.quantity === 0) return -1;
    if (b.quantity > 0 && a.quantity === 0) return 1;
    if (a.currentValue !== b.currentValue) return b.currentValue - a.currentValue;
    return b.lastActivity.localeCompare(a.lastActivity);
  });
}

export interface PortfolioTotals {
  invested: number;
  currentValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  // returns by currency since holdings can mix; the totals above sum within
  // the dominant currency only — the breakdown lets the UI label clearly.
  byCurrency: Record<string, { invested: number; currentValue: number }>;
}

export function portfolioTotals(holdings: Holding[]): PortfolioTotals {
  const byCurrency: Record<string, { invested: number; currentValue: number }> =
    {};
  for (const h of holdings) {
    const slot = (byCurrency[h.currency] = byCurrency[h.currency] ?? {
      invested: 0,
      currentValue: 0,
    });
    slot.invested += h.invested;
    slot.currentValue += h.currentValue;
  }
  // Pick the dominant currency (most invested) for the headline number.
  let invested = 0;
  let currentValue = 0;
  let realizedPnL = 0;
  let unrealizedPnL = 0;
  let dominantCurrency = "";
  let dominantTotal = -Infinity;
  for (const [currency, slot] of Object.entries(byCurrency)) {
    if (slot.invested > dominantTotal) {
      dominantTotal = slot.invested;
      dominantCurrency = currency;
    }
  }
  for (const h of holdings) {
    if (h.currency !== dominantCurrency) continue;
    invested += h.invested;
    currentValue += h.currentValue;
    realizedPnL += h.realizedPnL;
    unrealizedPnL += h.unrealizedPnL;
  }
  return {
    invested,
    currentValue,
    unrealizedPnL,
    realizedPnL,
    totalPnL: realizedPnL + unrealizedPnL,
    byCurrency,
  };
}

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  stock: "Stock",
  crypto: "Crypto",
  mutual_fund: "Mutual Fund",
  gold: "Gold",
  other: "Other",
};
