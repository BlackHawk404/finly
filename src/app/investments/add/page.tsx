"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InvestmentForm } from "@/components/InvestmentForm";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { AssetType, InvestmentSide } from "@/lib/db";

function AddInvestmentInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const symbol = sp.get("symbol") ?? undefined;
  const assetType = (sp.get("assetType") as AssetType) ?? undefined;
  const side = (sp.get("side") as InvestmentSide) ?? undefined;
  const name = sp.get("name") ?? undefined;
  const currency = sp.get("currency") ?? undefined;

  const initial =
    symbol || assetType || side || name || currency
      ? { symbol, assetType, side, name, currency }
      : undefined;

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
        <ArrowLeft size={16} /> Back
      </Button>
      <h1 className="mb-4 text-2xl font-bold">New investment transaction</h1>
      <InvestmentForm initial={initial} />
    </div>
  );
}

export default function AddInvestmentPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-6">Loading...</div>}>
      <AddInvestmentInner />
    </Suspense>
  );
}
