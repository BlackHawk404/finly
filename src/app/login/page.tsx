"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, LogIn, Sparkles } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabase();
    if (!supabase) {
      setError("Sync is not configured for this build.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/settings");
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
        <ArrowLeft size={16} /> Back
      </Button>

      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
          <Sparkles size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Sync your data across devices.
          </p>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <Card className="mb-4 p-4 text-sm text-[var(--muted-foreground)]">
          Sync isn&apos;t configured for this build.
        </Card>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="mb-2 block">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="password" className="mb-2 block">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Link
            href="/forgot-password"
            className="mt-2 inline-block text-xs text-[var(--muted-foreground)] underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Signing in..." : (<><LogIn size={16} /> Sign in</>)}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
