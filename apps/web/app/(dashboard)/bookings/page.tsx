"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useCurrentStaffId } from "@/hooks/useCurrentStaffId";
import { useStaffScope } from "@/hooks/useStaffScope";
import { api } from "@/lib/api-client";
import { formatDate, formatTime } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

type BookingRow = Record<string, unknown>;

const STATUSES = ["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"] as const;
const NEXT_STATUS: Record<string, string> = {
  scheduled: "confirmed",
  confirmed: "checked_in",
  checked_in: "in_progress",
  in_progress: "completed",
};

export default function BookingsPage() {
  const { activeOrg } = useAuth();
  const staffId = useCurrentStaffId();
  const { isStaffScoped } = useStaffScope();
  const qc = useQueryClient();
  const orgId = activeOrg?.id ?? "";
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    startTime: "09:00",
    endTime: "09:30",
    notes: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "bookings", selectedDate, statusFilter, staffId],
    enabled: !!orgId,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const resp = await api.get<{ data: BookingRow[] }>(`/organizations/${orgId}/bookings`, { params });
      return resp.data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((row) => {
      const date = String(pickRowField(row, "booking_date") ?? pickRowField(row, "bookingDate") ?? "");
      const rowStaff = String(pickRowField(row, "staff_id") ?? pickRowField(row, "staffId") ?? "");
      const dateMatch = date.startsWith(selectedDate);
      const staffMatch = !staffId || !rowStaff || rowStaff === staffId;
      return dateMatch && staffMatch;
    });
  }, [data, selectedDate, staffId]);

  const createBooking = useMutation({
    mutationFn: () =>
      api.post(`/organizations/${orgId}/bookings`, {
        customerId: form.customerId,
        bookingDate: selectedDate,
        startTime: form.startTime,
        endTime: form.endTime,
        notes: form.notes || undefined,
        staffId: staffId ?? undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "bookings"] });
      setDialogOpen(false);
      setForm({ customerId: "", startTime: "09:00", endTime: "09:30", notes: "" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      const row = (data ?? []).find((r) => String(pickRowField(r, "id")) === id);
      return api.put(`/organizations/${orgId}/bookings/${id}`, {
        customerId: String(pickRowField(row ?? {}, "customer_id") ?? pickRowField(row ?? {}, "customerId") ?? ""),
        bookingDate: selectedDate,
        startTime: String(pickRowField(row ?? {}, "start_time") ?? pickRowField(row ?? {}, "startTime") ?? "09:00"),
        endTime: String(pickRowField(row ?? {}, "end_time") ?? pickRowField(row ?? {}, "endTime") ?? "09:30"),
        status,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, "bookings"] }),
  });

  function onCreateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.customerId.trim()) return;
    createBooking.mutate();
  }

  return (
    <AppShell title={isStaffScoped ? "Your appointments" : "Bookings"}>
      <Feature flag="bookings">
        {isStaffScoped ? (
          <p className="mb-4 text-sm text-muted-foreground">Today&apos;s schedule and upcoming appointments.</p>
        ) : null}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="booking-date">Date</Label>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input
                id="booking-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
                data-testid="booking-date-picker"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="booking-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-booking-btn">
                <Plus className="mr-2 h-4 w-4" />
                New booking
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create booking</DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={onCreateSubmit}>
                <div className="space-y-1">
                  <Label htmlFor="customer-id">Customer ID</Label>
                  <Input
                    id="customer-id"
                    value={form.customerId}
                    onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                    placeholder="Customer UUID"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="start-time">Start</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-time">End</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={createBooking.isPending} className="w-full">
                  {createBooking.isPending ? "Creating…" : "Create booking"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading bookings…</p> : null}
        {error ? <p className="text-destructive">Failed to load bookings.</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="booking-cards">
          {filtered.length === 0 && !isLoading ? (
            <Card className="glass sm:col-span-2 xl:col-span-3">
              <CardContent className="py-8 text-center text-muted-foreground">No bookings for this date.</CardContent>
            </Card>
          ) : (
            filtered.map((row) => {
              const id = String(pickRowField(row, "id") ?? "");
              const status = String(pickRowField(row, "status") ?? "scheduled");
              const start = String(pickRowField(row, "start_time") ?? pickRowField(row, "startTime") ?? "");
              const end = String(pickRowField(row, "end_time") ?? pickRowField(row, "endTime") ?? "");
              const next = NEXT_STATUS[status];
              return (
                <Card key={id} className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{formatTime(start)} – {formatTime(end)}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">
                        {status.replace(/_/g, " ")}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
                    {next ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id, status: next })}
                        disabled={updateStatus.isPending}
                        data-testid={`advance-status-${id}`}
                      >
                        Mark {next.replace(/_/g, " ")}
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </Feature>
    </AppShell>
  );
}
