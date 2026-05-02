"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KhataForm } from "@/components/KhataForm";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

function AddKhataInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const personName = searchParams.get("person") ?? undefined;
  const type = searchParams.get("type") as "lent" | "borrowed" | null;

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
        <ArrowLeft size={16} /> Back
      </Button>
      <h1 className="mb-4 text-2xl font-bold">New Khata Entry</h1>
      <KhataForm
        defaultPersonName={personName}
        initial={type ? { type } : undefined}
      />
    </div>
  );
}

export default function AddKhataPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-6">Loading...</div>}>
      <AddKhataInner />
    </Suspense>
  );
}
