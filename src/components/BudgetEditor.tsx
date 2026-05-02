"use client";

import { useState } from "react";
import { CategoryDef } from "@/lib/categories";
import { CategoryBadge } from "./CategoryIcon";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { setBudget } from "@/lib/budgets";
import { formatMoney, getCurrencySymbol } from "@/lib/format";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Card } from "./ui/Card";
import { Pencil, X } from "lucide-react";

interface Props {
  category: CategoryDef;
  spent: number;
  limit: number; // 0 = no budget
}

export function BudgetEditor({ category, spent, limit }: Props) {
  const currency = useSettingsStore((s) => s.currency);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(limit || ""));

  async function save() {
    const num = parseFloat(value || "0");
    await setBudget(category.id, isNaN(num) ? 0 : num);
    setEditing(false);
  }

  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const overBudget = limit > 0 && spent > limit;

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <CategoryBadge icon={category.icon} color={category.color} size={36} />
        <div className="flex-1">
          <p className="text-sm font-medium">{category.name}</p>
          {limit > 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              {formatMoney(spent, currency)} / {formatMoney(limit, currency)}
            </p>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">
              Spent {formatMoney(spent, currency)} · No budget
            </p>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit budget"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {limit > 0 && !editing && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--secondary)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: overBudget ? "var(--destructive)" : category.color,
            }}
          />
        </div>
      )}

      {editing && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-[var(--muted-foreground)]">
            {getCurrencySymbol(currency)}
          </span>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Monthly budget"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <Button size="sm" onClick={save}>
            Save
          </Button>
          <button
            onClick={() => setEditing(false)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </Card>
  );
}
