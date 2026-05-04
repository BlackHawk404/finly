"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Expense, TxType } from "@/lib/db";
import { DEFAULT_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { ExpenseListItem } from "@/components/ExpenseListItem";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/format";
import { Search, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type Range = "all" | "week" | "month";
type TypeFilter = "all" | TxType;

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryId, setCategoryId] = useState<string | "all">("all");

  const expenses = useLiveQuery(
    async () =>
      (await db.expenses.orderBy("date").reverse().toArray()).filter(
        (e) => !e.deletedAt
      ),
    [],
    []
  );

  const visibleCategories =
    typeFilter === "income"
      ? INCOME_CATEGORIES
      : typeFilter === "expense"
      ? DEFAULT_CATEGORIES
      : [...DEFAULT_CATEGORIES, ...INCOME_CATEGORIES];

  const filtered = useMemo(() => {
    if (!expenses) return [];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return expenses.filter((e) => {
      if (typeFilter !== "all" && (e.type ?? "expense") !== typeFilter) return false;
      if (categoryId !== "all" && e.categoryId !== categoryId) return false;

      if (range === "week" && new Date(e.date) < startOfWeek) return false;
      if (range === "month" && new Date(e.date) < startOfMonth) return false;

      if (search) {
        const q = search.toLowerCase();
        if (
          !e.description.toLowerCase().includes(q) &&
          !e.categoryId.includes(q) &&
          !e.amount.toString().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [expenses, search, range, categoryId, typeFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    for (const e of filtered) {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    }
    return Object.entries(groups);
  }, [filtered]);

  return (
    <div className="animate-fade-in px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">History</h1>

      {/* Search */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
        />
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type filter */}
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-[var(--radius)] bg-[var(--secondary)] p-1">
        {(["all", "expense", "income"] as TypeFilter[]).map((t) => {
          const label = t === "all" ? "All" : t === "expense" ? "Expenses" : "Income";
          const color =
            t === "income" ? "var(--success)" : t === "expense" ? "var(--primary)" : undefined;
          return (
            <button
              key={t}
              onClick={() => {
                setTypeFilter(t);
                setCategoryId("all");
              }}
              className={cn(
                "rounded-[calc(var(--radius)-4px)] py-1.5 text-xs font-medium transition",
                typeFilter === t
                  ? "bg-[var(--card)] shadow"
                  : "text-[var(--muted-foreground)]"
              )}
              style={typeFilter === t && color ? { color } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Range filters */}
      <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {(["all", "week", "month"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              range === r
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
            )}
          >
            {r === "all" ? "All Time" : r === "week" ? "Last 7 Days" : "This Month"}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setCategoryId("all")}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            categoryId === "all"
              ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
          )}
        >
          All
        </button>
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              categoryId === c.id
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <Inbox size={36} className="text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">
            No transactions match your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {formatDate(date)}
              </h2>
              <div className="space-y-2">
                {items.map((e) => (
                  <ExpenseListItem key={e.id} expense={e} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
