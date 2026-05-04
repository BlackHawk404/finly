"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useSettingsStore } from "@/store/useSettingsStore";
import { formatMoney, currentMonthKey, monthKey, formatDate, todayISO } from "@/lib/format";
import { getCategory } from "@/lib/categories";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/CategoryIcon";
import { Mic, Pencil, ArrowUpCircle, Wallet, Settings, BookOpen, ChevronRight } from "lucide-react";
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
      <Card className="brand-gradient relative mb-4 overflow-hidden border-0 text-white shadow-xl shadow-[var(--brand-deep)]/15">
        {/* Decorative orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-black/10 blur-3xl"
        />
        <div className="relative p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
              <Wallet size={12} /> Balance · this month
            </div>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/90 backdrop-blur">
              {new Date().toLocaleDateString(undefined, { month: "short" })}
            </span>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums">
            {balance < 0 ? "-" : ""}
            {formatMoney(balance, currency)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase tracking-wider text-white/70">
                Income
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatMoney(monthIncome, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase tracking-wider text-white/70">
                Spent
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatMoney(monthExpense, currency)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/80">
            Today: <strong className="font-semibold">{formatMoney(todayExpense, currency)}</strong>
          </p>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Link
          href="/add?mode=manual&type=expense"
          className="card-elev group flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40 active:scale-[0.98]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)] transition group-hover:scale-110">
            <Pencil size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">Type</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">Quick entry</p>
          </div>
        </Link>
        <Link
          href="/add?mode=voice&type=expense"
          className="card-elev group flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition hover:-translate-y-0.5 hover:border-red-500/40 active:scale-[0.98]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500 transition group-hover:scale-110">
            <Mic size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">Speak</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">Voice entry</p>
          </div>
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
        className="card-elev mb-6 flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3 transition hover:border-[var(--primary)]/40 active:scale-[0.99]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <BookOpen size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Khata · Lend / Borrow</p>
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
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
              <Wallet size={20} />
            </div>
            <p className="text-sm font-semibold">No transactions yet</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Tap the <span className="font-medium text-[var(--primary)]">+</span> button below to add your first one.
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
