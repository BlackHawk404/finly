"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "./ui/Button";
import { ArrowLeft } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBack?: boolean;
}

export function AuthShell({
  title,
  subtitle,
  children,
  showBack = true,
}: AuthShellProps) {
  const router = useRouter();
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Soft brand backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% -10%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-12 -z-10 h-56 w-56 rounded-full bg-[var(--brand-bright)]/10 blur-3xl"
      />

      <div className="animate-fade-in mx-auto max-w-md px-4 pb-16 pt-6 safe-top">
        {showBack && (
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-2 -ml-3"
          >
            <ArrowLeft size={16} /> Back
          </Button>
        )}

        <div className="mt-2 flex flex-col items-center text-center">
          <div className="rounded-2xl bg-white/60 p-2 backdrop-blur-sm shadow-sm dark:bg-white/5">
            <Image
              src="/Logo.png"
              alt="Finly"
              width={120}
              height={159}
              priority
              className="h-auto w-20"
            />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1 max-w-xs text-sm text-[var(--muted-foreground)]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="card-elev mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
