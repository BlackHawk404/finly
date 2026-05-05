"use client";

import { useState } from "react";
import Link from "next/link";
import { Expense } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { CategoryBadge } from "./CategoryIcon";
import { ReceiptThumb } from "./ReceiptThumb";
import { formatMoney } from "@/lib/format";
import { deleteExpense } from "@/lib/expenses";
import { Trash2, Mic, Pencil } from "lucide-react";
import { Card } from "./ui/Card";

export function ExpenseListItem({ expense }: { expense: Expense }) {
  const cat = getCategory(expense.categoryId);
  const [confirming, setConfirming] = useState(false);
  const isIncome = expense.type === "income";

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    await deleteExpense(expense.id);
  }

  return (
    <Card className="flex items-center gap-3 p-3">
      <ReceiptThumb
        expenseId={expense.id}
        fallback={<CategoryBadge icon={cat.icon} color={cat.color} />}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">
            {expense.description || cat.name}
          </p>
          {expense.source === "voice" && (
            <Mic size={12} className="shrink-0 text-[var(--muted-foreground)]" />
          )}
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          {cat.name}
          {!isIncome && ` · ${expense.paymentMethod}`}
        </p>
      </div>
      <div className="text-right">
        <p
          className="text-sm font-semibold"
          style={{ color: isIncome ? "var(--success)" : undefined }}
        >
          {isIncome ? "+" : "-"}
          {formatMoney(expense.amount, expense.currency)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Link
          href={`/edit/${expense.id}`}
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
