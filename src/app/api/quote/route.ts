// Live quote proxy.
// - type=stock  → Yahoo Finance (free, ~15 min delayed, unofficial)
// - type=crypto → CoinGecko (free, no key)
//
// Server-side fetch sidesteps Yahoo's CORS block. 60s in-memory cache per
// (type, symbol, vs) protects upstream from spam during page loads.

import { NextRequest } from "next/server";

export const dynamic = "force-dynamic"; // never cache the response edge-side

interface CacheEntry {
  value: unknown;
  expires: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

interface CoingeckoListItem {
  id: string;
  symbol: string;
  market_cap_rank: number | null;
}

let cgMapPromise: Promise<Map<string, string>> | null = null;
let cgMapExpires = 0;

async function getCoingeckoMap(): Promise<Map<string, string>> {
  if (cgMapPromise && cgMapExpires > Date.now()) return cgMapPromise;
  cgMapPromise = (async () => {
    const url =
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false";
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`CoinGecko list ${res.status}`);
    const data = (await res.json()) as CoingeckoListItem[];
    const map = new Map<string, string>();
    for (const coin of data) {
      const sym = (coin.symbol || "").toLowerCase();
      if (sym && !map.has(sym)) map.set(sym, coin.id);
    }
    return map;
  })();
  cgMapExpires = Date.now() + 24 * 60 * 60 * 1000;
  // If the request fails, allow retry next call.
  cgMapPromise.catch(() => {
    cgMapPromise = null;
    cgMapExpires = 0;
  });
  return cgMapPromise;
}

interface QuoteResponse {
  symbol: string;
  resolvedSymbol: string; // what we actually queried (e.g. HBL.KA)
  price: number;
  previousClose: number | null;
  change: number;
  changePct: number;
  currency: string;
  asOf: string;
  source: "yahoo" | "coingecko";
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type"); // 'stock' | 'crypto'
  const rawSymbol = (sp.get("symbol") ?? "").trim();
  const vs = (sp.get("vs") ?? "usd").toLowerCase();

  if (!type || !rawSymbol) {
    return Response.json(
      { error: "Missing 'type' or 'symbol' query param." },
      { status: 400 }
    );
  }

  const cacheKey = `${type}:${rawSymbol.toUpperCase()}:${vs}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return Response.json(cached.value);
  }

  try {
    if (type === "stock") {
      const value = await fetchYahoo(rawSymbol);
      cache.set(cacheKey, { value, expires: Date.now() + CACHE_TTL_MS });
      return Response.json(value);
    }
    if (type === "crypto") {
      const value = await fetchCoinGecko(rawSymbol, vs);
      cache.set(cacheKey, { value, expires: Date.now() + CACHE_TTL_MS });
      return Response.json(value);
    }
    return Response.json(
      { error: "Unsupported type. Use 'stock' or 'crypto'." },
      { status: 400 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Quote lookup failed.";
    return Response.json({ error: msg }, { status: 502 });
  }
}

// ----------------- Yahoo Finance (stocks) -----------------

async function fetchYahoo(rawSymbol: string): Promise<QuoteResponse> {
  // PSX symbols on Yahoo use the .KA suffix. If the user typed a bare ticker
  // with no exchange suffix, default to PSX. Other markets need the suffix
  // explicitly (AAPL, AAPL.NS, etc.).
  const upper = rawSymbol.trim().toUpperCase();
  const resolvedSymbol = upper.includes(".") ? upper : `${upper}.KA`;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    resolvedSymbol
  )}?interval=1d&range=5d`;

  const r = await fetch(url, {
    headers: {
      // Yahoo returns 401/403 to default fetch UA — pretend to be a browser.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      Accept: "application/json,text/plain,*/*",
    },
    cache: "no-store",
  });
  if (!r.ok) {
    throw new Error(`Yahoo Finance returned ${r.status}.`);
  }
  const j = (await r.json()) as {
    chart?: {
      result?: Array<{
        meta: {
          symbol: string;
          regularMarketPrice?: number;
          previousClose?: number;
          chartPreviousClose?: number;
          regularMarketTime?: number;
          currency?: string;
        };
      }>;
      error?: { description?: string };
    };
  };

  if (j.chart?.error) {
    throw new Error(j.chart.error.description ?? "Symbol not found.");
  }
  const meta = j.chart?.result?.[0]?.meta;
  if (!meta || meta.regularMarketPrice == null) {
    throw new Error(`No data for ${resolvedSymbol}.`);
  }

  const price = meta.regularMarketPrice;
  const prev = meta.previousClose ?? meta.chartPreviousClose ?? null;
  const change = prev !== null ? price - prev : 0;
  const changePct = prev ? (change / prev) * 100 : 0;
  const asOf = new Date(
    (meta.regularMarketTime ?? Date.now() / 1000) * 1000
  ).toISOString();

  return {
    symbol: rawSymbol.toUpperCase(),
    resolvedSymbol: meta.symbol ?? resolvedSymbol,
    price,
    previousClose: prev,
    change,
    changePct,
    currency: meta.currency ?? "USD",
    asOf,
    source: "yahoo",
  };
}

// ----------------- CoinGecko (crypto) -----------------

async function fetchCoinGecko(
  rawSymbol: string,
  vs: string
): Promise<QuoteResponse> {
  // Resolve ticker (e.g. BTC) to CoinGecko id (bitcoin). Top-250 by market
  // cap is enough for almost everyone. If it's already a known id like
  // "bitcoin" we'll find it as the symbol "btc" → id "bitcoin"; otherwise
  // pass the raw value through as a last-resort id guess.
  const map = await getCoingeckoMap();
  const lower = rawSymbol.toLowerCase();
  const id = map.get(lower) ?? lower;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    id
  )}&vs_currencies=${encodeURIComponent(
    vs
  )}&include_24hr_change=true&include_last_updated_at=true`;
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`CoinGecko returned ${r.status}.`);
  const j = (await r.json()) as Record<
    string,
    Record<string, number> & { last_updated_at?: number }
  >;
  const slot = j[id];
  if (!slot || slot[vs] == null) {
    throw new Error(`No CoinGecko data for ${rawSymbol.toUpperCase()}.`);
  }

  const price = slot[vs] as number;
  const changePct = (slot[`${vs}_24h_change`] as number) ?? 0;
  const change = (price * changePct) / 100;
  const asOf = new Date(
    (slot.last_updated_at ?? Date.now() / 1000) * 1000
  ).toISOString();

  return {
    symbol: rawSymbol.toUpperCase(),
    resolvedSymbol: id,
    price,
    previousClose: price - change,
    change,
    changePct,
    currency: vs.toUpperCase(),
    asOf,
    source: "coingecko",
  };
}
