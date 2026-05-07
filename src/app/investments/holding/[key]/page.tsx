"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, AssetType, Investment } from "@/lib/db";
import {
  aggregateHolding,
  ASSET_TYPE_LABEL,
  setHoldingPrice,
  deleteInvestment,
  holdingKey,
} from "@/lib/investments";
import { formatMoney, formatDate, formatRelative } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default function HoldingDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key: rawKey } = use(params);
  const key = decodeURIComponent(rawKey);
  const router = useRouter();

  const [assetType, symbol] = key.split(":") as [AssetType, string];

  const lots = useLiveQuery(
    async () =>
      (await db.investments.toArray()).filter(
        (i) =>
          !i.deletedAt &&
          i.assetType === assetType &&
          i.symbol.trim().toUpperCase() === (symbol ?? "").trim().toUpperCase()
      ),
    [key]
  );

  const price = useLiveQuery(
    async () => db.holdingPrices.get(holdingKey(assetType, symbol)),
    [key]
  );

  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState(
    price?.pricePerUnit ? String(price.pricePerUnit) : ""
  );

  if (!lots) {
    return (
      <div className="px-4 pt-6">
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="animate-fade-in px-4 pt-6">
        <Button variant="ghost" onClick={() => router.push("/investments")} className="mb-2 -ml-3">
          <ArrowLeft size={16} /> Investments
        </Button>
        <p className="text-sm text-[var(--muted-foreground)]">
          No transactions for {symbol}.
        </p>
      </div>
    );
  }

  const holding = aggregateHolding(lots, price && !price.deletedAt ? price : null)!;

  async function handleSavePrice() {
    const p = parseFloat(priceDraft);
    if (!Number.isFinite(p) || p < 0) return;
    await setHoldingPrice(assetType, symbol, p, holding.currency);
    setEditingPrice(false);
  }

  const isUp = holding.totalPnL >= 0;
  const pnlPct =
    holding.invested > 0
      ? (holding.unrealizedPnL / holding.invested) * 100
      : 0;

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button
        variant="ghost"
        onClick={() => router.push("/investments")}
        className="mb-2 -ml-3"
      >
        <ArrowLeft size={16} /> Investments
      </Button>

      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-deep), var(--primary))",
          }}
        >
          {symbol.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{symbol}</h1>
          <p className="truncate text-xs text-[var(--muted-foreground)]">
            {holding.name && holding.name !== symbol
              ? `${holding.name} · ${ASSET_TYPE_LABEL[assetType]}`
              : ASSET_TYPE_LABEL[assetType]}
          </p>
        </div>
      </div>

      {/* Summary card */}
      <Card
        className="mb-4 overflow-hidden border-0 p-5 text-white shadow-xl"
        style={{
          background: isUp
            ? "linear-gradient(135deg, var(--brand-deep), var(--primary))"
            : "linear-gradient(135deg, #7f1d1d, #b91c1c)",
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
          {holding.quantity > 0 ? "Current value" : "Position closed"}
        </p>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {holding.currentPrice !== null && holding.quantity > 0
            ? formatMoney(holding.currentValue, holding.currency)
            : holding.quantity > 0
            ? formatMoney(holding.invested, holding.currency)
            : formatMoney(holding.realizedPnL, holding.currency)}
        </p>
        {holding.quantity > 0 && holding.currentPrice !== null && (
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="tabular-nums">
              {holding.unrealizedPnL >= 0 ? "+" : ""}
              {formatMoney(Math.abs(holding.unrealizedPnL), holding.currency)} ({pnlPct >= 0 ? "+" : ""}
              {pnlPct.toFixed(2)}%)
            </span>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
            <p className="text-[10px] uppercase tracking-wider text-white/70">
              Quantity
            </p>
            <p className="mt-0.5 font-semibold tabular-nums">
              {holding.quantity.toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
            <p className="text-[10px] uppercase tracking-wider text-white/70">
              Avg buy
            </p>
            <p className="mt-0.5 font-semibold tabular-nums">
              {formatMoney(holding.avgPrice, holding.currency)}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
            <p className="text-[10px] uppercase tracking-wider text-white/70">
              Invested
            </p>
            <p className="mt-0.5 font-semibold tabular-nums">
              {formatMoney(holding.invested, holding.currency)}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
            <p className="text-[10px] uppercase tracking-wider text-white/70">
              Realized P&amp;L
            </p>
            <p className="mt-0.5 font-semibold tabular-nums">
              {holding.realizedPnL >= 0 ? "+" : "-"}
              {formatMoney(Math.abs(holding.realizedPnL), holding.currency)}
            </p>
          </div>
        </div>
      </Card>

      {/* Current price (manual) */}
      <Card className="mb-4 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            <RefreshCw size={12} /> Current price
          </p>
          {price?.asOf && !editingPrice && (
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Updated {formatRelative(price.asOf)}
            </p>
          )}
        </div>
        {!editingPrice ? (
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold tabular-nums">
              {holding.currentPrice !== null
                ? formatMoney(holding.currentPrice, holding.currency)
                : "—"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPriceDraft(
                  holding.currentPrice ? String(holding.currentPrice) : ""
                );
                setEditingPrice(true);
              }}
            >
              <Pencil size={14} /> {holding.currentPrice !== null ? "Update" : "Set"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="price" className="text-xs">
              Price per unit ({holding.currency})
            </Label>
            <Input
              id="price"
              type="number"
              inputMode="decimal"
              step="0.0001"
              min="0"
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setEditingPrice(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePrice}>Save</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <div className="mb-5 grid grid-cols-2 gap-2">
        <Link
          href={`/investments/add?assetType=${assetType}&symbol=${encodeURIComponent(
            symbol
          )}&name=${encodeURIComponent(holding.name)}&side=buy&currency=${
            holding.currency
          }`}
          className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--success)] bg-[var(--success)]/10 py-2.5 text-sm font-medium text-[var(--success)] transition active:scale-95"
        >
          <Plus size={14} /> Buy more
        </Link>
        <Link
          href={`/investments/add?assetType=${assetType}&symbol=${encodeURIComponent(
            symbol
          )}&name=${encodeURIComponent(holding.name)}&side=sell&currency=${
            holding.currency
          }`}
          className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning)]/10 py-2.5 text-sm font-medium text-[var(--warning)] transition active:scale-95"
        >
          <ArrowUpRight size={14} /> Sell
        </Link>
      </div>

      {/* Lots */}
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Transactions
      </h2>
      <div className="space-y-2">
        {[...holding.lots]
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date) ||
              b.createdAt.localeCompare(a.createdAt)
          )
          .map((lot) => (
            <LotRow key={lot.id} lot={lot} />
          ))}
      </div>
    </div>
  );
}

function LotRow({ lot }: { lot: Investment }) {
  const [confirming, setConfirming] = useState(false);
  const isBuy = lot.side === "buy";
  const accent = isBuy ? "var(--success)" : "var(--warning)";
  const total = lot.quantity * lot.pricePerUnit + (isBuy ? lot.fees : -lot.fees);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    await deleteInvestment(lot.id);
  }

  return (
    <Card className="flex items-center gap-3 p-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accent}20`, color: accent }}
      >
        {isBuy ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {isBuy ? "Bought" : "Sold"}{" "}
          {lot.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
          @ {formatMoney(lot.pricePerUnit, lot.currency)}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {formatDate(lot.date)}
          {lot.fees > 0 && ` · fees ${formatMoney(lot.fees, lot.currency)}`}
          {lot.notes && ` · ${lot.notes}`}
        </p>
      </div>
      <p className="text-sm font-semibold tabular-nums" style={{ color: accent }}>
        {isBuy ? "-" : "+"}
        {formatMoney(total, lot.currency)}
      </p>
      <div className="flex shrink-0 items-center gap-0.5">
        <Link
          href={`/investments/edit/${lot.id}`}
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
