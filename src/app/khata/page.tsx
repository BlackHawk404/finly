"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { summarizeByPerson, totalsForCurrency } from "@/lib/khata";
import { useSettingsStore } from "@/store/useSettingsStore";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { ArrowDownCircle, ArrowUpCircle, BookOpen, ChevronRight, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Filter = "all" | "lent" | "borrowed" | "settled";

export default function KhataPage() {
  const currency = useSettingsStore((s) => s.currency);
  const [filter, setFilter] = useState<Filter>("all");

  const entries = useLiveQuery(async () => db.khata.toArray(), [], []);
  const summaries = entries ? summarizeByPerson(entries) : [];
  const totals = entries ? totalsForCurrency(entries, currency) : { theyOweYou: 0, youOwe: 0, net: 0 };

  const filtered = summaries.filter((s) => {
    if (filter === "all") return s.pendingCount > 0 || s.netLent !== 0;
    if (filter === "lent") return s.netLent > 0;
    if (filter === "borrowed") return s.netLent < 0;
    if (filter === "settled") return s.pendingCount === 0;
    return true;
  });

  return (
    <div className="animate-fade-in px-4 pt-6">
      <div className="mb-1 flex items-center gap-2">
        <BookOpen size={22} className="text-[var(--primary)]" />
        <h1 className="text-2xl font-bold">Khata</h1>
      </div>
      <p className="mb-5 text-sm text-[var(--muted-foreground)]">
        Track money you&apos;ve lent or borrowed.
      </p>

      {/* Summary cards */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <ArrowUpCircle size={14} className="text-[var(--success)]" /> They owe you
          </div>
          <p className="text-lg font-bold text-[var(--success)]">
            {formatMoney(totals.theyOweYou, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <ArrowDownCircle size={14} className="text-[var(--warning)]" /> You owe
          </div>
          <p className="text-lg font-bold text-[var(--warning)]">
            {formatMoney(totals.youOwe, currency)}
          </p>
        </Card>
      </div>

      <Card
        className="mb-5 flex items-center justify-between p-4"
        style={{
          background: totals.net >= 0
            ? "color-mix(in srgb, var(--success) 6%, transparent)"
            : "color-mix(in srgb, var(--warning) 6%, transparent)",
          borderColor: totals.net >= 0
            ? "color-mix(in srgb, var(--success) 30%, transparent)"
            : "color-mix(in srgb, var(--warning) 30%, transparent)",
        }}
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
          <Wallet size={14} /> Net
        </div>
        <p
          className="text-xl font-bold"
          style={{ color: totals.net >= 0 ? "var(--success)" : "var(--warning)" }}
        >
          {totals.net < 0 ? "-" : "+"}
          {formatMoney(totals.net, currency)}
        </p>
      </Card>

      {/* Add button */}
      <Link
        href="/khata/add"
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] py-3 text-sm font-semibold text-[var(--primary-foreground)] transition active:scale-95"
      >
        <Plus size={18} /> New Khata Entry
      </Link>

      {/* Filters */}
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {(["all", "lent", "borrowed", "settled"] as Filter[]).map((f) => {
          const label =
            f === "all"
              ? "All"
              : f === "lent"
              ? "They owe me"
              : f === "borrowed"
              ? "I owe"
              : "Settled";
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                filter === f
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* People list */}
      {filtered.length === 0 ? (
        <Card className="mt-4 p-8 text-center">
          <BookOpen size={28} className="mx-auto mb-2 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium">Khata is empty</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Add your first lend / borrow entry to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const slug = encodeURIComponent(p.personName.trim().toLowerCase());
            const isYouAreOwed = p.netLent > 0;
            const isYouOwe = p.netLent < 0;
            const settled = p.pendingCount === 0;
            const initial = p.personName.trim().charAt(0).toUpperCase();
            return (
              <Link
                key={p.personName}
                href={`/khata/person/${slug}`}
                className="block"
              >
                <Card className="flex items-center gap-3 p-3 transition active:scale-[0.99]">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                    style={{
                      backgroundColor: isYouAreOwed
                        ? "var(--success)"
                        : isYouOwe
                        ? "var(--warning)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {initial || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.personName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {settled
                        ? "All settled"
                        : isYouAreOwed
                        ? "owes you"
                        : isYouOwe
                        ? "you owe"
                        : "even"}
                      {!settled && ` · ${p.pendingCount} pending`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: isYouAreOwed
                          ? "var(--success)"
                          : isYouOwe
                          ? "var(--warning)"
                          : undefined,
                      }}
                    >
                      {p.netLent === 0
                        ? formatMoney(0, currency)
                        : (p.netLent < 0 ? "-" : "+") +
                          formatMoney(Math.abs(p.netLent), currency)}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-[var(--muted-foreground)]" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
