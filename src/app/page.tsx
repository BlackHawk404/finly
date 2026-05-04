"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useSettingsStore } from "@/store/useSettingsStore";
import { formatMoney, currentMonthKey, monthKey, formatDate, todayISO } from "@/lib/format";
import { getCategory } from "@/lib/categories";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/CategoryIcon";
import { Mic, Pencil, ArrowDownCircle, ArrowUpCircle, Wallet, Settings, BookOpen, ChevronRight } from "lucide-react";
import { totalsForCurrency } from "@/lib/khata";

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export default function HomePage() {
  const currency = useSettingsStore((s) => s.currency);
  const userName = useSettingsStore((s) => s.userName);

  const transactions = useLiveQuery(
    async () =>
      (await db.expenses.orderBy("createdAt").reverse().toArray()).filter(
        (e) => !e.deletedAt
      ),
    [],
    []
  );

  const monthTx =
    transactions?.filter((e) => monthKey(e.date) === currentMonthKey()) ?? [];

  const monthIncome = monthTx
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);

  const monthExpense = monthTx
    .filter((e) => e.type !== "income")
    .reduce((s, e) => s + e.amount, 0);

  const balance = monthIncome - monthExpense;

  const today = todayISO();
  const todayExpense = (transactions ?? [])
    .filter((e) => e.date === today && e.type !== "income")
    .reduce((s, e) => s + e.amount, 0);

  const recent = (transactions ?? []).slice(0, 5);

  const khataEntries = useLiveQuery(
    async () => (await db.khata.toArray()).filter((e) => !e.deletedAt),
    [],
    []
  );
  const khataTotals = khataEntries
    ? totalsForCurrency(khataEntries, currency)
    : { theyOweYou: 0, youOwe: 0, net: 0 };
  const hasKhata = khataTotals.theyOweYou > 0 || khataTotals.youOwe > 0;

  return (
    <div className="animate-fade-in px-4 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {timeOfDayGreeting()}
            {userName && userName.trim() ? `, ${userName.trim()}` : ""} 👋
          </h1>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--foreground)] active:scale-90"
        >
          <Settings size={20} />
        </Link>
      </header>

      {/* Balance hero card */}
      <Card className="mb-3 overflow-hidden border-0 bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-lg">
        <div className="p-5">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider opacity-80">
            <Wallet size={12} /> Balance this month
          </div>
          <p className="mt-1 text-4xl font-bold">
            {balance < 0 ? "-" : ""}
            {formatMoney(balance, currency)}
          </p>
          <p className="mt-1 text-xs opacity-80">
            Today spent: <strong>{formatMoney(todayExpense, currency)}</strong>
          </p>
        </div>
      </Card>

      {/* Income / Expense breakdown */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <ArrowUpCircle size={14} className="text-[var(--success)]" /> Income
          </div>
          <p className="text-lg font-bold text-[var(--success)]">
            {formatMoney(monthIncome, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <ArrowDownCircle size={14} className="text-[var(--destructive)]" /> Expenses
          </div>
          <p className="text-lg font-bold text-[var(--destructive)]">
            {formatMoney(monthExpense, currency)}
          </p>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Link
          href="/add?mode=manual&type=expense"
          className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition active:scale-95"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            <Pencil size={18} />
          </div>
          <span className="text-sm font-medium">Type</span>
        </Link>
        <Link
          href="/add?mode=voice&type=expense"
          className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition active:scale-95"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <Mic size={18} />
          </div>
          <span className="text-sm font-medium">Speak</span>
        </Link>
      </div>

      {/* Add Income shortcut */}
      <Link
        href="/add?type=income&mode=manual"
        className="mb-3 flex items-center gap-3 rounded-[var(--radius)] border border-[var(--success)]/30 bg-[var(--success)]/5 p-3 transition active:scale-95"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
          <ArrowUpCircle size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Add Income</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Log salary, freelance, or any inflow
          </p>
        </div>
      </Link>

      {/* Khata snapshot */}
      <Link
        href="/khata"
        className="mb-6 flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3 transition active:scale-[0.99]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
          <BookOpen size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Khata · Lend / Borrow</p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">
            {hasKhata
              ? `Owed ${formatMoney(khataTotals.theyOweYou, currency)} · You owe ${formatMoney(khataTotals.youOwe, currency)}`
              : "Track money you've lent or borrowed"}
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-[var(--muted-foreground)]" />
      </Link>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent</h2>
          <Link
            href="/history"
            className="text-sm text-[var(--primary)] hover:underline"
          >
            See all
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              No transactions yet. Tap the + button to add your first one.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.map((e) => {
              const cat = getCategory(e.categoryId);
              const isIncome = e.type === "income";
              return (
                <Card key={e.id} className="flex items-center gap-3 p-3">
                  <CategoryBadge icon={cat.icon} color={cat.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.description || cat.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatDate(e.date)} · {cat.name}
                    </p>
                  </div>
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: isIncome ? "var(--success)" : undefined,
                    }}
                  >
                    {isIncome ? "+" : "-"}
                    {formatMoney(e.amount, e.currency)}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
