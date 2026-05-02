import Dexie, { Table } from "dexie";

export type PaymentMethod = "cash" | "card" | "upi" | "bank" | "other";
export type ExpenseSource = "manual" | "voice";
export type TxType = "expense" | "income";

export interface Expense {
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

export interface Budget {
  id: string; // categoryId
  monthlyLimit: number;
}

export interface Setting {
  key: string;
  value: string;
}

export type KhataType = "lent" | "borrowed";

export interface KhataEntry {
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

export class FinanceDB extends Dexie {
  expenses!: Table<Expense, string>;
  budgets!: Table<Budget, string>;
  settings!: Table<Setting, string>;
  khata!: Table<KhataEntry, string>;

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
  }
}

export const db = new FinanceDB();

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}
