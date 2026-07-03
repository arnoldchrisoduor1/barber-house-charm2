"use client";

import { Star, TrendingUp } from "lucide-react";

import { formatKES } from "@/lib/format";

export interface StaffLeaderboardEntry {
  name: string;
  revenue: number;
  bookings: number;
  rating: number;
}

interface StaffLeaderboardProps {
  data: StaffLeaderboardEntry[];
}

export function StaffLeaderboard({ data }: StaffLeaderboardProps) {
  return (
    <div className="space-y-3" data-testid="staff-leaderboard">
      {data.slice(0, 5).map((staff, i) => (
        <div key={`${staff.name}-${i}`} className="flex items-center gap-3">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i === 0
                ? "bg-primary/20 text-primary"
                : i === 1
                  ? "bg-muted text-muted-foreground"
                  : "bg-secondary text-secondary-foreground"
            }`}
          >
            {i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{staff.name}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {formatKES(staff.revenue)}
              </span>
              <span>{staff.bookings} jobs</span>
              {staff.rating > 0 ? (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  {staff.rating.toFixed(1)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
      {data.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No staff data yet</p>
      ) : null}
    </div>
  );
}
