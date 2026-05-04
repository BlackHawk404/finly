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
      <div className="w-full max-w-md rounded-t-2xl bg-[var(--card)] p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex justify-center">
          <Image
            src="/Logo.png"
            alt="Finly"
            width={120}
            height={159}
            priority
            className="h-auto w-24"
          />
        </div>
        <h2 className="text-center text-xl font-bold">Welcome</h2>
        <p className="mt-1 text-center text-sm text-[var(--muted-foreground)]">
          What should we call you? You can change this anytime in Settings.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="mt-4 space-y-3"
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
                setUserName(" "); // mark as dismissed without name
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

        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span>or sync across devices</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <Link
          href="/login"
          onClick={() => setOpen(false)}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--border)] text-sm font-medium hover:bg-[var(--accent)]"
        >
          <LogIn size={14} /> Sign in or create account
        </Link>
      </div>
    </div>
  );
}
