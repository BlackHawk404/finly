import { db, Budget } from "./db";
import { triggerSync } from "./sync";
import { useAuthStore } from "@/store/useAuthStore";

function now() {
  return new Date().toISOString();
}

function isSignedIn() {
  return Boolean(useAuthStore.getState().user);
}

export async function setBudget(categoryId: string, monthlyLimit: number): Promise<void> {
  if (monthlyLimit <= 0) {
    if (isSignedIn()) {
      await db.budgets.update(categoryId, {
        deletedAt: now(),
        updatedAt: now(),
        dirty: 1,
      });
      triggerSync();
    } else {
      await db.budgets.delete(categoryId);
    }
    return;
  }
  await db.budgets.put({
    id: categoryId,
    monthlyLimit,
    updatedAt: now(),
    dirty: 1,
    deletedAt: null,
  });
  triggerSync();
}

export async function getAllBudgets(): Promise<Budget[]> {
  const rows = await db.budgets.toArray();
  return rows.filter((b) => !b.deletedAt);
}
