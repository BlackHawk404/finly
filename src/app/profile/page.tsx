"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { CURRENCIES, formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  Pencil,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    userName,
    profession,
    employer,
    monthlyIncome,
    monthlyIncomeCurrency,
    financialGoal,
    bio,
    currency,
    setUserName,
    setProfession,
    setEmployer,
    setMonthlyIncome,
    setMonthlyIncomeCurrency,
    setFinancialGoal,
    setBio,
  } = useSettingsStore();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local draft state — committed on Save.
  const [dName, setDName] = useState(userName);
  const [dProfession, setDProfession] = useState(profession);
  const [dEmployer, setDEmployer] = useState(employer);
  const [dIncome, setDIncome] = useState(monthlyIncome);
  const [dIncomeCurrency, setDIncomeCurrency] = useState(
    monthlyIncomeCurrency || currency
  );
  const [dGoal, setDGoal] = useState(financialGoal);
  const [dBio, setDBio] = useState(bio);

  // Sync drafts with store when leaving edit mode (or on store change).
  useEffect(() => {
    if (editing) return;
    setDName(userName);
    setDProfession(profession);
    setDEmployer(employer);
    setDIncome(monthlyIncome);
    setDIncomeCurrency(monthlyIncomeCurrency || currency);
    setDGoal(financialGoal);
    setDBio(bio);
  }, [
    editing,
    userName,
    profession,
    employer,
    monthlyIncome,
    monthlyIncomeCurrency,
    currency,
    financialGoal,
    bio,
  ]);

  const incomeNumber = useMemo(() => {
    const n = parseFloat(monthlyIncome);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [monthlyIncome]);

  const initial = (userName || "").trim().charAt(0).toUpperCase() || "?";
  const isEmpty =
    !profession && !employer && !financialGoal && !bio && !incomeNumber;

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([
        setUserName(dName),
        setProfession(dProfession),
        setEmployer(dEmployer),
        setMonthlyIncome(dIncome.trim()),
        setMonthlyIncomeCurrency(dIncomeCurrency),
        setFinancialGoal(dGoal),
        setBio(dBio),
      ]);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditing(false);
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
        <ArrowLeft size={16} /> Back
      </Button>

      {/* Header */}
      <div className="mb-5 flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-deep), var(--primary))",
          }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {userName || "Your profile"}
          </h1>
          <p className="truncate text-xs text-[var(--muted-foreground)]">
            {profession
              ? employer
                ? `${profession} · ${employer}`
                : profession
              : user
              ? user.email
              : "Local profile"}
          </p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={14} /> Edit
          </Button>
        )}
      </div>

      {!editing ? (
        // -------------------- VIEW MODE --------------------
        <div className="space-y-3">
          {isEmpty && !userName ? (
            <Card className="p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                <Sparkles size={20} />
              </div>
              <p className="text-sm font-semibold">Tell us about yourself</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Add what you do, what you earn, and what you&apos;re saving for.
              </p>
              <Button className="mt-4" onClick={() => setEditing(true)}>
                <Pencil size={14} /> Set up profile
              </Button>
            </Card>
          ) : (
            <>
              {bio && (
                <Card className="p-4">
                  <p className="text-sm leading-relaxed">{bio}</p>
                </Card>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileField
                  icon={<Briefcase size={14} />}
                  label="Profession"
                  value={profession}
                />
                <ProfileField
                  icon={<Building2 size={14} />}
                  label="Employer"
                  value={employer}
                />
              </div>

              {incomeNumber !== null && (
                <Card className="p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <Wallet size={12} /> Monthly income
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-[var(--success)]">
                    {formatMoney(
                      incomeNumber,
                      monthlyIncomeCurrency || currency
                    )}
                  </p>
                </Card>
              )}

              {financialGoal && (
                <Card className="p-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    <Target size={12} /> Financial goal
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {financialGoal}
                  </p>
                </Card>
              )}
            </>
          )}
        </div>
      ) : (
        // -------------------- EDIT MODE --------------------
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          <Card className="p-4">
            <Label htmlFor="name" className="mb-1.5 block">
              Name
            </Label>
            <Input
              id="name"
              value={dName}
              onChange={(e) => setDName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
            />
          </Card>

          <div className="grid grid-cols-1 gap-3">
            <Card className="p-4">
              <Label htmlFor="profession" className="mb-1.5 block">
                Profession
              </Label>
              <Input
                id="profession"
                value={dProfession}
                onChange={(e) => setDProfession(e.target.value)}
                placeholder="e.g. Software Engineer"
                maxLength={80}
              />
            </Card>
            <Card className="p-4">
              <Label htmlFor="employer" className="mb-1.5 block">
                Employer / company
              </Label>
              <Input
                id="employer"
                value={dEmployer}
                onChange={(e) => setDEmployer(e.target.value)}
                placeholder="e.g. Acme Inc."
                maxLength={80}
              />
            </Card>
          </div>

          <Card className="p-4">
            <Label className="mb-1.5 block">Monthly income</Label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={dIncome}
                onChange={(e) => setDIncome(e.target.value)}
              />
              <select
                value={dIncomeCurrency}
                onChange={(e) => setDIncomeCurrency(e.target.value)}
                className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--card)] px-3 text-base"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
              Used for context only; doesn&apos;t affect transactions.
            </p>
          </Card>

          <Card className="p-4">
            <Label htmlFor="goal" className="mb-1.5 block">
              Financial goal
            </Label>
            <Textarea
              id="goal"
              rows={3}
              value={dGoal}
              onChange={(e) => setDGoal(e.target.value)}
              placeholder="e.g. Save 6 months of expenses by December"
              maxLength={400}
            />
          </Card>

          <Card className="p-4">
            <Label htmlFor="bio" className="mb-1.5 block">
              Bio
            </Label>
            <Textarea
              id="bio"
              rows={3}
              value={dBio}
              onChange={(e) => setDBio(e.target.value)}
              placeholder="A short note about you."
              maxLength={400}
            />
          </Card>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={handleCancel}>
              <X size={14} /> Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : (<><Check size={14} /> Save</>)}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {icon} {label}
      </p>
      <p className="text-sm font-medium">
        {value || (
          <span className="font-normal italic text-[var(--muted-foreground)]">
            Not set
          </span>
        )}
      </p>
    </Card>
  );
}
