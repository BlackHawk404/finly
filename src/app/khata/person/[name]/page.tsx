"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, KhataEntry } from "@/lib/db";
import { runningLedger, deleteKhata } from "@/lib/khata";
import { useSettingsStore } from "@/store/useSettingsStore";
import { formatMoney, formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Plus,
  Inbox,
  Pencil,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";

export default function PersonKhataPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const decoded = decodeURIComponent(name);
  const router = useRouter();
  const currency = useSettingsStore((s) => s.currency);

  const allEntries = useLiveQuery(
    async () => (await db.khata.toArray()).filter((e) => !e.deletedAt),
    [],
    []
  );
  const personEntries = (allEntries ?? []).filter(
    (e) => e.personName.trim().toLowerCase() === decoded.trim().toLowerCase()
  );

  const displayName =
    personEntries[0]?.personName ?? decoded.charAt(0).toUpperCase() + decoded.slice(1);

  // Active (non-settled) entries with running balance, oldest -> newest.
  const ledger = runningLedger(personEntries);
  // Display newest -> oldest (balance still reflects the chronological running total).
  const ledgerDesc = [...ledger].reverse();

  const settledArchive = personEntries
    .filter((e) => e.status === "settled")
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalGave = ledger
    .filter((r) => r.entry.type === "lent")
    .reduce((s, r) => s + r.entry.amount, 0);
  const totalGot = ledger
    .filter((r) => r.entry.type === "borrowed")
    .reduce((s, r) => s + r.entry.amount, 0);
  const net = totalGave - totalGot;
  const initial = displayName.charAt(0).toUpperCase();

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
            {ledger.length} {ledger.length === 1 ? "transaction" : "transactions"}
            {settledArchive.length > 0 && ` · ${settledArchive.length} closed`}
          </p>
        </div>
      </div>

      {/* Net balance */}
      <Card
        className="mb-5 p-5 text-center"
        style={{
          background:
            net === 0
              ? "color-mix(in srgb, var(--muted-foreground) 6%, transparent)"
              : net > 0
              ? "color-mix(in srgb, var(--success) 8%, transparent)"
              : "color-mix(in srgb, var(--warning) 8%, transparent)",
          borderColor:
            net === 0
              ? "var(--border)"
              : net > 0
              ? "color-mix(in srgb, var(--success) 30%, transparent)"
              : "color-mix(in srgb, var(--warning) 30%, transparent)",
        }}
      >
        <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
          {net > 0 ? `${displayName} owes you` : net < 0 ? `You owe ${displayName}` : "All clear"}
        </p>
        <p
          className="mt-1 text-3xl font-bold tabular-nums"
          style={{
            color:
              net === 0
                ? "var(--muted-foreground)"
                : net > 0
                ? "var(--success)"
                : "var(--warning)",
          }}
        >
          {formatMoney(Math.abs(net), currency)}
        </p>
        {(totalGave > 0 || totalGot > 0) && (
          <div className="mt-3 flex justify-center gap-4 text-xs text-[var(--muted-foreground)]">
            <span>You gave: {formatMoney(totalGave, currency)}</span>
            <span>You got: {formatMoney(totalGot, currency)}</span>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="mb-5 grid grid-cols-2 gap-2">
        <Link
          href={`/khata/add?person=${encodeURIComponent(displayName)}&type=lent`}
          className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--success)] bg-[var(--success)]/10 py-2.5 text-sm font-medium text-[var(--success)] transition active:scale-95"
        >
          <Plus size={14} /> You Gave
        </Link>
        <Link
          href={`/khata/add?person=${encodeURIComponent(displayName)}&type=borrowed`}
          className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning)]/10 py-2.5 text-sm font-medium text-[var(--warning)] transition active:scale-95"
        >
          <Plus size={14} /> You Got
        </Link>
      </div>

      {/* Ledger */}
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Ledger
      </h2>
      {ledger.length === 0 ? (
        <Card className="p-6 text-center">
          <Inbox size={28} className="mx-auto mb-2 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">No active transactions</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-[var(--border)] bg-[var(--secondary)]/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            <span>Date · Note</span>
            <span className="text-right">Gave</span>
            <span className="text-right">Got</span>
            <span className="w-20 text-right">Balance</span>
          </div>
          {ledgerDesc.map((row, idx) => (
            <LedgerRow
              key={row.entry.id}
              entry={row.entry}
              balance={row.balance}
              isLast={idx === ledgerDesc.length - 1}
            />
          ))}
        </Card>
      )}

      {/* Settled archive */}
      {settledArchive.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Closed (legacy)
          </h2>
          <div className="space-y-2 opacity-60">
            {settledArchive.map((entry) => (
              <ArchiveRow key={entry.id} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LedgerRow({
  entry,
  balance,
  isLast,
}: {
  entry: KhataEntry;
  balance: number;
  isLast: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const isLent = entry.type === "lent";

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    await deleteKhata(entry.id);
  }

  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 ${
        isLast ? "" : "border-b border-[var(--border)]"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{formatDate(entry.date)}</p>
        {entry.description && (
          <p className="truncate text-xs text-[var(--muted-foreground)]">
            {entry.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1">
          <Link
            href={`/khata/edit/${entry.id}`}
            aria-label="Edit"
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <Pencil size={12} />
          </Link>
          <button
            onClick={handleDelete}
            aria-label="Delete"
            className={`flex h-6 w-6 items-center justify-center rounded transition ${
              confirming
                ? "bg-[var(--destructive)] text-white"
                : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            }`}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <p
        className="w-16 text-right text-sm font-semibold tabular-nums"
        style={{ color: isLent ? "var(--success)" : "transparent" }}
      >
        {isLent ? formatMoney(entry.amount, entry.currency) : "—"}
      </p>
      <p
        className="w-16 text-right text-sm font-semibold tabular-nums"
        style={{ color: !isLent ? "var(--warning)" : "transparent" }}
      >
        {!isLent ? formatMoney(entry.amount, entry.currency) : "—"}
      </p>
      <p
        className="w-20 text-right text-sm font-semibold tabular-nums"
        style={{
          color:
            balance === 0
              ? "var(--muted-foreground)"
              : balance > 0
              ? "var(--success)"
              : "var(--warning)",
        }}
      >
        {balance < 0 ? "-" : balance > 0 ? "+" : ""}
        {formatMoney(Math.abs(balance), entry.currency)}
      </p>
    </div>
  );
}

function ArchiveRow({ entry }: { entry: KhataEntry }) {
  const isLent = entry.type === "lent";
  const accent = isLent ? "var(--success)" : "var(--warning)";
  return (
    <Card className="flex items-center gap-3 p-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accent}20`, color: accent }}
      >
        {isLent ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {entry.description || (isLent ? "You Gave" : "You Got")}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">{formatDate(entry.date)}</p>
      </div>
      <p className="text-sm font-semibold tabular-nums" style={{ color: accent }}>
        {isLent ? "+" : "-"}
        {formatMoney(entry.amount, entry.currency)}
      </p>
    </Card>
  );
}
