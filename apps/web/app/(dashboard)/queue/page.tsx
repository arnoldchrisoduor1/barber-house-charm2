"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { CustomerPicker, type SelectedCustomer } from "@/components/CustomerPicker";
import { Feature } from "@/components/Feature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeStore } from "@/lib/store/realtime-store";
import { api } from "@/lib/api-client";
import { formatTime } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

type BookingRow = Record<string, unknown>;

const COLUMNS = [
  { key: "waiting", label: "Waiting", statuses: ["scheduled", "confirmed"] },
  { key: "checked_in", label: "Checked in", statuses: ["checked_in"] },
  { key: "in_progress", label: "In progress", statuses: ["in_progress"] },
  { key: "done", label: "Done", statuses: ["completed"] },
] as const;

function nowTimeSlot(): { start: string; end: string } {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(Math.floor(now.getMinutes() / 30) * 30).padStart(2, "0");
  const start = `${h}:${m}`;
  const endDate = new Date(now);
  endDate.setMinutes(endDate.getMinutes() + 30);
  const end = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
  return { start, end };
}

export default function QueuePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const connected = useRealtimeStore((s) => s.connected);
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);
  const [staffId, setStaffId] = useState("");
  const [serviceId, setServiceId] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "bookings", "queue", today],
    enabled: !!orgId,
    refetchInterval: connected ? false : 15_000,
    queryFn: async () => {
      const resp = await api.get<{ data: BookingRow[] }>(`/organizations/${orgId}/bookings?enrich=true`);
      return (resp.data ?? []).filter((row) => {
        const date = String(pickRowField(row, "booking_date") ?? pickRowField(row, "bookingDate") ?? "");
        const walkin = Boolean(pickRowField(row, "is_walkin") ?? pickRowField(row, "isWalkin"));
        return date.startsWith(today) && walkin;
      });
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["org", orgId, "staff", "queue"],
    enabled: !!orgId,
    queryFn: async () => {
      const resp = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/staff`);
      return resp.data ?? [];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["org", orgId, "services", "queue"],
    enabled: !!orgId,
    queryFn: async () => {
      const resp = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/services`);
      return resp.data ?? [];
    },
  });

  const addWalkIn = useMutation({
    mutationFn: async () => {
      if (!customer?.id) throw new Error("client required");
      const slot = nowTimeSlot();
      return api.post(`/organizations/${orgId}/bookings`, {
        customerId: customer.id,
        staffId: staffId || undefined,
        bookingDate: today,
        startTime: slot.start,
        endTime: slot.end,
        isWalkin: true,
        notes: serviceId ? `Service: ${serviceId}` : "Walk-in",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "bookings"] });
      setCustomer(null);
      setStaffId("");
      setServiceId("");
    },
  });

  const columns = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      items: (data ?? []).filter((row) =>
        (col.statuses as readonly string[]).includes(String(pickRowField(row, "status") ?? "")),
      ),
    }));
  }, [data]);

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      const row = (data ?? []).find((r) => String(pickRowField(r, "id")) === id);
      return api.put(`/organizations/${orgId}/bookings/${id}`, {
        customerId: String(pickRowField(row ?? {}, "customer_id") ?? pickRowField(row ?? {}, "customerId") ?? ""),
        bookingDate: today,
        startTime: String(pickRowField(row ?? {}, "start_time") ?? pickRowField(row ?? {}, "startTime") ?? "09:00"),
        endTime: String(pickRowField(row ?? {}, "end_time") ?? pickRowField(row ?? {}, "endTime") ?? "09:30"),
        status,
        isWalkin: true,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, "bookings"] }),
  });

  const advanceMap: Record<string, string> = {
    scheduled: "checked_in",
    confirmed: "checked_in",
    checked_in: "in_progress",
    in_progress: "completed",
  };

  function onAddWalkIn(e: FormEvent) {
    e.preventDefault();
    addWalkIn.mutate();
  }

  return (
    <AppShell title="Walk-in queue">
      <Feature flag="queue">
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
          {connected ? "Live updates connected" : "Polling for updates"}
        </div>

        <Card className="glass mb-6" data-testid="walk-in-form">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Add walk-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" onSubmit={onAddWalkIn}>
              <CustomerPicker orgId={orgId} value={customer} onChange={setCustomer} testId="queue-customer-picker" />
              <div className="space-y-1">
                <Label>Barber (optional)</Label>
                <Select value={staffId || "__any"} onValueChange={(v) => setStaffId(v === "__any" ? "" : v)}>
                  <SelectTrigger data-testid="queue-staff-select">
                    <SelectValue placeholder="Next available" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">Next available</SelectItem>
                    {staff.map((row) => {
                      const id = String(row.id ?? row.ID ?? "");
                      return (
                        <SelectItem key={id} value={id}>
                          {String(pickRowField(row, "display_name") ?? "Staff")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Service (optional)</Label>
                <Select value={serviceId || "__none"} onValueChange={(v) => setServiceId(v === "__none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Not specified</SelectItem>
                    {services.map((row) => {
                      const id = String(row.id ?? row.ID ?? "");
                      return (
                        <SelectItem key={id} value={id}>
                          {String(pickRowField(row, "name") ?? "Service")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={!customer || addWalkIn.isPending}>
                  {addWalkIn.isPending ? "Adding…" : "Add to queue"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {isLoading ? <p className="text-muted-foreground">Loading queue…</p> : null}
        {error ? <p className="text-destructive">Failed to load queue.</p> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="queue-kanban">
          {columns.map((col) => (
            <Card key={col.key} className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {col.label}
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{col.items.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {col.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Empty</p>
                ) : (
                  col.items.map((row) => {
                    const id = String(pickRowField(row, "id") ?? "");
                    const status = String(pickRowField(row, "status") ?? "");
                    const start = String(pickRowField(row, "start_time") ?? pickRowField(row, "startTime") ?? "");
                    const clientName = String(
                      pickRowField(row, "customer_name") ?? pickRowField(row, "customerName") ?? "Walk-in",
                    );
                    const next = advanceMap[status];
                    return (
                      <div key={id} className="stat-tile rounded-lg p-3" data-testid="queue-card">
                        <p className="text-sm font-medium">{clientName}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(start)}</p>
                        <p className="text-xs capitalize text-muted-foreground">{status.replace(/_/g, " ")}</p>
                        {next ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 w-full"
                            onClick={() => advance.mutate({ id, status: next })}
                            disabled={advance.isPending}
                          >
                            Move forward
                          </Button>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </Feature>
    </AppShell>
  );
}
