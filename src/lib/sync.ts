"use client";

import { db, Expense, Budget, KhataEntry } from "./db";
import { getSupabase } from "./supabase";
import { useAuthStore } from "@/store/useAuthStore";

// ---------------- public API ----------------

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;

export function triggerSync(delay = 800) {
  if (typeof window === "undefined") return;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    void runSync().catch((err) => console.warn("[sync] failed", err));
  }, delay);
}

let lastUserId: string | null = null;

// Subscribes to auth state; on sign-in, runs full sync. Returns an unsubscribe.
export function startSyncWatcher(): () => void {
  if (typeof window === "undefined") return () => {};
  const unsub = useAuthStore.subscribe((state) => {
    const uid = state.user?.id ?? null;
    if (uid === lastUserId) return;
    lastUserId = uid;
    if (uid) {
      void runSync({ initial: true }).catch((err) =>
        console.warn("[sync] initial failed", err)
      );
    }
  });
  // Trigger once if already signed in at mount.
  const current = useAuthStore.getState().user?.id ?? null;
  if (current && current !== lastUserId) {
    lastUserId = current;
    void runSync({ initial: true }).catch((err) =>
      console.warn("[sync] mount failed", err)
    );
  }
  return unsub;
}

export async function runSync(opts: { initial?: boolean } = {}): Promise<void> {
  if (running) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const user = useAuthStore.getState().user;
  if (!user) return;

  running = true;
  try {
    if (opts.initial) {
      await pullAll(user.id);
    }
    await pushAll(user.id);
    await pullAll(user.id);
    await purgeTombstones();
  } finally {
    running = false;
  }
}

// ---------------- push (local → cloud) ----------------

async function pushAll(userId: string) {
  await pushExpenses(userId);
  await pushBudgets(userId);
  await pushKhata(userId);
  await pushSettings(userId);
}

async function pushExpenses(userId: string) {
  const supabase = getSupabase()!;
  const dirty = await db.expenses.where("dirty").equals(1).toArray();
  if (dirty.length === 0) return;
  const rows = dirty.map((e) => expenseToCloud(e, userId));
  const { error } = await supabase.from("expenses").upsert(rows);
  if (error) throw error;
  await db.expenses.bulkUpdate(
    dirty.map((e) => ({ key: e.id, changes: { dirty: undefined } }))
  );
}

async function pushBudgets(userId: string) {
  const supabase = getSupabase()!;
  const dirty = await db.budgets.where("dirty").equals(1).toArray();
  if (dirty.length === 0) return;
  const rows = dirty.map((b) => budgetToCloud(b, userId));
  const { error } = await supabase.from("budgets").upsert(rows, {
    onConflict: "user_id,category_id",
  });
  if (error) throw error;
  await db.budgets.bulkUpdate(
    dirty.map((b) => ({ key: b.id, changes: { dirty: undefined } }))
  );
}

async function pushKhata(userId: string) {
  const supabase = getSupabase()!;
  const dirty = await db.khata.where("dirty").equals(1).toArray();
  if (dirty.length === 0) return;
  const rows = dirty.map((k) => khataToCloud(k, userId));
  const { error } = await supabase.from("khata").upsert(rows);
  if (error) throw error;
  await db.khata.bulkUpdate(
    dirty.map((k) => ({ key: k.id, changes: { dirty: undefined } }))
  );
}

async function pushSettings(userId: string) {
  const supabase = getSupabase()!;
  const all = await db.settings.toArray();
  const map = Object.fromEntries(all.map((s) => [s.key, s.value]));
  if (all.length === 0) return;
  const row = {
    user_id: userId,
    currency: map.currency ?? "USD",
    default_payment_method: map.defaultPaymentMethod ?? "cash",
    language: map.language ?? "en-US",
    user_name: map.userName ?? "",
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("user_settings")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}

// ---------------- pull (cloud → local) ----------------

async function pullAll(userId: string) {
  await pullExpenses(userId);
  await pullBudgets(userId);
  await pullKhata(userId);
  await pullSettings(userId);
}

async function pullExpenses(userId: string) {
  const supabase = getSupabase()!;
  const since = await getLastPulled("expenses");
  let q = supabase.from("expenses").select("*").eq("user_id", userId);
  if (since) q = q.gt("updated_at", since);
  const { data, error } = await q;
  if (error) throw error;
  if (!data) return;
  for (const r of data) {
    if (r.deleted_at) {
      await db.expenses.delete(r.id);
    } else {
      const local = await db.expenses.get(r.id);
      if (!local || (local.updatedAt ?? "") <= r.updated_at) {
        await db.expenses.put(cloudToExpense(r));
      }
    }
  }
  await setLastPulled("expenses");
}

async function pullBudgets(userId: string) {
  const supabase = getSupabase()!;
  const since = await getLastPulled("budgets");
  let q = supabase.from("budgets").select("*").eq("user_id", userId);
  if (since) q = q.gt("updated_at", since);
  const { data, error } = await q;
  if (error) throw error;
  if (!data) return;
  for (const r of data) {
    if (r.deleted_at) {
      await db.budgets.delete(r.category_id);
    } else {
      const local = await db.budgets.get(r.category_id);
      if (!local || (local.updatedAt ?? "") <= r.updated_at) {
        await db.budgets.put(cloudToBudget(r));
      }
    }
  }
  await setLastPulled("budgets");
}

async function pullKhata(userId: string) {
  const supabase = getSupabase()!;
  const since = await getLastPulled("khata");
  let q = supabase.from("khata").select("*").eq("user_id", userId);
  if (since) q = q.gt("updated_at", since);
  const { data, error } = await q;
  if (error) throw error;
  if (!data) return;
  for (const r of data) {
    if (r.deleted_at) {
      await db.khata.delete(r.id);
    } else {
      const local = await db.khata.get(r.id);
      if (!local || (local.updatedAt ?? "") <= r.updated_at) {
        await db.khata.put(cloudToKhata(r));
      }
    }
  }
  await setLastPulled("khata");
}

async function pullSettings(userId: string) {
  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;
  // Last-write-wins: only overwrite local if cloud is newer.
  const localUpdatedRow = await db.settings.get("__updatedAt");
  const localTs = localUpdatedRow?.value ?? "";
  if (localTs && localTs > data.updated_at) return;
  await db.settings.bulkPut([
    { key: "currency", value: data.currency },
    { key: "defaultPaymentMethod", value: data.default_payment_method },
    { key: "language", value: data.language },
    { key: "userName", value: data.user_name },
    { key: "__updatedAt", value: data.updated_at },
  ]);
}

async function purgeTombstones() {
  const expensesDeleted = await db.expenses
    .filter((e) => Boolean(e.deletedAt) && !e.dirty)
    .toArray();
  const expenseIds = expensesDeleted.map((e) => e.id);
  await db.expenses.bulkDelete(expenseIds);
  // Receipts are local-only, but they live keyed to expenseId — clean up alongside.
  await db.receipts.bulkDelete(expenseIds);

  const budgetsDeleted = await db.budgets
    .filter((b) => Boolean(b.deletedAt) && !b.dirty)
    .toArray();
  await db.budgets.bulkDelete(budgetsDeleted.map((b) => b.id));

  const khataDeleted = await db.khata
    .filter((k) => Boolean(k.deletedAt) && !k.dirty)
    .toArray();
  await db.khata.bulkDelete(khataDeleted.map((k) => k.id));
}

// ---------------- helpers: row mapping ----------------

interface CloudExpense {
  id: string;
  user_id: string;
  type: "expense" | "income";
  amount: number;
  currency: string;
  category_id: string;
  description: string;
  date: string;
  payment_method: "cash" | "card" | "upi" | "bank" | "other";
  source: "manual" | "voice";
  raw_transcript: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function expenseToCloud(e: Expense, userId: string): CloudExpense {
  return {
    id: e.id,
    user_id: userId,
    type: e.type,
    amount: e.amount,
    currency: e.currency,
    category_id: e.categoryId,
    description: e.description,
    date: e.date,
    payment_method: e.paymentMethod,
    source: e.source,
    raw_transcript: e.rawTranscript ?? null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    deleted_at: e.deletedAt ?? null,
  };
}

function cloudToExpense(r: CloudExpense): Expense {
  return {
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    currency: r.currency,
    categoryId: r.category_id,
    description: r.description,
    date: r.date,
    paymentMethod: r.payment_method,
    source: r.source,
    rawTranscript: r.raw_transcript ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? null,
  };
}

interface CloudBudget {
  user_id: string;
  category_id: string;
  monthly_limit: number;
  updated_at: string;
  deleted_at: string | null;
}

function budgetToCloud(b: Budget, userId: string): CloudBudget {
  return {
    user_id: userId,
    category_id: b.id,
    monthly_limit: b.monthlyLimit,
    updated_at: b.updatedAt,
    deleted_at: b.deletedAt ?? null,
  };
}

function cloudToBudget(r: CloudBudget): Budget {
  return {
    id: r.category_id,
    monthlyLimit: Number(r.monthly_limit),
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? null,
  };
}

interface CloudKhata {
  id: string;
  user_id: string;
  type: "lent" | "borrowed";
  person_name: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  status: "pending" | "settled";
  settled_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function khataToCloud(k: KhataEntry, userId: string): CloudKhata {
  return {
    id: k.id,
    user_id: userId,
    type: k.type,
    person_name: k.personName,
    amount: k.amount,
    currency: k.currency,
    date: k.date,
    description: k.description,
    status: k.status,
    settled_at: k.settledAt ?? null,
    created_at: k.createdAt,
    updated_at: k.updatedAt,
    deleted_at: k.deletedAt ?? null,
  };
}

function cloudToKhata(r: CloudKhata): KhataEntry {
  return {
    id: r.id,
    type: r.type,
    personName: r.person_name,
    amount: Number(r.amount),
    currency: r.currency,
    date: r.date,
    description: r.description,
    status: r.status,
    settledAt: r.settled_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? null,
  };
}

// ---------------- helpers: lastPulledAt ----------------

async function getLastPulled(table: string): Promise<string | null> {
  const row = await db.syncState.get(table);
  return row?.lastPulledAt ?? null;
}

async function setLastPulled(table: string): Promise<void> {
  await db.syncState.put({ key: table, lastPulledAt: new Date().toISOString() });
}
