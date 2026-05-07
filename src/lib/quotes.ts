"use client";

import { AssetType } from "./db";
import { setHoldingPrice } from "./investments";

export interface Quote {
  symbol: string;
  resolvedSymbol: string;
  price: number;
  previousClose: number | null;
  change: number;
  changePct: number;
  currency: string;
  asOf: string;
  source: "yahoo" | "coingecko";
}

export interface QuoteError {
  error: string;
}

// Maps our AssetType to the providers we actually support live.
export function quoteProviderFor(
  assetType: AssetType
): "yahoo" | "coingecko" | null {
  if (assetType === "stock") return "yahoo";
  if (assetType === "crypto") return "coingecko";
  return null;
}

export function isQuote(v: Quote | QuoteError): v is Quote {
  return (v as QuoteError).error === undefined;
}

export async function fetchQuote(
  assetType: AssetType,
  symbol: string,
  vsCurrency: string
): Promise<Quote | QuoteError> {
  const provider = quoteProviderFor(assetType);
  if (!provider) {
    return { error: "Live prices not supported for this asset type." };
  }
  const type = provider === "yahoo" ? "stock" : "crypto";
  const params = new URLSearchParams({
    type,
    symbol: symbol.trim(),
    vs: vsCurrency.toLowerCase(),
  });
  try {
    const res = await fetch(`/api/quote?${params.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { error: json?.error ?? `Lookup failed (${res.status}).` };
    }
    return json as Quote;
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Network error fetching quote.",
    };
  }
}

// Fetches a quote and updates the holding's stored price in one call.
// Returns the quote on success or an error object.
export async function refreshHoldingPrice(
  assetType: AssetType,
  symbol: string,
  holdingCurrency: string
): Promise<Quote | QuoteError> {
  const result = await fetchQuote(assetType, symbol, holdingCurrency);
  if (!isQuote(result)) return result;

  // Currency sanity: if the API returned a different currency than the
  // holding's lots, refuse to overwrite — the math would mix units.
  if (
    result.currency.toUpperCase() !== holdingCurrency.toUpperCase()
  ) {
    return {
      error: `Live price came back in ${result.currency}, but this holding is tracked in ${holdingCurrency}. Update your lots' currency to match, or set the price manually.`,
    };
  }

  await setHoldingPrice(assetType, symbol, result.price, result.currency);
  return result;
}
