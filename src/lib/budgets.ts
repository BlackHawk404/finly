import { db, Budget } from "./db";

export async function setBudget(categoryId: string, monthlyLimit: number): Promise<void> {
  if (monthlyLimit <= 0) {
    await db.budgets.delete(categoryId);
    return;
  }
  await db.budgets.put({ id: categoryId, monthlyLimit });
}

export async function getAllBudgets(): Promise<Budget[]> {
  return db.budgets.toArray();
}
