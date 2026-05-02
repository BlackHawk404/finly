"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { settleAllForPerson } from "@/lib/khata";
import { useSettingsStore } from "@/store/useSettingsStore";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { KhataListItem } from "@/components/KhataListItem";
import { ArrowLeft, Plus, CheckCheck, Inbox } from "lucide-react";

export default function PersonKhataPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const decoded = decodeURIComponent(name);
  const router = useRouter();
  const currency = useSettingsStore((s) => s.currency);
  const [confirmingSettle, setConfirmingSettle] = useState(false);

  const allEntries = useLiveQuery(async () => db.khata.toArray(), [], []);
  const personEntries = (allEntries ?? [])
    .filter((e) => e.personName.trim().toLowerCase() === decoded.trim().toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const displayName =
    personEntries[0]?.personName ?? decoded.charAt(0).toUpperCase() + decoded.slice(1);

  const pending = personEntries.filter((e) => e.status === "pending");
  const totalLent = pending.filter((e) => e.type === "lent").reduce((s, e) => s + e.amount, 0);
  const totalBorrowed = pending.filter((e) => e.type === "borrowed").reduce((s, e) => s + e.amount, 0);
  const net = totalLent - totalBorrowed;
  const initial = displayName.charAt(0).toUpperCase();

  async function handleSettleAll() {
    if (!confirmingSettle) {
      setConfirmingSettle(true);
      setTimeout(() => setConfirmingSettle(false), 4000);
      return;
    }
    await settleAllForPerson(decoded);
    setConfirmingSettle(false);
  }

  if (personEntries.length === 0 && allEntries) {
    return (
      <div className="animate-fade-in px-4 pt-6">
        <Button variant="ghost" onClick={() => router.push("/khata")} className="mb-2 -ml-3">
          <ArrowLeft size={16} /> Khata
        </Button>
        <p className="text-sm text-[var(--muted-foreground)]">No entries for {decoded}.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button variant="ghost" onClick={() => router.push("/khata")} className="mb-2 -ml-3">
        <ArrowLeft size={16} /> Khata
      </Button>

      {/* Person header */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{
            backgroundColor:
              net > 0 ? "var(--success)" : net < 0 ? "var(--warning)" : "var(--muted-foreground)",
          }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{displayName}</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            {personEntries.length} entries · {pending.length} pending
          </p>
        </div>
      </div>

      {/* Net balance */}
      <Card
        className="mb-5 p-5 text-center"
        style={{
          background: net >= 0
            ? "color-mix(in srgb, var(--success) 8%, transparent)"
            : "color-mix(in srgb, var(--warning) 8%, transparent)",
          borderColor: net >= 0
            ? "color-mix(in srgb, var(--success) 30%, transparent)"
            : "color-mix(in srgb, var(--warning) 30%, transparent)",
        }}
      >
        <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
          {net > 0 ? `${displayName} owes you` : net < 0 ? `You owe ${displayName}` : "All settled"}
        </p>
        <p
          className="mt-1 text-3xl font-bold"
          style={{ color: net >= 0 ? "var(--success)" : "var(--warning)" }}
        >
          {formatMoney(Math.abs(net), currency)}
        </p>
        {(totalLent > 0 || totalBorrowed > 0) && (
          <div className="mt-3 flex justify-center gap-4 text-xs text-[var(--muted-foreground)]">
            <span>Lent: {formatMoney(totalLent, currency)}</span>
            <span>Borrowed: {formatMoney(totalBorrowed, currency)}</span>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="mb-5 grid grid-cols-2 gap-2">
        <Link
          href={`/khata/add?person=${encodeURIComponent(displayName)}&type=lent`}
          className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--success)] bg-[var(--success)]/10 py-2.5 text-sm font-medium text-[var(--success)] transition active:scale-95"
        >
          <Plus size={14} /> Lent
        </Link>
        <Link
          href={`/khata/add?person=${encodeURIComponent(displayName)}&type=borrowed`}
          className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning)]/10 py-2.5 text-sm font-medium text-[var(--warning)] transition active:scale-95"
        >
          <Plus size={14} /> Borrowed
        </Link>
      </div>

      {pending.length > 0 && (
        <Button
          variant="outline"
          className="mb-5 w-full"
          onClick={handleSettleAll}
        >
          <CheckCheck size={16} />
          {confirmingSettle ? "Tap again to confirm" : "Mark all settled"}
        </Button>
      )}

      {/* Entries list */}
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        All Entries
      </h2>
      {personEntries.length === 0 ? (
        <Card className="p-6 text-center">
          <Inbox size={28} className="mx-auto mb-2 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">No entries yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {personEntries.map((entry) => (
            <KhataListItem key={entry.id} entry={entry} showName={false} />
          ))}
        </div>
      )}
    </div>
  );
}
