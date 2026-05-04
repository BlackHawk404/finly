"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, UserPlus } from "lucide-react";
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
      // Email confirmation disabled — already signed in.
      router.replace("/settings");
    } else {
      setInfo("Check your inbox to confirm your email, then sign in.");
    }
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
        <ArrowLeft size={16} /> Back
      </Button>

      <div className="mb-5 flex flex-col items-center text-center">
        <Image
          src="/Logo.png"
          alt="Finly"
          width={120}
          height={159}
          priority
          className="mb-3 h-auto w-20"
        />
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="text-xs text-[var(--muted-foreground)]">
          Save your data to the cloud and sync everywhere.
        </p>
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
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            At least 6 characters.
          </p>
        </div>

        {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
        {info && (
          <Card className="p-3 text-sm">
            {info}
          </Card>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Creating..." : (<><UserPlus size={16} /> Create account</>)}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
