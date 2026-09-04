"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  onChange?: (value: number) => void;
  className?: string;
}

export function StarRating({ value, max = 5, size = "md", onChange, className }: StarRatingProps) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        return (
          <button
            key={i}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(i + 1)}
            className={cn(
              onChange
                ? "inline-flex h-11 w-11 items-center justify-center cursor-pointer hover:scale-110 transition"
                : "inline-flex items-center justify-center",
            )}
            aria-label={onChange ? `${i + 1} star${i === 0 ? "" : "s"}` : undefined}
          >
            <Star
              className={cn(iconClass, filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
            />
          </button>
        );
      })}
    </div>
  );
}
