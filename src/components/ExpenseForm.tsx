"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CategoryBadge } from "@/components/CategoryIcon";
import { getCategoriesFor } from "@/lib/categories";
import { saveExpense, updateExpense, ExpenseDraft } from "@/lib/expenses";
import { todayISO, getCurrencySymbol } from "@/lib/format";
import { useSettingsStore } from "@/store/useSettingsStore";
import { PaymentMethod, ExpenseSource, TxType } from "@/lib/db";
import { Check, Banknote, CreditCard, Smartphone, Building2, Wallet } from "lucide-react";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "cash", label: "Cash", Icon: Banknote },
  { id: "card", label: "Card", Icon: CreditCard },
  { id: "upi", label: "UPI", Icon: Smartphone },
  { id: "bank", label: "Bank", Icon: Building2 },
  { id: "other", label: "Other", Icon: Wallet },
];

interface ExpenseFormProps {
  type?: TxType;
  initial?: Partial<ExpenseDraft>;
  source?: ExpenseSource;
  rawTranscript?: string;
  onSaved?: () => void;
  submitLabel?: string;
  /** When provided, the form updates the expense with this id instead of creating a new one. */
  editId?: string;
}

export function ExpenseForm({
  type = "expense",
  initial,
  source = "manual",
  rawTranscript,
  onSaved,
  submitLabel,
  editId,
}: ExpenseFormProps) {
  const router = useRouter();
  const { currency, defaultPaymentMethod } = useSettingsStore();

  const categories = getCategoriesFor(type);
  const isIncome = type === "income";

  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? (isIncome ? "salary" : "other")
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (initial?.paymentMethod ?? (isIncome ? "bank" : (defaultPaymentMethod as PaymentMethod))) || "card"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // sync default payment when settings load (expense only)
  useEffect(() => {
    if (!initial?.paymentMethod && !isIncome) {
      setPaymentMethod(defaultPaymentMethod as PaymentMethod);
    }
  }, [defaultPaymentMethod, initial?.paymentMethod, isIncome]);

  // reset category when switching type and current id is invalid for new type
  useEffect(() => {
    if (!categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [type, categories, categoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await updateExpense(editId, {
          type,
          amount: numAmount,
          currency: initial?.currency ?? currency,
          categoryId,
          description: description.trim(),
          date,
          paymentMethod,
        });
      } else {
        await saveExpense({
          type,
          amount: numAmount,
          currency: initial?.currency ?? currency,
          categoryId,
          description: description.trim(),
          date,
          paymentMethod,
          source,
          rawTranscript,
        });
      }
      if (onSaved) {
        onSaved();
      } else {
        router.push(editId ? "/history" : "/");
      }
    } catch (err) {
      setError("Failed to save. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const accent = isIncome ? "var(--success)" : "var(--primary)";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount */}
      <Card className="p-5">
        <Label htmlFor="amount" className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
          {isIncome ? "Income Amount" : "Amount"}
        </Label>
        <div className="flex items-center gap-2">
          <span
            className="text-3xl font-semibold"
            style={{ color: isIncome ? accent : "var(--muted-foreground)" }}
          >
            {isIncome ? "+" : ""}
            {getCurrencySymbol(currency)}
          </span>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-3xl font-semibold outline-none placeholder:text-[var(--muted-foreground)]/40"
            style={{ color: isIncome ? accent : undefined }}
            autoFocus={!initial?.amount}
            required
          />
        </div>
      </Card>

      {/* Category */}
      <div>
        <Label className="mb-2 block">Category</Label>
        <div className={isIncome ? "grid grid-cols-4 gap-2" : "grid grid-cols-4 gap-2"}>
          {categories.map((cat) => {
            const active = categoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`flex flex-col items-center gap-1 rounded-[var(--radius)] border p-2 text-center transition active:scale-95 ${
                  active
                    ? "border-[color:var(--accent-color)] bg-[color:var(--accent-color)]/10"
                    : "border-[var(--border)] bg-[var(--card)]"
                }`}
                style={
                  active
                    ? { ["--accent-color" as string]: accent }
                    : undefined
                }
              >
                <CategoryBadge icon={cat.icon} color={cat.color} size={36} />
                <span className="line-clamp-1 text-[10px] font-medium">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="mb-2 block">
          Note <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isIncome ? "e.g. April salary" : "What did you spend on?"}
        />
      </div>

      {/* Date */}
      <div>
        <Label htmlFor="date" className="mb-2 block">
          Date
        </Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={todayISO()}
          required
        />
      </div>

      {/* Payment Method (expenses only) */}
      {!isIncome && (
        <div>
          <Label className="mb-2 block">Payment Method</Label>
          <div className="grid grid-cols-5 gap-2">
            {PAYMENT_METHODS.map(({ id, label, Icon }) => {
              const active = paymentMethod === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`flex flex-col items-center gap-1 rounded-[var(--radius)] border p-2 transition active:scale-95 ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={saving}
        style={isIncome ? { backgroundColor: accent } : undefined}
      >
        {saving ? (
          "Saving..."
        ) : (
          <>
            <Check size={18} />{" "}
            {submitLabel ??
              (editId
                ? "Update"
                : isIncome
                ? "Save Income"
                : "Save Expense")}
          </>
        )}
      </Button>
    </form>
  );
}
