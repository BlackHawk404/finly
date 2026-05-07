import Dexie, { Table } from "dexie";

export type PaymentMethod = "cash" | "card" | "upi" | "bank" | "other";
export type ExpenseSource = "manual" | "voice";
export type TxType = "expense" | "income";

// Sync metadata attached to every syncable row.
// updatedAt = ISO timestamp; bumps on every local mutation.
// deletedAt = ISO timestamp on soft-delete; row is hidden but kept until it
// has been pushed to the cloud, then purged.
export interface SyncMeta {
  updatedAt: string;
  deletedAt?: string | null;
  dirty?: 1; // index hint: 1 if pending sync, undefined otherwise
}

export interface Expense extends SyncMeta {
  id: string;
  type: TxType;
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
  date: string; // ISO date (YYYY-MM-DD)
  paymentMethod: PaymentMethod;
  source: ExpenseSource;
  rawTranscript?: string;
  createdAt: string; // ISO datetime
}

export interface Budget extends SyncMeta {
  id: string; // categoryId
  monthlyLimit: number;
}

export interface Setting {
  key: string;
  value: string;
}

export type KhataType = "lent" | "borrowed";

export interface KhataEntry extends SyncMeta {
  id: string;
  type: KhataType; // "lent" = they owe you, "borrowed" = you owe them
  personName: string;
  amount: number;
  currency: string;
  date: string; // ISO date
  description: string;
  status: "pending" | "settled";
  settledAt?: string;
  createdAt: string;
}

// Sync state: tracks last-pulled timestamp per remote table.
export interface SyncState {
  key: string; // table name (expenses, budgets, khata, user_settings)
  lastPulledAt: string;
}

// Receipt image attached to an expense. Local-only for now (no cloud sync).
export interface Receipt {
  expenseId: string; // PK & FK to Expense.id
  blob: Blob;
  mimeType: string;
  rawText?: string; // OCR raw text
  createdAt: string;
}

export type AssetType = "stock" | "crypto" | "mutual_fund" | "gold" | "other";
export type InvestmentSide = "buy" | "sell";

// One row per buy or sell transaction (a "lot"). Holdings are computed by
// grouping lots on (assetType, symbol).
export interface Investment extends SyncMeta {
  id: string;
  assetType: AssetType;
  symbol: string;       // ticker / identifier (uppercase, trimmed)
  name: string;         // display name (e.g. "Apple Inc.")
  side: InvestmentSide;
  quantity: number;     // shares/units (supports fractional)
  pricePerUnit: number;
  fees: number;         // commission + taxes for this lot
  currency: string;
  date: string;         // ISO date (YYYY-MM-DD)
  notes: string;
  createdAt: string;
}

// Per-symbol current market price, manually entered. Cloud-synced.
// Key format: `${assetType}:${symbol}`.
export interface HoldingPrice extends SyncMeta {
  key: string;
  pricePerUnit: number;
  currency: string;
  asOf: string;       // ISO datetime of when the user updated it
}

export class FinanceDB extends Dexie {
  expenses!: Table<Expense, string>;
  budgets!: Table<Budget, string>;
  settings!: Table<Setting, string>;
  khata!: Table<KhataEntry, string>;
  syncState!: Table<SyncState, string>;
  receipts!: Table<Receipt, string>;
  investments!: Table<Investment, string>;
  holdingPrices!: Table<HoldingPrice, string>;

  constructor() {
    super("finance-app");
    this.version(1).stores({
      expenses: "id, date, categoryId, paymentMethod, source, createdAt",
      budgets: "id",
      settings: "key",
    });
    // v2: introduce `type` field (expense | income). Backfill all old rows as expense.
    this.version(2)
      .stores({
        expenses: "id, type, date, categoryId, paymentMethod, source, createdAt",
        budgets: "id",
        settings: "key",
      })
      .upgrade(async (tx) => {
        await tx
          .table("expenses")
          .toCollection()
          .modify((e: Expense) => {
            if (!e.type) e.type = "expense";
          });
      });
    // v3: khata (lend/borrow ledger) — separate from expenses.
    this.version(3).stores({
      expenses: "id, type, date, categoryId, paymentMethod, source, createdAt",
      budgets: "id",
      settings: "key",
      khata: "id, type, personName, status, date, createdAt",
    });
    // v4: cloud sync. Add updatedAt + dirty flag indexes; backfill existing rows.
    this.version(4)
      .stores({
        expenses:
          "id, type, date, categoryId, paymentMethod, source, createdAt, updatedAt, dirty",
        budgets: "id, updatedAt, dirty",
        settings: "key",
        khata:
          "id, type, personName, status, date, createdAt, updatedAt, dirty",
        syncState: "key",
      })
      .upgrade(async (tx) => {
        const now = new Date().toISOString();
        const stamp = (row: { updatedAt?: string; dirty?: 1 }) => {
          if (!row.updatedAt) row.updatedAt = now;
          row.dirty = 1;
        };
        await tx.table("expenses").toCollection().modify(stamp);
        await tx.table("budgets").toCollection().modify(stamp);
        await tx.table("khata").toCollection().modify(stamp);
      });
    // v5: receipts table for OCR'd images attached to expenses.
    this.version(5).stores({
      expenses:
        "id, type, date, categoryId, paymentMethod, source, createdAt, updatedAt, dirty",
      budgets: "id, updatedAt, dirty",
      settings: "key",
      khata: "id, type, personName, status, date, createdAt, updatedAt, dirty",
      syncState: "key",
      receipts: "expenseId",
    });
    // v6: investments (lots) + per-symbol current price.
    this.version(6).stores({
      expenses:
        "id, type, date, categoryId, paymentMethod, source, createdAt, updatedAt, dirty",
      budgets: "id, updatedAt, dirty",
      settings: "key",
      khata: "id, type, personName, status, date, createdAt, updatedAt, dirty",
      syncState: "key",
      receipts: "expenseId",
      investments:
        "id, assetType, symbol, side, date, createdAt, updatedAt, dirty",
      holdingPrices: "key, updatedAt, dirty",
    });
  }
}

export const db = new FinanceDB();

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}
