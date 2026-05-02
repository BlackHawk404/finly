"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, KhataEntry } from "@/lib/db";
import { KhataForm } from "@/components/KhataForm";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export default function EditKhataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [entry, setEntry] = useState<KhataEntry | null | undefined>(undefined);

  useEffect(() => {
    db.khata.get(id).then((e) => setEntry(e ?? null));
  }, [id]);

  if (entry === undefined) {
    return (
      <div className="px-4 pt-6">
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="px-4 pt-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
          <ArrowLeft size={16} /> Back
        </Button>
        <h1 className="text-2xl font-bold">Not found</h1>
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
        <ArrowLeft size={16} /> Back
      </Button>
      <h1 className="mb-4 text-2xl font-bold">Edit Khata Entry</h1>
      <KhataForm
        editId={entry.id}
        initial={{
          type: entry.type,
          personName: entry.personName,
          amount: entry.amount,
          currency: entry.currency,
          date: entry.date,
          description: entry.description,
        }}
      />
    </div>
  );
}
