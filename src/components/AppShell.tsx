"use client";

import { useEffect } from "react";
import { BottomNav } from "./BottomNav";
import { WelcomeDialog } from "./WelcomeDialog";
import { useSettingsStore } from "@/store/useSettingsStore";

export function AppShell({ children }: { children: React.ReactNode }) {
  const load = useSettingsStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[var(--background)]">
      <main className="flex-1 pb-28 safe-top">{children}</main>
      <BottomNav />
      <WelcomeDialog />
    </div>
  );
}
