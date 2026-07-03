"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function QueuePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const connected = useRealtimeStore((s) => s.connected);
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "bookings", "queue", today],
    enabled: !!orgId,
    refetchInterval: connected ? false : 15_000,
    queryFn: async () => {
      const resp = await api.get<{ data: BookingRow[] }>(`/organizations/${orgId}/bookings`);
      return (resp.data ?? []).filter((row) => {
        const date = String(pickRowField(row, "booking_date") ?? pickRowField(row, "bookingDate") ?? "");
        const walkin = Boolean(pickRowField(row, "is_walkin") ?? pickRowField(row, "isWalkin"));
        return date.startsWith(today) && walkin;
      });
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

  return (
    <AppShell title="Walk-in queue">
      <Feature flag="queue">
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
          {connected ? "Live updates connected" : "Polling for updates"}
        </div>

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
                    const next = advanceMap[status];
                    return (
                      <div key={id} className="stat-tile rounded-lg p-3">
                        <p className="text-sm font-medium">{formatTime(start)}</p>
                        <p className="text-xs capitalize text-muted-foreground">{status.replace(/_/g, " ")}</p>
                        {next ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 h-7 px-2 text-xs"
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
