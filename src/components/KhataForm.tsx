"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, KhataType } from "@/lib/db";
import { saveKhata, updateKhata, KhataDraft } from "@/lib/khata";
import { todayISO, getCurrencySymbol } from "@/lib/format";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Input, Textarea } from "./ui/Input";
import { Label } from "./ui/Label";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { ArrowDownCircle, ArrowUpCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface KhataFormProps {
  initial?: Partial<KhataDraft>;
  editId?: string;
  defaultPersonName?: string;
  onSaved?: () => void;
}

export function KhataForm({ initial, editId, defaultPersonName, onSaved }: KhataFormProps) {
  const router = useRouter();
  const { currency } = useSettingsStore();

  const [type, setType] = useState<KhataType>(initial?.type ?? "lent");
  const [personName, setPersonName] = useState(
    initial?.personName ?? defaultPersonName ?? ""
  );
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggest names from existing khata entries
  const allEntries = useLiveQuery(
    async () => (await db.khata.toArray()).filter((e) => !e.deletedAt),
    [],
    []
  );
  const knownNames = Array.from(
    new Map(
      (allEntries ?? []).map((e) => [
        e.personName.trim().toLowerCase(),
        e.personName.trim(),
      ])
    ).values()
  ).sort();

  useEffect(() => {
    if (defaultPersonName && !initial?.personName) setPersonName(defaultPersonName);
  }, [defaultPersonName, initial?.personName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!personName.trim()) {
      setError("Please enter the person's name.");
      return;
    }
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await updateKhata(editId, {
          type,
          personName,
          amount: numAmount,
          currency: initial?.currency ?? currency,
          date,
          description,
        });
      } else {
        await saveKhata({
          type,
          personName,
          amount: numAmount,
          currency: initial?.currency ?? currency,
          date,
          description,
        });
      }
      if (onSaved) onSaved();
      else router.push("/khata");
    } catch (err) {
      setError("Failed to save.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const accent = type === "lent" ? "var(--success)" : "var(--warning)";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-[var(--radius)] bg-[var(--secondary)] p-1">
        <button
          type="button"
          onClick={() => setType("lent")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] py-2 text-sm font-medium transition",
            type === "lent"
              ? "bg-[var(--card)] text-[var(--success)] shadow"
              : "text-[var(--muted-foreground)]"
          )}
        >
          <ArrowUpCircle size={16} /> You Gave
        </button>
        <button
          type="button"
          onClick={() => setType("borrowed")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] py-2 text-sm font-medium transition",
            type === "borrowed"
              ? "bg-[var(--card)] text-[var(--warning)] shadow"
              : "text-[var(--muted-foreground)]"
          )}
        >
          <ArrowDownCircle size={16} /> You Got
        </button>
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">
        {type === "lent"
          ? "Money out — a loan or a repayment to them."
          : "Money in — they paid you, or you took a loan from them."}
      </p>

      {/* Amount */}
      <Card className="p-5">
        <Label className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
          Amount
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-semibold" style={{ color: accent }}>
            {getCurrencySymbol(currency)}
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-3xl font-semibold outline-none placeholder:text-[var(--muted-foreground)]/40"
            style={{ color: accent }}
            autoFocus={!initial?.amount}
            required
          />
        </div>
      </Card>

      {/* Person name */}
      <div>
        <Label htmlFor="personName" className="mb-2 block">
          Person Name
        </Label>
        <Input
          id="personName"
          list="known-names"
          placeholder="e.g. Ahmed"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          required
          maxLength={60}
        />
        {knownNames.length > 0 && (
          <datalist id="known-names">
            {knownNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        )}
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

      {/* Description */}
      <div>
        <Label htmlFor="desc" className="mb-2 block">
          Note <span className="font-normal text-[var(--muted-foreground)]">(optional)</span>
        </Label>
        <Textarea
          id="desc"
          rows={2}
          placeholder="What was this for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={saving}
        style={{ backgroundColor: accent }}
      >
        {saving ? (
          "Saving..."
        ) : (
          <>
            <Check size={18} /> {editId ? "Update Entry" : "Add to Ledger"}
          </>
        )}
      </Button>
    </form>
  );
}
