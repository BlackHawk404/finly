"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Sparkles } from "lucide-react";

export function WelcomeDialog() {
  const { userName, loaded, setUserName } = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (loaded && !userName) setOpen(true);
  }, [loaded, userName]);

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
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
          <Sparkles size={22} />
        </div>
        <h2 className="text-xl font-bold">Welcome to Finly</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
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
      </div>
    </div>
  );
}
