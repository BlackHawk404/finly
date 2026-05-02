"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, AlertCircle } from "lucide-react";
import {
  createRecognition,
  isSpeechSupported,
  SpeechController,
  SpeechErrorCode,
} from "@/lib/speech";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onTranscript: (final: string) => void;
}

export function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const language = useSettingsStore((s) => s.language);
  const [supported, setSupported] = useState<boolean>(true);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const controllerRef = useRef<SpeechController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSupported(isSpeechSupported());
  }, []);

  useEffect(() => () => {
    controllerRef.current?.abort();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function errorMessage(code: SpeechErrorCode): string {
    switch (code) {
      case "not-supported":
        return "Voice input isn't supported in this browser. Try Chrome, Edge, or Safari (iOS 14.5+).";
      case "permission-denied":
        return "Microphone permission was denied. Enable it in your browser settings.";
      case "no-speech":
        return "I didn't hear anything. Try again and speak clearly.";
      case "audio-capture":
        return "No microphone detected.";
      case "network":
        return "Network error. Speech recognition needs an internet connection.";
      case "aborted":
        return "";
      default:
        return "Something went wrong. Try again.";
    }
  }

  function start() {
    setError(null);
    setFinalText("");
    setInterim("");
    setSeconds(0);

    const controller = createRecognition({
      language,
      onResult: ({ transcript, isFinal }) => {
        if (isFinal) {
          setFinalText((prev) => (prev + " " + transcript).trim());
          setInterim("");
        } else {
          setInterim(transcript);
        }
      },
      onError: (code) => {
        const msg = errorMessage(code);
        if (msg) setError(msg);
      },
      onStart: () => {
        setRecording(true);
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      },
      onEnd: () => {
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      },
    });
    if (controller) {
      controllerRef.current = controller;
      controller.start();
    }
  }

  function stop() {
    controllerRef.current?.stop();
  }

  function reset() {
    setFinalText("");
    setInterim("");
    setError(null);
    setSeconds(0);
  }

  function confirm() {
    const text = (finalText + " " + interim).trim();
    if (text) onTranscript(text);
  }

  const transcript = (finalText + " " + interim).trim();

  if (!supported) {
    return (
      <Card className="p-5 text-center">
        <AlertCircle className="mx-auto mb-2 text-[var(--warning)]" size={28} />
        <p className="text-sm font-medium">Voice input not supported</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Use Chrome, Edge, or Safari (iOS 14.5+) — or switch to typing.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mic + waveform */}
      <Card className="flex flex-col items-center gap-4 p-8">
        <button
          onClick={recording ? stop : start}
          aria-label={recording ? "Stop recording" : "Start recording"}
          className={cn(
            "flex h-24 w-24 items-center justify-center rounded-full text-white transition-transform active:scale-95",
            recording
              ? "bg-[var(--destructive)] animate-record-pulse"
              : "bg-[var(--primary)] shadow-lg shadow-[var(--primary)]/30"
          )}
        >
          {recording ? <Square size={32} fill="currentColor" /> : <Mic size={36} />}
        </button>

        <div className="text-center">
          {recording ? (
            <>
              <p className="text-sm font-medium text-[var(--destructive)]">
                ● Listening...
              </p>
              <p className="font-mono text-xs text-[var(--muted-foreground)]">
                {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}
              </p>
            </>
          ) : transcript ? (
            <p className="text-sm text-[var(--muted-foreground)]">Tap mic to re-record</p>
          ) : (
            <>
              <p className="text-sm font-medium">Tap to speak</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                e.g. &quot;Spent 250 on groceries yesterday with card&quot;
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Transcript preview */}
      {transcript && (
        <Card className="p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Transcript
          </p>
          <p className="text-sm leading-relaxed">
            {finalText}
            {interim && (
              <span className="text-[var(--muted-foreground)]"> {interim}</span>
            )}
          </p>
        </Card>
      )}

      {error && (
        <Card className="border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-4">
          <p className="flex items-start gap-2 text-sm text-[var(--destructive)]">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
        </Card>
      )}

      {transcript && !recording && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={reset} className="flex-1">
            <RotateCcw size={16} /> Restart
          </Button>
          <Button type="button" onClick={confirm} className="flex-1">
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
