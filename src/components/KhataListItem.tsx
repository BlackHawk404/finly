"use client";

import { useState } from "react";
import Link from "next/link";
import { KhataEntry } from "@/lib/db";
import { deleteKhata, setKhataStatus } from "@/lib/khata";
import { formatMoney, formatDate } from "@/lib/format";
import { Card } from "./ui/Card";
import { Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Check, RotateCcw } from "lucide-react";

export function KhataListItem({
  entry,
  showName = true,
}: {
  entry: KhataEntry;
  showName?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const isLent = entry.type === "lent";
  const isPending = entry.status === "pending";
  const accent = isLent ? "var(--success)" : "var(--warning)";

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    await deleteKhata(entry.id);
  }

  async function toggleSettled() {
    await setKhataStatus(entry.id, isPending ? "settled" : "pending");
  }

  return (
    <Card className={`flex items-center gap-3 p-3 ${!isPending ? "opacity-60" : ""}`}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accent}20`, color: accent }}
      >
        {isLent ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">
            {showName ? entry.personName : entry.description || (isLent ? "Lent" : "Borrowed")}
          </p>
          {!isPending && (
            <span className="rounded bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
              SETTLED
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          {formatDate(entry.date)}
          {showName && entry.description ? ` · ${entry.description}` : ""}
          {!showName && entry.description ? "" : ""}
          {!isLent && showName ? " · borrowed" : isLent && showName ? " · lent" : ""}
        </p>
      </div>

      <p className="text-sm font-semibold" style={{ color: accent }}>
        {isLent ? "+" : "-"}
        {formatMoney(entry.amount, entry.currency)}
      </p>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={toggleSettled}
          aria-label={isPending ? "Mark settled" : "Mark pending"}
          title={isPending ? "Mark settled" : "Mark pending"}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--foreground)] active:scale-90"
        >
          {isPending ? <Check size={16} /> : <RotateCcw size={16} />}
        </button>
        <Link
          href={`/khata/edit/${entry.id}`}
          aria-label="Edit"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--foreground)] active:scale-90"
        >
          <Pencil size={16} />
        </Link>
        <button
          onClick={handleDelete}
          aria-label="Delete"
          className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius)] transition active:scale-90 ${
            confirming
              ? "bg-[var(--destructive)] text-white"
              : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          }`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </Card>
  );
}
