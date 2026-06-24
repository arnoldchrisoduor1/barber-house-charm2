"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Feature } from "@/components/Feature";

type Booking = {
  id: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  isWalkin?: boolean;
};

export default function BookingsPage() {
  const { activeOrg } = useAuth();
  const qc = useQueryClient();
  const orgId = activeOrg?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "bookings"],
    enabled: !!orgId,
    queryFn: () =>
      apiClient<{ data: Booking[] }>(`/organizations/${orgId}/bookings`),
  });

  const createWalkin = useMutation({
    mutationFn: () =>
      apiClient(`/organizations/${orgId}/bookings`, {
        method: "POST",
        body: JSON.stringify({
          customerId: "00000000-0000-0000-0000-000000000001",
          bookingDate: new Date().toISOString().slice(0, 10),
          startTime: "09:00",
          endTime: "09:30",
          isWalkin: true,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", orgId, "bookings"] }),
  });

  return (
    <AppShell title="Bookings">
      <Feature flag="bookings">
        <Card className="glass mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sessions & scheduling</CardTitle>
            <Button onClick={() => createWalkin.mutate()} disabled={!orgId}>
              Add walk-in
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground">Loading…</p>}
            {error && <p className="text-destructive">Failed to load bookings.</p>}
            <DataTable
              columns={[
                { key: "bookingDate", header: "Date" },
                { key: "startTime", header: "Start" },
                { key: "status", header: "Status" },
                {
                  key: "isWalkin",
                  header: "Walk-in",
                  render: (r) => (r.isWalkin ? "Yes" : "No"),
                },
              ]}
              rows={data?.data ?? []}
              emptyMessage="No bookings yet."
            />
          </CardContent>
        </Card>
      </Feature>
    </AppShell>
  );
}
