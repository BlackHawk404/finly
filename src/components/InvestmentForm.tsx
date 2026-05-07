"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, AssetType, InvestmentSide } from "@/lib/db";
import {
  saveInvestment,
  updateInvestment,
  InvestmentDraft,
  ASSET_TYPE_LABEL,
} from "@/lib/investments";
import { CURRENCIES, todayISO, getCurrencySymbol } from "@/lib/format";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvestmentFormProps {
  initial?: Partial<InvestmentDraft>;
  editId?: string;
  onSaved?: () => void;
}

const ASSET_TYPES: AssetType[] = [
  "stock",
  "crypto",
  "mutual_fund",
  "gold",
  "other",
];

export function InvestmentForm({ initial, editId, onSaved }: InvestmentFormProps) {
  const router = useRouter();
  const { currency } = useSettingsStore();

  const [side, setSide] = useState<InvestmentSide>(initial?.side ?? "buy");
  const [assetType, setAssetType] = useState<AssetType>(
    initial?.assetType ?? "stock"
  );
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [quantity, setQuantity] = useState(
    initial?.quantity ? String(initial.quantity) : ""
  );
  const [pricePerUnit, setPricePerUnit] = useState(
    initial?.pricePerUnit ? String(initial.pricePerUnit) : ""
  );
  const [fees, setFees] = useState(initial?.fees ? String(initial.fees) : "");
  const [lotCurrency, setLotCurrency] = useState(initial?.currency ?? currency);
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggest known symbols / names from existing investments
  const known = useLiveQuery(
    async () => (await db.investments.toArray()).filter((i) => !i.deletedAt),
    [],
    []
  );
  const knownSymbols = Array.from(
    new Map(
      (known ?? [])
        .filter((i) => i.assetType === assetType)
        .map((i) => [i.symbol, i.name])
    ).entries()
  );

  // When user types a known symbol, auto-fill the name on first edit.
  useEffect(() => {
    if (initial?.symbol) return;
    const trimmed = symbol.trim().toUpperCase();
    if (!trimmed) return;
    const match = knownSymbols.find(([s]) => s === trimmed);
    if (match && !name) setName(match[1]);
  }, [symbol, knownSymbols, initial?.symbol, name]);

  const total =
    (parseFloat(quantity) || 0) * (parseFloat(pricePerUnit) || 0) +
    (side === "buy" ? parseFloat(fees) || 0 : -(parseFloat(fees) || 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerUnit);
    const f = parseFloat(fees);

    if (!symbol.trim()) {
      setError("Please enter a symbol or ticker.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Please enter a valid price per unit.");
      return;
    }

    const draft: InvestmentDraft = {
      assetType,
      symbol,
      name,
      side,
      quantity: qty,
      pricePerUnit: price,
      fees: Number.isFinite(f) && f > 0 ? f : 0,
      currency: lotCurrency,
      date,
      notes,
    };

    setSaving(true);
    try {
      if (editId) {
        await updateInvestment(editId, draft);
      } else {
        await saveInvestment(draft);
      }
      if (onSaved) onSaved();
      else router.push("/investments");
    } catch (err) {
      setError("Failed to save.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const accent =
    side === "buy" ? "var(--success)" : "var(--warning)";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-[var(--radius)] bg-[var(--secondary)] p-1">
        <button
          type="button"
          onClick={() => setSide("buy")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] py-2 text-sm font-medium transition",
            side === "buy"
              ? "bg-[var(--card)] text-[var(--success)] shadow"
              : "text-[var(--muted-foreground)]"
          )}
        >
          <ArrowDownLeft size={16} /> Buy
        </button>
        <button
          type="button"
          onClick={() => setSide("sell")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] py-2 text-sm font-medium transition",
            side === "sell"
              ? "bg-[var(--card)] text-[var(--warning)] shadow"
              : "text-[var(--muted-foreground)]"
          )}
        >
          <ArrowUpRight size={16} /> Sell
        </button>
      </div>

      {/* Asset type */}
      <div>
        <Label className="mb-2 block">Asset type</Label>
        <div className="grid grid-cols-5 gap-2">
          {ASSET_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAssetType(t)}
              className={cn(
                "rounded-[var(--radius)] border px-2 py-2 text-[11px] font-medium transition active:scale-95",
                assetType === t
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
              )}
            >
              {ASSET_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Symbol + Name */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="symbol" className="mb-1.5 block">
            Symbol / Ticker
          </Label>
          <Input
            id="symbol"
            list="known-symbols"
            placeholder="AAPL"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            required
            maxLength={20}
            autoFocus={!initial?.symbol}
          />
          {knownSymbols.length > 0 && (
            <datalist id="known-symbols">
              {knownSymbols.map(([s, n]) => (
                <option key={s} value={s}>
                  {n}
                </option>
              ))}
            </datalist>
          )}
          {assetType === "stock" && (
            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
              For PSX you can enter the bare ticker (e.g. <code>HBL</code>) — we&apos;ll add <code>.KA</code> automatically.
              For other markets include the suffix (<code>AAPL</code>, <code>RELIANCE.NS</code>).
            </p>
          )}
          {assetType === "crypto" && (
            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
              Use the standard ticker (e.g. <code>BTC</code>, <code>ETH</code>, <code>SOL</code>).
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="name" className="mb-1.5 block">
            Name <span className="text-[var(--muted-foreground)]">(optional)</span>
          </Label>
          <Input
            id="name"
            placeholder="Apple Inc."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </div>
      </div>

      {/* Quantity + Price */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="qty" className="mb-1.5 block text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Quantity
            </Label>
            <Input
              id="qty"
              type="number"
              inputMode="decimal"
              step="0.0001"
              min="0"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <Label
              htmlFor="price"
              className="mb-1.5 block text-xs uppercase tracking-wider text-[var(--muted-foreground)]"
            >
              Price / unit
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">
                {getCurrencySymbol(lotCurrency)}
              </span>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                step="0.0001"
                min="0"
                placeholder="0.00"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                required
                className="pl-8"
              />
            </div>
          </div>
        </div>
        {/* Total preview */}
        {total > 0 && (
          <p
            className="mt-3 text-sm font-semibold"
            style={{ color: accent }}
          >
            {side === "buy" ? "Cost" : "Proceeds"}:{" "}
            {getCurrencySymbol(lotCurrency)}
            {total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        )}
      </Card>

      {/* Currency + Fees */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cur" className="mb-1.5 block">
            Currency
          </Label>
          <select
            id="cur"
            value={lotCurrency}
            onChange={(e) => setLotCurrency(e.target.value)}
            className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--card)] px-3 text-base"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="fees" className="mb-1.5 block">
            Fees{" "}
            <span className="text-[var(--muted-foreground)]">(optional)</span>
          </Label>
          <Input
            id="fees"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
          />
        </div>
      </div>

      {/* Date */}
      <div>
        <Label htmlFor="date" className="mb-1.5 block">
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

      {/* Notes */}
      <div>
        <Label htmlFor="notes" className="mb-1.5 block">
          Notes <span className="text-[var(--muted-foreground)]">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Long-term hold, dollar-cost averaging"
        />
      </div>

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/8 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}

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
            <Check size={18} />{" "}
            {editId ? "Update transaction" : `Save ${side === "buy" ? "buy" : "sell"}`}
          </>
        )}
      </Button>
    </form>
  );
}
