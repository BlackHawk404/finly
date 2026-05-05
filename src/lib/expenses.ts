import { db, Expense, uid, PaymentMethod, ExpenseSource, TxType } from "./db";
import { triggerSync } from "./sync";
import { useAuthStore } from "@/store/useAuthStore";

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

function isSignedIn() {
  return Boolean(useAuthStore.getState().user);
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
  if (isSignedIn()) {
    // Soft delete so the deletion can propagate to the cloud on next sync.
    // Receipt is local-only; remove it now since the expense is going away.
    await db.expenses.update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dirty: 1,
    });
    await db.receipts.delete(id);
    triggerSync();
  } else {
    await db.expenses.delete(id);
    await db.receipts.delete(id);
  }
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
