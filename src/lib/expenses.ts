import { db, Expense, uid, PaymentMethod, ExpenseSource, TxType } from "./db";
import { triggerSync } from "./sync";

export interface ExpenseDraft {
  type: TxType;
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  source: ExpenseSource;
  rawTranscript?: string;
}

export async function saveExpense(draft: ExpenseDraft): Promise<Expense> {
  const now = new Date().toISOString();
  const expense: Expense = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    dirty: 1,
    ...draft,
  };
  await db.expenses.put(expense);
  triggerSync();
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  // Soft delete so the deletion can propagate to the cloud on next sync.
  await db.expenses.update(id, {
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dirty: 1,
  });
  triggerSync();
}

export async function updateExpense(
  id: string,
  patch: Partial<Omit<Expense, "id" | "createdAt">>
): Promise<void> {
  await db.expenses.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
    dirty: 1,
  });
  triggerSync();
}
