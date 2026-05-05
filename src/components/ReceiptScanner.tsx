"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, RotateCcw, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ReceiptScannerProps {
  onCaptured: (blob: Blob) => void;
  /** Optional: when present, shows the existing image as the preview. */
  existingBlob?: Blob | null;
}

// Returns a JPEG blob no wider than `maxWidth`, quality 0.85.
// Keeps storage lean while preserving readable detail.
async function compressImage(file: File | Blob, maxWidth = 1400): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    ctx.drawImage(img, 0, 0, w, h);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.85
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ReceiptScanner({ onCaptured, existingBlob }: ReceiptScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync preview to the latest blob (existing or freshly captured).
  useEffect(() => {
    if (!existingBlob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(existingBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [existingBlob]);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image.");
      return;
    }
    setError(null);
    try {
      const compressed = await compressImage(file);
      onCaptured(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image.");
    }
  }

  function reset() {
    setError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    onCaptured(new Blob()); // signal "removed" with empty blob — caller decides
  }

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
          <p className="text-base font-semibold">Capture a bill</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            We&apos;ll save the image with this expense so you can view it later.
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
            Image stays on your device.
          </p>
        </Card>
      )}

      {previewUrl && (
        <Card className="overflow-hidden p-0">
          <div className="bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Bill preview"
              className="h-auto max-h-[55vh] w-full object-contain"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            <Button
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
            >
              <ImagePlus size={14} /> Replace
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw size={14} /> Remove
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
