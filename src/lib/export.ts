"use client";

import { db } from "./db";
import { getCategory } from "./categories";
import { format } from "date-fns";

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportExpensesAsCSV(): Promise<void> {
  const expenses = (await db.expenses.orderBy("date").reverse().toArray()).filter(
    (e) => !e.deletedAt
  );
  if (expenses.length === 0) {
    alert("No expenses to export.");
    return;
  }

  const headers = [
    "Date",
    "Amount",
    "Currency",
    "Category",
    "Description",
    "Payment Method",
    "Source",
    "Transcript",
    "Created At",
  ];

  const rows = expenses.map((e) =>
    [
      e.date,
      e.amount,
      e.currency,
      getCategory(e.categoryId).name,
      e.description,
      e.paymentMethod,
      e.source,
      e.rawTranscript ?? "",
      e.createdAt,
    ]
      .map(csvEscape)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finly-expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function clearAllData(): Promise<void> {
  await db.expenses.clear();
  await db.budgets.clear();
  await db.khata.clear();
}
