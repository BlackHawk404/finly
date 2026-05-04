"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AuthShell } from "@/components/AuthShell";
import { UserPlus } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setError("Sync is not configured for this build.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/settings` : undefined,
      },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.replace("/settings");
    } else {
      setInfo("Check your inbox to confirm your email, then sign in.");
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save your data to the cloud and sync across devices — for free."
    >
      {!isSupabaseConfigured && (
        <Card className="mb-4 p-4 text-sm text-[var(--muted-foreground)]">
          Sync isn&apos;t configured for this build.
        </Card>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="mb-1.5 block">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="password" className="mb-1.5 block">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="rounded-md bg-[var(--destructive)]/8 px-3 py-2 text-sm text-[var(--destructive)]">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-md bg-[var(--primary-soft)] px-3 py-2 text-sm text-[var(--accent-foreground)]">
            {info}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            "Creating..."
          ) : (
            <>
              <UserPlus size={16} /> Create account
            </>
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
