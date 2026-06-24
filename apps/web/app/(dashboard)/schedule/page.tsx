"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

type Schedule = {
  id: string;
  staffId: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  isDayOff: boolean;
  notes?: string;
};

export default function SchedulePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "staff-schedules"],
    enabled: !!orgId,
    queryFn: () =>
      apiClient<{ data: Schedule[] }>(`/organizations/${orgId}/staff/schedules`),
  });

  return (
    <ModulePage title="Schedule" description="Staff schedules and day-off markers.">
      <Card className="glass">
        <CardHeader>
          <CardTitle>Staff schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {error && <p className="text-destructive">Failed to load schedules.</p>}
          <DataTable
            columns={[
              { key: "scheduleDate", header: "Date" },
              { key: "startTime", header: "Start" },
              { key: "endTime", header: "End" },
              {
                key: "isDayOff",
                header: "Day off",
                render: (row) => (row.isDayOff ? "Yes" : "No"),
              },
              { key: "notes", header: "Notes" },
            ]}
            rows={data?.data ?? []}
            emptyMessage="No schedules yet."
          />
        </CardContent>
      </Card>
    </ModulePage>
  );
}
