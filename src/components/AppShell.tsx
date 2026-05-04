"use client";

import { useEffect } from "react";
import { BottomNav } from "./BottomNav";
import { WelcomeDialog } from "./WelcomeDialog";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { startSyncWatcher } from "@/lib/sync";

export function AppShell({ children }: { children: React.ReactNode }) {
  const load = useSettingsStore((s) => s.load);
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    load();
    initAuth();
    const stop = startSyncWatcher();
    return stop;
  }, [load, initAuth]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[var(--background)]">
      <main className="flex-1 pb-28 safe-top">{children}</main>
      <BottomNav />
      <WelcomeDialog />
    </div>
  );
}
