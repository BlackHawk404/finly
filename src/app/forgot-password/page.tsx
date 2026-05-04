"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, Mail } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getSupabase();
    if (!supabase) {
      setError("Sync is not configured for this build.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo:
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="animate-fade-in px-4 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-3">
        <ArrowLeft size={16} /> Back
      </Button>

      <h1 className="mb-1 text-2xl font-bold">Reset password</h1>
      <p className="mb-5 text-sm text-[var(--muted-foreground)]">
        We&apos;ll send you a link to set a new password.
      </p>

      {sent ? (
        <Card className="p-4 text-sm">
          If an account exists for that email, a reset link is on its way. Check
          your inbox.
        </Card>
      ) : (
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

          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Sending..." : (<><Mail size={16} /> Send reset link</>)}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        <Link
          href="/login"
          className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
