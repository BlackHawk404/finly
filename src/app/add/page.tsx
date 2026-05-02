"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExpenseForm } from "@/components/ExpenseForm";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Pencil, Mic, Sparkles, AlertCircle, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseExpense, ParsedExpense } from "@/lib/parser";
import { useSettingsStore } from "@/store/useSettingsStore";
import { PaymentMethod, TxType } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Mode = "manual" | "voice";

function AddPageInner() {
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") as Mode) ?? "manual";
  const initialType = (searchParams.get("type") as TxType) ?? "expense";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [type, setType] = useState<TxType>(initialType);

  const { currency, defaultPaymentMethod } = useSettingsStore();
  const [transcript, setTranscript] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);

  function handleTranscript(text: string) {
    const result = parseExpense(text, {
      currency,
      paymentMethod: defaultPaymentMethod as PaymentMethod,
      type,
    });
    setTranscript(text);
    setParsed(result);
  }

  function resetVoice() {
    setTranscript(null);
    setParsed(null);
  }

  function switchType(t: TxType) {
    setType(t);
    resetVoice();
  }

  const accent = type === "income" ? "var(--success)" : "var(--primary)";

  return (
    <div className="animate-fade-in px-4 pt-6">
      <h1 className="mb-4 text-2xl font-bold">
        {type === "income" ? "Add Income" : "Add Expense"}
      </h1>

      {/* Type toggle: Expense / Income */}
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-[var(--radius)] bg-[var(--secondary)] p-1">
        <button
          onClick={() => switchType("expense")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] py-2 text-sm font-medium transition",
            type === "expense"
              ? "bg-[var(--card)] text-[var(--primary)] shadow"
              : "text-[var(--muted-foreground)]"
          )}
        >
          <ArrowDownCircle size={16} /> Expense
        </button>
        <button
          onClick={() => switchType("income")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] py-2 text-sm font-medium transition",
            type === "income"
              ? "bg-[var(--card)] text-[var(--success)] shadow"
              : "text-[var(--muted-foreground)]"
          )}
        >
          <ArrowUpCircle size={16} /> Income
        </button>
      </div>

      {/* Mode toggle: Type / Speak */}
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-[var(--radius)] bg-[var(--secondary)] p-1">
        <button
          onClick={() => {
            setMode("manual");
            resetVoice();
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] py-2 text-sm font-medium transition",
            mode === "manual"
              ? "bg-[var(--card)] text-[var(--foreground)] shadow"
              : "text-[var(--muted-foreground)]"
          )}
        >
          <Pencil size={16} /> Type
        </button>
        <button
          onClick={() => setMode("voice")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] py-2 text-sm font-medium transition",
            mode === "voice"
              ? "bg-[var(--card)] text-[var(--foreground)] shadow"
              : "text-[var(--muted-foreground)]"
          )}
        >
          <Mic size={16} /> Speak
        </button>
      </div>

      {mode === "manual" && <ExpenseForm type={type} />}

      {mode === "voice" && !parsed && (
        <VoiceRecorder onTranscript={handleTranscript} />
      )}

      {mode === "voice" && parsed && transcript && (
        <div className="space-y-4">
          {/* Transcript card */}
          <Card
            className="p-4"
            style={{ borderColor: `${accent}40`, background: `color-mix(in srgb, ${accent} 8%, transparent)` }}
          >
            <p
              className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"
              style={{ color: accent }}
            >
              <Sparkles size={12} /> You said
            </p>
            <p className="text-sm italic leading-relaxed">&ldquo;{transcript}&rdquo;</p>
          </Card>

          {!parsed.confidence.amount && (
            <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/10 p-3">
              <p className="flex items-start gap-2 text-xs">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" />
                I couldn&apos;t detect an amount. Please enter it below.
              </p>
            </Card>
          )}

          <div>
            <p className="mb-3 text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              Review and save
            </p>
            <ExpenseForm
              type={type}
              source="voice"
              rawTranscript={transcript}
              initial={{
                amount: parsed.amount ?? undefined,
                currency: parsed.currency ?? currency,
                categoryId: parsed.categoryId,
                description: parsed.description,
                date: parsed.date,
                paymentMethod: parsed.paymentMethod,
              }}
            />
          </div>

          <Button variant="ghost" onClick={resetVoice} className="w-full">
            Re-record
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AddPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-6">Loading...</div>}>
      <AddPageInner />
    </Suspense>
  );
}
