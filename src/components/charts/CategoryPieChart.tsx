"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getCategory } from "@/lib/categories";
import { formatMoney } from "@/lib/format";

interface Props {
  data: { categoryId: string; total: number }[];
  currency: string;
}

export function CategoryPieChart({ data, currency }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--muted-foreground)]">
        No data yet
      </div>
    );
  }

  const grand = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="categoryId"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.categoryId} fill={getCategory(entry.categoryId).color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              const cat = getCategory(p.name as string);
              const value = p.value as number;
              const pct = grand > 0 ? ((value / grand) * 100).toFixed(0) : "0";
              return (
                <div className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow">
                  <p className="text-xs font-medium">{cat.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {formatMoney(value, currency)} · {pct}%
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
