"use client";

// OCR runs entirely in-browser via tesseract.js (WASM).
// First call lazy-loads the worker (~10MB, cached after that).
// No server, no API key.

export interface OcrProgress {
  stage: "loading" | "recognizing" | "done";
  progress: number; // 0..1
  message?: string;
}

export type OcrProgressCallback = (p: OcrProgress) => void;

interface RecognizeOptions {
  onProgress?: OcrProgressCallback;
  language?: string; // default "eng"
}

export async function recognizeImage(
  image: File | Blob,
  opts: RecognizeOptions = {}
): Promise<string> {
  const { onProgress, language = "eng" } = opts;
  onProgress?.({ stage: "loading", progress: 0, message: "Loading recognizer..." });

  const Tesseract = await import("tesseract.js");

  const result = await Tesseract.recognize(image, language, {
    logger: (m: { status?: string; progress?: number }) => {
      if (!onProgress) return;
      const p = m.progress ?? 0;
      if (m.status === "recognizing text") {
        onProgress({ stage: "recognizing", progress: p, message: "Reading text..." });
      } else if (m.status) {
        onProgress({ stage: "loading", progress: p, message: m.status });
      }
    },
  });

  onProgress?.({ stage: "done", progress: 1 });
  return result.data.text ?? "";
}

// ----------- Helpers: compress an image before storing -----------

// Returns a JPEG blob no wider than `maxWidth`, quality 0.8.
// Keeps OCR'able quality while keeping IndexedDB lean.
export async function compressImage(
  file: File | Blob,
  maxWidth = 1400
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
