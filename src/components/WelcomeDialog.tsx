"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { LogIn } from "lucide-react";

export function WelcomeDialog() {
  const { userName, loaded, setUserName } = useSettingsStore();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (loaded && !userName && !user) setOpen(true);
  }, [loaded, userName, user]);

  async function save() {
    const name = value.trim();
    if (!name) return;
    await setUserName(name);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="card-elev relative w-full max-w-md overflow-hidden rounded-t-3xl bg-[var(--card)] p-6 sm:rounded-3xl">
        {/* Soft brand accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 -z-0 h-40 w-40 -translate-x-1/2 rounded-full bg-[var(--primary)]/15 blur-3xl"
        />
        <div className="relative">
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl bg-[var(--primary-soft)] p-3">
              <Image
                src="/Logo.png"
                alt="Finly"
                width={120}
                height={159}
                priority
                className="h-auto w-20"
              />
            </div>
          </div>
          <h2 className="text-center text-2xl font-bold tracking-tight">Welcome to Finly</h2>
          <p className="mt-1 text-center text-sm text-[var(--muted-foreground)]">
            Voice-first money tracking. What should we call you?
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="mt-5 space-y-3"
          >
            <Input
              autoFocus
              placeholder="Your name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={40}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setUserName(" "); // dismiss without name
                  setOpen(false);
                }}
              >
                Skip
              </Button>
              <Button type="submit" className="flex-1" disabled={!value.trim()}>
                Get Started
              </Button>
            </div>
          </form>

          <div className="mt-5 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span>or sync across devices</span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--border)] text-sm font-medium transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
          >
            <LogIn size={14} /> Sign in or create account
          </Link>
        </div>
      </div>
    </div>
  );
}
