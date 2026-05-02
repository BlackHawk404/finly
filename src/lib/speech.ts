"use client";

// Minimal Web Speech API wrapper. Works on Chrome/Edge desktop, Safari iOS 14.5+,
// and Chrome on Android. Falls back gracefully when unsupported.

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

export type SpeechErrorCode =
  | "not-supported"
  | "permission-denied"
  | "no-speech"
  | "aborted"
  | "audio-capture"
  | "network"
  | "unknown";

export interface SpeechController {
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface StartOptions {
  language?: string;
  onResult: (r: SpeechRecognitionResult) => void;
  onError: (code: SpeechErrorCode, message?: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export function createRecognition(opts: StartOptions): SpeechController | null {
  if (!isSpeechSupported()) {
    opts.onError("not-supported");
    return null;
  }

  const SR =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SR();
  recognition.lang = opts.language ?? "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      if (result.isFinal) finalText += transcript;
      else interim += transcript;
    }
    if (finalText) opts.onResult({ transcript: finalText, isFinal: true });
    if (interim) opts.onResult({ transcript: interim, isFinal: false });
  };

  recognition.onerror = (event: any) => {
    const code: SpeechErrorCode = (() => {
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          return "permission-denied";
        case "no-speech":
          return "no-speech";
        case "aborted":
          return "aborted";
        case "audio-capture":
          return "audio-capture";
        case "network":
          return "network";
        default:
          return "unknown";
      }
    })();
    opts.onError(code, event.message);
  };

  recognition.onstart = () => opts.onStart?.();
  recognition.onend = () => opts.onEnd?.();

  return {
    start: () => {
      try {
        recognition.start();
      } catch (e) {
        // Some browsers throw if start() is called twice
        console.warn("recognition.start() failed", e);
      }
    },
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}
