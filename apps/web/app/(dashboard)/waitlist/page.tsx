"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeStore } from "@/lib/store/realtime-store";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

type WaitlistRow = Record<string, unknown>;

export default function WaitlistPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const connected = useRealtimeStore((s) => s.connected);
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "waitlist"],
    enabled: !!orgId,
    refetchInterval: connected ? false : 20_000,
    queryFn: async () => {
      const resp = await api.get<{ data: WaitlistRow[] }>(`/organizations/${orgId}/bookings/waitlist`);
      return resp.data ?? [];
    },
  });

  const addEntry = useMutation({
    mutationFn: (payload: { customerId: string; notes: string }) =>
      api.post(`/organizations/${orgId}/bookings/waitlist`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "waitlist"] });
      setCustomerId("");
      setNotes("");
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerId.trim()) return;
    addEntry.mutate({ customerId: customerId.trim(), notes: notes.trim() });
  }

  return (
    <ModulePage title="Waitlist" feature="bookings" description="Live booking waitlist.">
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
        {connected ? "Live updates" : "Auto-refresh every 20s"}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="glass" data-testid="waitlist-entries">
          <CardHeader>
            <CardTitle>Waitlist ({(data ?? []).length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
            {error ? <p className="text-destructive">Failed to load waitlist.</p> : null}
            {(data ?? []).length === 0 && !isLoading ? (
              <p className="text-muted-foreground">No waitlist entries.</p>
            ) : (
              <div className="space-y-3">
                {(data ?? []).map((row) => {
                  const id = String(pickRowField(row, "id") ?? "");
                  const cust = String(pickRowField(row, "customer_id") ?? pickRowField(row, "customerId") ?? "—");
                  const note = String(pickRowField(row, "notes") ?? "—");
                  const created = pickRowField(row, "created_at") ?? pickRowField(row, "createdAt");
                  return (
                    <div key={id} className="stat-tile rounded-lg p-4">
                      <p className="text-sm font-medium">Customer {cust.slice(0, 8)}…</p>
                      {note !== "—" ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
                      {created ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">Added {formatDate(String(created))}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add to waitlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit} data-testid="waitlist-form">
              <div className="space-y-1">
                <Label htmlFor="waitlist-customer">Customer ID</Label>
                <Input
                  id="waitlist-customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="UUID"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="waitlist-notes">Notes</Label>
                <Textarea
                  id="waitlist-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={!orgId || addEntry.isPending} className="w-full">
                {addEntry.isPending ? "Adding…" : "Add entry"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
