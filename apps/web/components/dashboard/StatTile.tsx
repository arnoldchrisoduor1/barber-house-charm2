"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
  change?: string;
  trend?: "up" | "down";
  color?: string;
  loading?: boolean;
  testId?: string;
}

export function StatTile({
  icon: Icon,
  label,
  value,
  subtitle,
  change,
  trend,
  color,
  loading,
  testId,
}: StatTileProps) {
  return (
    <div className="stat-tile group relative rounded-2xl bg-card/60 p-5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-glow" data-testid={testId}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {change ? (
          <span
            className={`flex items-center gap-1 rounded-full border border-border/50 bg-background/40 px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm ${
              trend === "down" ? "text-red-400" : "text-green-400"
            }`}
          >
            <ArrowUpRight className={`h-3 w-3 ${trend === "down" ? "rotate-90" : ""}`} />
            {change}
          </span>
        ) : null}
      </div>
      <p className={`mt-4 font-display text-3xl font-semibold tracking-tight ${color ?? "text-foreground"}`}>
        {loading ? "…" : value}
      </p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
      {subtitle ? <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">{subtitle}</p> : null}
    </div>
  );
}
