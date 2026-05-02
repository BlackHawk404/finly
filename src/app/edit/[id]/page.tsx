"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, Expense } from "@/lib/db";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null | undefined>(undefined);

  useEffect(() => {
    db.expenses.get(id).then((e) => setExpense(e ?? null));
  }, [id]);

  if (expense === undefined) {
    return (
      <div className="px-4 pt-6">
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  if (expense === null) {
    return (
      <div className="px-4 pt-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
          <ArrowLeft size={16} /> Back
        </Button>
        <h1 className="text-2xl font-bold">Not found</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          This transaction no longer exists.
        </p>
      </div>
    );
  }

  const isIncome = expense.type === "income";

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
        <ArrowLeft size={16} /> Back
      </Button>
      <h1 className="mb-4 text-2xl font-bold">
        Edit {isIncome ? "Income" : "Expense"}
      </h1>

      <ExpenseForm
        editId={expense.id}
        type={expense.type}
        initial={{
          amount: expense.amount,
          currency: expense.currency,
          categoryId: expense.categoryId,
          description: expense.description,
          date: expense.date,
          paymentMethod: expense.paymentMethod,
        }}
      />
    </div>
  );
}
