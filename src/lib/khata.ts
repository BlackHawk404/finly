import { db, KhataEntry, KhataType, uid } from "./db";
import { triggerSync } from "./sync";
import { useAuthStore } from "@/store/useAuthStore";

function now() {
  return new Date().toISOString();
}

function isSignedIn() {
  return Boolean(useAuthStore.getState().user);
}

export interface KhataDraft {
  type: KhataType;
  personName: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
}

export async function saveKhata(draft: KhataDraft): Promise<KhataEntry> {
  const ts = now();
  const entry: KhataEntry = {
    id: uid(),
    status: "pending",
    createdAt: ts,
    updatedAt: ts,
    dirty: 1,
    ...draft,
    personName: draft.personName.trim(),
    description: draft.description.trim(),
  };
  await db.khata.put(entry);
  triggerSync();
  return entry;
}

export async function updateKhata(
  id: string,
  patch: Partial<Omit<KhataEntry, "id" | "createdAt">>
): Promise<void> {
  if (patch.personName !== undefined) patch.personName = patch.personName.trim();
  if (patch.description !== undefined) patch.description = patch.description.trim();
  await db.khata.update(id, { ...patch, updatedAt: now(), dirty: 1 });
  triggerSync();
}

export async function deleteKhata(id: string): Promise<void> {
  if (isSignedIn()) {
    await db.khata.update(id, { deletedAt: now(), updatedAt: now(), dirty: 1 });
    triggerSync();
  } else {
    await db.khata.delete(id);
  }
}

export async function setKhataStatus(id: string, status: "pending" | "settled"): Promise<void> {
  await db.khata.update(id, {
    status,
    settledAt: status === "settled" ? now() : undefined,
    updatedAt: now(),
    dirty: 1,
  });
  triggerSync();
}

export async function settleAllForPerson(personName: string): Promise<void> {
  const target = personName.trim().toLowerCase();
  const entries = await db.khata.toArray();
  const ids = entries
    .filter((e) => e.personName.trim().toLowerCase() === target && e.status === "pending")
    .map((e) => e.id);
  const ts = now();
  await db.khata.bulkUpdate(
    ids.map((id) => ({
      key: id,
      changes: {
        status: "settled" as const,
        settledAt: ts,
        updatedAt: ts,
        dirty: 1 as const,
      },
    }))
  );
  triggerSync();
}

// ---------------- Aggregations ----------------

export interface PersonSummary {
  personName: string;
  netLent: number; // positive = they owe you, negative = you owe them
  totalLent: number;
  totalBorrowed: number;
  pendingCount: number;
  lastActivity: string; // ISO datetime
}

export function summarizeByPerson(entries: KhataEntry[]): PersonSummary[] {
  const groups = new Map<string, KhataEntry[]>();
  for (const e of entries) {
    const key = e.personName.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const result: PersonSummary[] = [];
  for (const [, items] of groups) {
    const pendingItems = items.filter((e) => e.status === "pending");
    const totalLent = pendingItems
      .filter((e) => e.type === "lent")
      .reduce((s, e) => s + e.amount, 0);
    const totalBorrowed = pendingItems
      .filter((e) => e.type === "borrowed")
      .reduce((s, e) => s + e.amount, 0);
    const lastActivity = items
      .map((e) => e.createdAt)
      .sort()
      .reverse()[0];
    result.push({
      personName: items[0].personName.trim(),
      netLent: totalLent - totalBorrowed,
      totalLent,
      totalBorrowed,
      pendingCount: pendingItems.length,
      lastActivity,
    });
  }
  return result.sort((a, b) => Math.abs(b.netLent) - Math.abs(a.netLent));
}

export interface KhataTotals {
  theyOweYou: number;
  youOwe: number;
  net: number;
}

export function totalsForCurrency(entries: KhataEntry[], currency: string): KhataTotals {
  const pending = entries.filter((e) => e.status === "pending" && e.currency === currency);
  const theyOweYou = pending.filter((e) => e.type === "lent").reduce((s, e) => s + e.amount, 0);
  const youOwe = pending.filter((e) => e.type === "borrowed").reduce((s, e) => s + e.amount, 0);
  return { theyOweYou, youOwe, net: theyOweYou - youOwe };
}

// ---------------- Running ledger ----------------

export interface LedgerRow {
  entry: KhataEntry;
  balance: number; // running net (gave - got) up to and including this row
}

// Returns rows oldest -> newest with a running balance.
// `lent` = you gave, `borrowed` = you got.
// Settled (legacy) entries are excluded so balances stay consistent with totals.
export function runningLedger(entries: KhataEntry[]): LedgerRow[] {
  const active = entries
    .filter((e) => e.status !== "settled")
    .slice()
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
    );
  let balance = 0;
  const rows: LedgerRow[] = [];
  for (const entry of active) {
    balance += entry.type === "lent" ? entry.amount : -entry.amount;
    rows.push({ entry, balance });
  }
  return rows;
}
