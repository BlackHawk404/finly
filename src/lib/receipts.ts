import { db, Receipt } from "./db";

export async function saveReceipt(
  expenseId: string,
  blob: Blob,
  rawText?: string
): Promise<void> {
  const receipt: Receipt = {
    expenseId,
    blob,
    mimeType: blob.type || "image/jpeg",
    rawText,
    createdAt: new Date().toISOString(),
  };
  await db.receipts.put(receipt);
}

export async function getReceipt(expenseId: string): Promise<Receipt | undefined> {
  return db.receipts.get(expenseId);
}

export async function deleteReceipt(expenseId: string): Promise<void> {
  await db.receipts.delete(expenseId);
}

// Returns Set of expense ids that have a receipt — for list views.
export async function getReceiptIds(): Promise<Set<string>> {
  const all = await db.receipts.toArray();
  return new Set(all.map((r) => r.expenseId));
}
