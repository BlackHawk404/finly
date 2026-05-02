"use client";

import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryIconProps {
  icon: string;
  color?: string;
  size?: number;
  className?: string;
}

export function CategoryIcon({ icon, color, size = 20, className }: CategoryIconProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LucideIcon = (Icons as any)[icon] as React.ComponentType<LucideProps> | undefined;
  const Final = LucideIcon ?? Icons.Wallet;
  return <Final size={size} color={color} className={className} strokeWidth={2} />;
}

export function CategoryBadge({
  icon,
  color,
  size = 40,
  className,
}: CategoryIconProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full shrink-0",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color ? `${color}22` : "var(--muted)",
      }}
    >
      <CategoryIcon icon={icon} color={color} size={Math.round(size * 0.5)} />
    </div>
  );
}
