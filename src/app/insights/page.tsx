"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES, getCategory } from "@/lib/categories";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { Card, CardTitle } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/CategoryIcon";
import { BudgetEditor } from "@/components/BudgetEditor";
import { useSettingsStore } from "@/store/useSettingsStore";
import { formatMoney, currentMonthKey, monthKey } from "@/lib/format";
import { format, startOfMonth, eachDayOfInterval, subDays } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";

export default function InsightsPage() {
  const currency = useSettingsStore((s) => s.currency);

  const transactions = useLiveQuery(
    async () => (await db.expenses.toArray()).filter((e) => !e.deletedAt),
    [],
    []
  );
  const budgets = useLiveQuery(
    async () => (await db.budgets.toArray()).filter((b) => !b.deletedAt),
    [],
    []
  );

  const monthTx = useMemo(
    () => (transactions ?? []).filter((e) => monthKey(e.date) === currentMonthKey()),
    [transactions]
  );

  const monthExpenses = useMemo(() => monthTx.filter((e) => e.type !== "income"), [monthTx]);
  const monthIncomes = useMemo(() => monthTx.filter((e) => e.type === "income"), [monthTx]);

  const expenseTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const incomeTotal = monthIncomes.reduce((s, e) => s + e.amount, 0);
  const balance = incomeTotal - expenseTotal;
  const savingsRate = incomeTotal > 0 ? (balance / incomeTotal) * 100 : 0;
  const dailyAvg = expenseTotal / Math.max(1, new Date().getDate());

  // Expense category breakdown for current month
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of monthExpenses) {
      totals[e.categoryId] = (totals[e.categoryId] ?? 0) + e.amount;
    }
    return Object.entries(totals)
      .map(([categoryId, total]) => ({ categoryId, total }))
      .sort((a, b) => b.total - a.total);
  }, [monthExpenses]);

  // Last 14 days trend (expenses only)
  const trendData = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 13);
    const days = eachDayOfInterval({ start, end });
    return days.map((d) => {
      const iso = format(d, "yyyy-MM-dd");
      const total = (transactions ?? [])
        .filter((e) => e.date === iso && e.type !== "income")
        .reduce((s, e) => s + e.amount, 0);
      return { label: format(d, "d MMM"), total };
    });
  }, [transactions]);

  const monthLabel = format(startOfMonth(new Date()), "MMMM yyyy");

  return (
    <div className="animate-fade-in px-4 pt-6">
      <h1 className="mb-1 text-2xl font-bold">Insights</h1>
      <p className="mb-5 text-sm text-[var(--muted-foreground)]">{monthLabel}</p>

      {/* Income / Expense / Balance */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <ArrowUpCircle size={14} className="text-[var(--success)]" /> Income
          </div>
          <p className="text-lg font-bold text-[var(--success)]">
            {formatMoney(incomeTotal, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <ArrowDownCircle size={14} className="text-[var(--destructive)]" /> Expenses
          </div>
          <p className="text-lg font-bold text-[var(--destructive)]">
            {formatMoney(expenseTotal, currency)}
          </p>
        </Card>
      </div>

      <Card
        className="mb-5 p-4"
        style={{
          borderColor: balance >= 0 ? "color-mix(in srgb, var(--success) 30%, transparent)" : "color-mix(in srgb, var(--destructive) 30%, transparent)",
          background: balance >= 0 ? "color-mix(in srgb, var(--success) 6%, transparent)" : "color-mix(in srgb, var(--destructive) 6%, transparent)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              <Wallet size={14} /> Balance
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: balance >= 0 ? "var(--success)" : "var(--destructive)" }}
            >
              {balance < 0 ? "-" : ""}
              {formatMoney(balance, currency)}
            </p>
          </div>
          {incomeTotal > 0 && (
            <div className="text-right">
              <p className="text-xs text-[var(--muted-foreground)]">Savings rate</p>
              <p
                className="text-lg font-bold"
                style={{ color: savingsRate >= 0 ? "var(--success)" : "var(--destructive)" }}
              >
                {savingsRate.toFixed(0)}%
              </p>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Daily expense avg · {formatMoney(dailyAvg, currency)}
        </p>
      </Card>

      {/* 14 day trend */}
      <Card className="mb-5 p-4">
        <CardTitle className="mb-2">Last 14 Days · Expenses</CardTitle>
        <MonthlyTrendChart data={trendData} currency={currency} />
      </Card>

      {/* Category breakdown */}
      <Card className="mb-5 p-4">
        <CardTitle className="mb-2">By Category</CardTitle>
        <CategoryPieChart data={categoryTotals} currency={currency} />
        {categoryTotals.length > 0 && (
          <div className="mt-3 space-y-2">
            {categoryTotals.slice(0, 5).map(({ categoryId, total }) => {
              const cat = getCategory(categoryId);
              const pct = expenseTotal > 0 ? ((total / expenseTotal) * 100).toFixed(0) : "0";
              return (
                <div key={categoryId} className="flex items-center gap-3">
                  <CategoryBadge icon={cat.icon} color={cat.color} size={32} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{pct}%</p>
                  </div>
                  <p className="text-sm font-semibold">{formatMoney(total, currency)}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Budgets */}
      <section className="mb-4">
        <h2 className="mb-3 text-base font-semibold">Budgets</h2>
        <p className="mb-3 text-xs text-[var(--muted-foreground)]">
          Set monthly limits per category to track your spending pace.
        </p>
        <div className="space-y-2">
          {DEFAULT_CATEGORIES.filter((c) => c.id !== "other").map((cat) => {
            const budget = budgets?.find((b) => b.id === cat.id);
            const spent = categoryTotals.find((c) => c.categoryId === cat.id)?.total ?? 0;
            return (
              <BudgetEditor
                key={cat.id}
                category={cat}
                spent={spent}
                limit={budget?.monthlyLimit ?? 0}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
