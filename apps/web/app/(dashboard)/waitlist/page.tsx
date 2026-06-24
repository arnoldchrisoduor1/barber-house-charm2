"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

type WaitlistEntry = {
  id: string;
  customerId: string;
  notes?: string;
  createdAt?: string;
};

export default function WaitlistPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "waitlist"],
    enabled: !!orgId,
    queryFn: () =>
      apiClient<{ data: WaitlistEntry[] }>(`/organizations/${orgId}/bookings/waitlist`),
  });

  const addEntry = useMutation({
    mutationFn: (payload: { customerId: string; notes: string }) =>
      apiClient(`/organizations/${orgId}/bookings/waitlist`, {
        method: "POST",
        body: payload,
      }),
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
    <ModulePage title="Waitlist" feature="bookings" description="Manage booking waitlist entries.">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Waitlist</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground">Loading…</p>}
            {error && <p className="text-destructive">Failed to load waitlist.</p>}
            <DataTable
              columns={[
                { key: "customerId", header: "Customer" },
                { key: "notes", header: "Notes" },
                { key: "createdAt", header: "Added" },
              ]}
              rows={data?.data ?? []}
              emptyMessage="No waitlist entries."
            />
          </CardContent>
        </Card>

        <Card className="glass h-fit">
          <CardHeader>
            <CardTitle>Add to waitlist</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Customer ID</span>
                <input
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="UUID"
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </label>
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
