"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, RotateCcw, ScanLine, Sparkles } from "lucide-react";
import { compressImage, recognizeImage, OcrProgress } from "@/lib/ocr";
import { parseReceipt, ParsedReceipt } from "@/lib/receipt-parser";
import { useSettingsStore } from "@/store/useSettingsStore";
import { PaymentMethod, TxType } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ReceiptScannerProps {
  type: TxType;
  onParsed: (result: { parsed: ParsedReceipt; blob: Blob; rawText: string }) => void;
}

export function ReceiptScanner({ type, onParsed }: ReceiptScannerProps) {
  const { currency, defaultPaymentMethod } = useSettingsStore();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image.");
      return;
    }
    setError(null);
    setProgress({ stage: "loading", progress: 0, message: "Preparing image..." });

    try {
      const compressed = await compressImage(file);
      const url = URL.createObjectURL(compressed);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });

      const text = await recognizeImage(compressed, {
        onProgress: (p) => setProgress(p),
      });

      const parsed = parseReceipt(text, {
        currency,
        paymentMethod: defaultPaymentMethod as PaymentMethod,
        type,
      });

      setProgress({ stage: "done", progress: 1 });
      onParsed({ parsed, blob: compressed, rawText: text });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read receipt.");
      setProgress(null);
    }
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setProgress(null);
    setError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  const isWorking =
    progress !== null && progress.stage !== "done" && previewUrl !== null;

  return (
    <div className="space-y-4">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!previewUrl && (
        <Card className="p-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
            <ScanLine size={26} />
          </div>
          <p className="text-base font-semibold">Scan a receipt</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            We&apos;ll read the total, date, and merchant — you confirm before saving.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              className="h-12"
            >
              <Camera size={16} /> Camera
            </Button>
            <Button
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
              className="h-12"
            >
              <ImagePlus size={16} /> Gallery
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">
            Image stays on your device. Recognition runs offline after first load.
          </p>
        </Card>
      )}

      {previewUrl && (
        <Card className="overflow-hidden p-0">
          <div className="relative bg-black">
            {/* Preview — blob URL, plain img is correct */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="h-auto max-h-[60vh] w-full object-contain"
            />
            {/* Scanning overlay */}
            {isWorking && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="rounded-2xl bg-[var(--card)] px-4 py-3 text-center shadow-xl">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles size={14} className="animate-pulse text-[var(--primary)]" />
                    {progress?.message ?? "Reading..."}
                  </div>
                  <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-[var(--secondary)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all"
                      style={{ width: `${Math.round((progress?.progress ?? 0) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-3">
            <Button variant="ghost" onClick={reset} className="w-full">
              <RotateCcw size={14} /> Choose another
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/8 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}
    </div>
  );
}
