import { db, Expense, uid, PaymentMethod, ExpenseSource, TxType } from "./db";

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
  const expense: Expense = {
    id: uid(),
    createdAt: new Date().toISOString(),
    ...draft,
  };
  await db.expenses.put(expense);
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id);
}

export async function updateExpense(
  id: string,
  patch: Partial<Omit<Expense, "id" | "createdAt">>
): Promise<void> {
  await db.expenses.update(id, patch);
}
