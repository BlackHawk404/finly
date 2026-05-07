"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, Investment } from "@/lib/db";
import { InvestmentForm } from "@/components/InvestmentForm";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export default function EditInvestmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [inv, setInv] = useState<Investment | null | undefined>(undefined);

  useEffect(() => {
    db.investments.get(id).then((i) => setInv(i ?? null));
  }, [id]);

  if (inv === undefined) {
    return (
      <div className="px-4 pt-6">
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }
  if (inv === null) {
    return (
      <div className="px-4 pt-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
          <ArrowLeft size={16} /> Back
        </Button>
        <p className="text-sm text-[var(--muted-foreground)]">Not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
        <ArrowLeft size={16} /> Back
      </Button>
      <h1 className="mb-4 text-2xl font-bold">Edit transaction</h1>
      <InvestmentForm
        editId={inv.id}
        initial={{
          assetType: inv.assetType,
          symbol: inv.symbol,
          name: inv.name,
          side: inv.side,
          quantity: inv.quantity,
          pricePerUnit: inv.pricePerUnit,
          fees: inv.fees,
          currency: inv.currency,
          date: inv.date,
          notes: inv.notes,
        }}
      />
    </div>
  );
}
