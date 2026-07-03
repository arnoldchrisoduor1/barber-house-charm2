"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { formatTime } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

type ScheduleRow = Record<string, unknown>;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export default function SchedulePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "staff-schedules"],
    enabled: !!orgId,
    queryFn: async () => {
      const resp = await api.get<{ data: ScheduleRow[] }>(`/organizations/${orgId}/staff-schedules`);
      return resp.data ?? [];
    },
  });

  const grid = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>();
    for (const row of data ?? []) {
      const date = String(pickRowField(row, "schedule_date") ?? pickRowField(row, "scheduleDate") ?? "");
      const start = String(pickRowField(row, "start_time") ?? pickRowField(row, "startTime") ?? "").slice(0, 5);
      const key = `${date}|${start}`;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [data]);

  return (
    <ModulePage title="Schedule" description="Weekly staff schedule grid.">
      <div className="mb-4 flex items-center justify-between">
        <Button type="button" variant="outline" size="icon" onClick={() => setWeekStart((w) => addDays(w, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium">
          {weekDays[0].toLocaleDateString("en-KE", { month: "short", day: "numeric" })} –{" "}
          {weekDays[6].toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <Button type="button" variant="outline" size="icon" onClick={() => setWeekStart((w) => addDays(w, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card className="glass overflow-x-auto" data-testid="schedule-week-grid">
        <CardHeader>
          <CardTitle>Week grid</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <p className="text-destructive">Failed to load schedules.</p> : null}
          {isLoading ? (
            <p className="text-muted-foreground">Loading schedule…</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-border/50 p-2 text-left text-muted-foreground">Time</th>
                  {weekDays.map((d) => (
                    <th key={toDateStr(d)} className="border border-border/50 p-2 text-center">
                      <div className="font-medium">{d.toLocaleDateString("en-KE", { weekday: "short" })}</div>
                      <div className="text-xs text-muted-foreground">{d.getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="border border-border/50 p-2 font-mono text-xs text-muted-foreground">{formatTime(hour)}</td>
                    {weekDays.map((d) => {
                      const key = `${toDateStr(d)}|${hour}`;
                      const entries = grid.get(key) ?? [];
                      return (
                        <td key={key} className="border border-border/50 p-1 align-top">
                          {entries.map((row) => {
                            const id = String(pickRowField(row, "id") ?? "");
                            const dayOff = Boolean(pickRowField(row, "is_day_off") ?? pickRowField(row, "isDayOff"));
                            return (
                              <div
                                key={id}
                                className={`mb-1 rounded px-1.5 py-0.5 text-[10px] ${
                                  dayOff ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
                                }`}
                              >
                                {dayOff ? "Day off" : "Shift"}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </ModulePage>
  );
}
