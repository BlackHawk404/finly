"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { CURRENCIES } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { exportExpensesAsCSV, clearAllData } from "@/lib/export";
import { Download, Trash2 } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
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
        Finly v0.1 · All data stored locally on this device.
      </p>
    </div>
  );
}
