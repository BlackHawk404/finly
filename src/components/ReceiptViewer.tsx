"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { deleteReceipt } from "@/lib/receipts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ReceiptLightbox } from "./ReceiptLightbox";
import { Receipt as ReceiptIcon, Trash2 } from "lucide-react";

interface ReceiptViewerProps {
  expenseId: string;
}

export function ReceiptViewer({ expenseId }: ReceiptViewerProps) {
  const receipt = useLiveQuery(
    async () => db.receipts.get(expenseId),
    [expenseId]
  );

  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!receipt?.blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(receipt.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [receipt?.blob]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!receipt || !url) return null;

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    await deleteReceipt(expenseId);
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            <ReceiptIcon size={12} /> Receipt
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className={confirming ? "text-[var(--destructive)]" : ""}
          >
            <Trash2 size={14} />
            {confirming ? "Confirm" : "Remove"}
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full bg-black text-left active:opacity-90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Receipt"
            className="h-auto max-h-72 w-full object-contain"
          />
        </button>
      </Card>

      {open && <ReceiptLightbox url={url} onClose={() => setOpen(false)} />}
    </>
  );
}
