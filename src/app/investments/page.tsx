"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  groupHoldings,
  portfolioTotals,
  ASSET_TYPE_LABEL,
} from "@/lib/investments";
import { refreshHoldingPrice, isQuote, quoteProviderFor } from "@/lib/quotes";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ChevronRight,
  LineChart,
  ArrowLeft,
  Zap,
} from "lucide-react";

export default function InvestmentsPage() {
  const investments = useLiveQuery(
    async () => (await db.investments.toArray()).filter((i) => !i.deletedAt),
    [],
    []
  );
  const prices = useLiveQuery(
    async () => (await db.holdingPrices.toArray()).filter((p) => !p.deletedAt),
    [],
    []
  );

  const holdings =
    investments && prices ? groupHoldings(investments, prices) : [];
  const open = holdings.filter((h) => h.quantity > 0);
  const closed = holdings.filter((h) => h.quantity === 0);
  const totals = portfolioTotals(holdings);

  const dominantCurrency =
    Object.entries(totals.byCurrency).sort(
      (a, b) => b[1].invested - a[1].invested
    )[0]?.[0] ?? "USD";

  const [refreshing, setRefreshing] = useState(false);
  const [refreshSummary, setRefreshSummary] = useState<string | null>(null);

  const liveOpen = open.filter((h) => quoteProviderFor(h.assetType));

  async function refreshAll() {
    if (liveOpen.length === 0) return;
    setRefreshing(true);
    setRefreshSummary(null);
    let ok = 0;
    let fail = 0;
    // Sequential to be polite to upstreams.
    for (const h of liveOpen) {
      const r = await refreshHoldingPrice(h.assetType, h.symbol, h.currency);
      if (isQuote(r)) ok += 1;
      else fail += 1;
    }
    setRefreshing(false);
    setRefreshSummary(
      fail === 0
        ? `Updated ${ok} holding${ok === 1 ? "" : "s"}.`
        : `Updated ${ok}, ${fail} failed.`
    );
    setTimeout(() => setRefreshSummary(null), 5000);
  }

  const pnlPct =
    totals.invested > 0
      ? (totals.unrealizedPnL / totals.invested) * 100
      : 0;
  const isUp = totals.totalPnL >= 0;

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Link
        href="/"
        aria-label="Home"
        className="mb-2 -ml-3 inline-flex h-9 items-center gap-1 px-3 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={16} /> Home
      </Link>

      <div className="mb-1 flex items-center gap-2">
        <LineChart size={22} className="text-[var(--primary)]" />
        <h1 className="text-2xl font-bold">Investments</h1>
      </div>
      <p className="mb-5 text-sm text-[var(--muted-foreground)]">
        Track stocks, crypto, mutual funds and more.
      </p>

      {/* Portfolio summary */}
      {holdings.length > 0 && (
        <Card
          className="mb-4 overflow-hidden border-0 p-5 text-white shadow-xl"
          style={{
            background: isUp
              ? "linear-gradient(135deg, var(--brand-deep), var(--primary))"
              : "linear-gradient(135deg, #7f1d1d, #b91c1c)",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
            Current value
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums">
            {formatMoney(totals.currentValue, dominantCurrency)}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="tabular-nums">
              {totals.totalPnL >= 0 ? "+" : ""}
              {formatMoney(Math.abs(totals.totalPnL), dominantCurrency)}
              {totals.invested > 0 && (
                <>
                  {" "}
                  ({pnlPct >= 0 ? "+" : ""}
                  {pnlPct.toFixed(2)}%)
                </>
              )}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase tracking-wider text-white/70">
                Invested
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {formatMoney(totals.invested, dominantCurrency)}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase tracking-wider text-white/70">
                Realized P&amp;L
              </p>
              <p className="mt-0.5 font-semibold tabular-nums">
                {totals.realizedPnL >= 0 ? "+" : "-"}
                {formatMoney(Math.abs(totals.realizedPnL), dominantCurrency)}
              </p>
            </div>
          </div>
          {Object.keys(totals.byCurrency).length > 1 && (
            <p className="mt-3 text-[10px] text-white/70">
              Other currencies hold positions too — totals shown for{" "}
              {dominantCurrency}.
            </p>
          )}
        </Card>
      )}

      <Link
        href="/investments/add"
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] py-3 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm shadow-[var(--primary)]/20 transition active:scale-[0.98]"
      >
        <Plus size={18} /> New investment transaction
      </Link>

      {liveOpen.length > 0 && (
        <div className="mb-5">
          <Button
            variant="outline"
            onClick={refreshAll}
            disabled={refreshing}
            className="w-full"
          >
            <Zap size={14} className={refreshing ? "animate-pulse" : ""} />
            {refreshing
              ? `Refreshing ${liveOpen.length}...`
              : `Refresh live prices (${liveOpen.length})`}
          </Button>
          {refreshSummary && (
            <p className="mt-2 text-center text-[11px] text-[var(--muted-foreground)]">
              {refreshSummary}
            </p>
          )}
        </div>
      )}

      {/* Holdings */}
      {holdings.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
            <LineChart size={20} />
          </div>
          <p className="text-sm font-semibold">No investments yet</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Log your first buy to start tracking your portfolio.
          </p>
        </Card>
      ) : (
        <>
          {open.length > 0 && (
            <>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Open positions
              </h2>
              <div className="mb-5 space-y-2">
                {open.map((h) => (
                  <HoldingRow key={h.key} holding={h} />
                ))}
              </div>
            </>
          )}
          {closed.length > 0 && (
            <>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Closed
              </h2>
              <div className="space-y-2 opacity-70">
                {closed.map((h) => (
                  <HoldingRow key={h.key} holding={h} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function HoldingRow({
  holding,
}: {
  holding: ReturnType<typeof groupHoldings>[number];
}) {
  const slug = encodeURIComponent(holding.key);
  const open = holding.quantity > 0;
  const pnl = holding.unrealizedPnL;
  const pnlPct =
    holding.invested > 0 ? (pnl / holding.invested) * 100 : 0;
  const hasPrice = holding.currentPrice !== null;
  const up = pnl >= 0;

  return (
    <Link
      href={`/investments/holding/${slug}`}
      className="card-elev flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3 transition hover:border-[var(--primary)]/40 active:scale-[0.99]"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-deep), var(--primary))",
        }}
      >
        {holding.symbol.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{holding.symbol}</p>
          <span className="rounded bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
            {ASSET_TYPE_LABEL[holding.assetType]}
          </span>
        </div>
        <p className="truncate text-xs text-[var(--muted-foreground)]">
          {open
            ? `${holding.quantity.toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })} units · avg ${formatMoney(
                holding.avgPrice,
                holding.currency
              )}`
            : `Closed · realized ${
                holding.realizedPnL >= 0 ? "+" : "-"
              }${formatMoney(Math.abs(holding.realizedPnL), holding.currency)}`}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">
          {hasPrice && open
            ? formatMoney(holding.currentValue, holding.currency)
            : open
            ? formatMoney(holding.invested, holding.currency)
            : "—"}
        </p>
        {hasPrice && open && (
          <p
            className="text-[11px] font-semibold tabular-nums"
            style={{
              color: up ? "var(--success)" : "var(--destructive)",
            }}
          >
            {up ? "+" : "-"}
            {formatMoney(Math.abs(pnl), holding.currency)} ({pnlPct >= 0 ? "+" : ""}
            {pnlPct.toFixed(1)}%)
          </p>
        )}
        {!hasPrice && open && (
          <p className="text-[10px] text-[var(--muted-foreground)]">
            Set price
          </p>
        )}
      </div>
      <ChevronRight size={18} className="shrink-0 text-[var(--muted-foreground)]" />
    </Link>
  );
}
