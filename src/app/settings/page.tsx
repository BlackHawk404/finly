"use client";

import Link from "next/link";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { CURRENCIES } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { exportExpensesAsCSV, clearAllData } from "@/lib/export";
import { runSync } from "@/lib/sync";
import {
  Cloud,
  CloudOff,
  Download,
  LogIn,
  LogOut,
  RefreshCw,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      await runSync();
      setSyncMsg("Synced.");
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 3000);
    }
  }

  const {
    currency,
    setCurrency,
    defaultPaymentMethod,
    setDefaultPaymentMethod,
    language,
    setLanguage,
    userName,
    setUserName,
  } = useSettingsStore();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName?.trim() ?? "");

  async function handleClear() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      setTimeout(() => setConfirmingClear(false), 4000);
      return;
    }
    await clearAllData();
    setConfirmingClear(false);
    alert("All data cleared.");
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Account
      </h2>

      {user ? (
        <Card className="mb-6 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--success)]/10 text-[var(--success)]">
              <Cloud size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.email}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Signed in · syncing to cloud
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
              className="w-full"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync now"}
            </Button>
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut size={14} /> Sign out
            </Button>
          </div>
          {syncMsg && (
            <p className="mt-2 text-center text-xs text-[var(--muted-foreground)]">
              {syncMsg}
            </p>
          )}
        </Card>
      ) : (
        <Card className="mb-6 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--muted-foreground)]">
              <CloudOff size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Local only</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Sign in to sync across devices.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--border)] text-sm font-medium hover:bg-[var(--accent)]"
            >
              <LogIn size={14} /> Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
            >
              <UserPlus size={14} /> Sign up
            </Link>
          </div>
        </Card>
      )}

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Profile
      </h2>

      <Card className="mb-6 p-4">
        <Label className="mb-2 block">Your Name</Label>
        <div className="flex gap-2">
          <Input
            placeholder="What should we call you?"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={40}
          />
          <Button
            onClick={() => setUserName(nameDraft)}
            disabled={nameDraft.trim() === (userName?.trim() ?? "")}
          >
            Save
          </Button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Used to personalize the greeting on the home screen.
        </p>
      </Card>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Preferences
      </h2>

      <Card className="mb-3 p-4">
        <Label className="mb-2 block">Currency</Label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--card)] px-3 text-base"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.name} ({c.code})
            </option>
          ))}
        </select>
      </Card>

      <Card className="mb-3 p-4">
        <Label className="mb-2 block">Default Payment Method</Label>
        <select
          value={defaultPaymentMethod}
          onChange={(e) => setDefaultPaymentMethod(e.target.value)}
          className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--card)] px-3 text-base"
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
          <option value="bank">Bank Transfer</option>
          <option value="other">Other</option>
        </select>
      </Card>

      <Card className="mb-6 p-4">
        <Label className="mb-2 block">Voice Recognition Language</Label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--card)] px-3 text-base"
        >
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="en-IN">English (India)</option>
          <option value="hi-IN">Hindi</option>
          <option value="ur-PK">Urdu</option>
          <option value="es-ES">Spanish</option>
          <option value="fr-FR">French</option>
          <option value="de-DE">German</option>
          <option value="ar-SA">Arabic</option>
        </select>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Used by your browser&apos;s built-in speech recognition.
        </p>
      </Card>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Data
      </h2>

      <Card className="mb-3 p-4">
        <p className="mb-2 text-sm font-medium">Export to CSV</p>
        <p className="mb-3 text-xs text-[var(--muted-foreground)]">
          Download all your expenses as a spreadsheet. Useful for backups.
        </p>
        <Button variant="outline" onClick={exportExpensesAsCSV} className="w-full">
          <Download size={16} /> Download CSV
        </Button>
      </Card>

      <Card className="mb-3 border-[var(--destructive)]/30 p-4">
        <p className="mb-2 text-sm font-medium text-[var(--destructive)]">
          Clear All Data
        </p>
        <p className="mb-3 text-xs text-[var(--muted-foreground)]">
          Permanently delete every expense and budget on this device. This cannot be undone.
        </p>
        <Button variant="destructive" onClick={handleClear} className="w-full">
          <Trash2 size={16} />
          {confirmingClear ? "Tap again to confirm" : "Clear all data"}
        </Button>
      </Card>

      <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
        Finly v0.2 · {user ? "Synced to cloud" : "Local only"}
      </p>
    </div>
  );
}
