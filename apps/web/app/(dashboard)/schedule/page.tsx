"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { api } from "@/lib/api-client";
import { formatTime } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

type ScheduleRow = Record<string, unknown>;
type StaffRow = Record<string, unknown>;

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

const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);

export default function SchedulePage() {
  const { terms } = useBusinessCategory();
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [editorOpen, setEditorOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [scheduleDate, setScheduleDate] = useState(toDateStr(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [isDayOff, setIsDayOff] = useState(false);

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

  const { data: staff = [] } = useQuery({
    queryKey: ["org", orgId, "staff", "schedule-editor"],
    enabled: !!orgId,
    queryFn: async () => {
      const resp = await api.get<{ data: StaffRow[] }>(`/organizations/${orgId}/staff`);
      return resp.data ?? [];
    },
  });

  const saveSchedule = useMutation({
    mutationFn: () =>
      api.post(`/organizations/${orgId}/staff-schedules`, {
        staff_id: staffId,
        schedule_date: scheduleDate,
        start_time: startTime,
        end_time: endTime,
        is_day_off: isDayOff,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "staff-schedules"] });
      setEditorOpen(false);
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

  function onSave(event: FormEvent) {
    event.preventDefault();
    if (!staffId || !scheduleDate) return;
    saveSchedule.mutate();
  }

  return (
    <ModulePage title={terms.schedulePageTitle} description="Weekly staff schedule grid.">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-0 text-sm font-medium">
            {weekDays[0].toLocaleDateString("en-KE", { month: "short", day: "numeric" })} –{" "}
            {weekDays[6].toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <Button type="button" variant="outline" size="icon" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button type="button" size="sm" className="w-full gap-2 sm:w-auto" onClick={() => setEditorOpen(true)} data-testid="schedule-add-shift">
          <Plus className="h-4 w-4" />
          Add shift
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
                  <tr key={hour} data-testid={`schedule-hour-${hour}`}>
                    <td className="border border-border/50 p-2 font-mono text-xs text-muted-foreground">{formatTime(hour)}</td>
                    {weekDays.map((d) => {
                      const key = `${toDateStr(d)}|${hour}`;
                      const entries = grid.get(key) ?? [];
                      return (
                        <td key={key} className="border border-border/50 p-1 align-top">
                          {entries.map((row) => {
                            const id = String(pickRowField(row, "id") ?? "");
                            const dayOff = Boolean(pickRowField(row, "is_day_off") ?? pickRowField(row, "isDayOff"));
                            const sid = String(pickRowField(row, "staff_id") ?? pickRowField(row, "staffId") ?? "");
                            const staffName =
                              staff.find((s) => String(s.id ?? s.ID) === sid) &&
                              String(
                                pickRowField(
                                  staff.find((s) => String(s.id ?? s.ID) === sid)!,
                                  "display_name",
                                ) ?? "Staff",
                              );
                            return (
                              <div
                                key={id}
                                className={`mb-1 rounded px-1.5 py-0.5 text-[10px] ${
                                  dayOff ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
                                }`}
                              >
                                {dayOff ? "Day off" : staffName || "Shift"}
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

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent data-testid="schedule-editor">
          <DialogHeader>
            <DialogTitle>Add or update shift</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSave}>
            <div className="space-y-1">
              <Label>Barber</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger data-testid="schedule-staff-select">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((row) => {
                    const id = String(row.id ?? row.ID ?? "");
                    const name = String(pickRowField(row, "display_name") ?? "Staff");
                    return (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="schedule-date">Date</Label>
              <Input
                id="schedule-date"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="schedule-start">Start</Label>
                <Input id="schedule-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="schedule-end">End</Label>
                <Input id="schedule-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isDayOff} onChange={(e) => setIsDayOff(e.target.checked)} />
              Mark as day off
            </label>
            <Button type="submit" className="w-full" disabled={!staffId || saveSchedule.isPending}>
              {saveSchedule.isPending ? "Saving…" : "Save shift"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
}
