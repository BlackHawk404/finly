"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { ReceiptLightbox } from "./ReceiptLightbox";
import { Camera } from "lucide-react";

interface ReceiptThumbProps {
  expenseId: string;
  /** Rendered when no receipt is attached (e.g. CategoryBadge). */
  fallback?: React.ReactNode;
  size?: number;
}

export function ReceiptThumb({ expenseId, fallback, size = 44 }: ReceiptThumbProps) {
  const receipt = useLiveQuery(
    async () => db.receipts.get(expenseId),
    [expenseId]
  );

  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!receipt?.blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(receipt.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [receipt?.blob]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!receipt || !url) return <>{fallback}</>;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        aria-label="View receipt"
        title="View receipt"
        className="relative shrink-0 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-black transition active:scale-95"
        style={{ height: size, width: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Receipt"
          className="h-full w-full object-cover"
        />
        <span
          aria-hidden
          className="absolute bottom-0 right-0 flex h-4 w-4 translate-x-0.5 translate-y-0.5 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
        >
          <Camera size={9} strokeWidth={2.5} />
        </span>
      </button>
      {open && <ReceiptLightbox url={url} onClose={() => setOpen(false)} />}
    </>
  );
}
