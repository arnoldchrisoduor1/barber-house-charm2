"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ModulePage } from "@/components/ModulePage";
import { Feature } from "@/components/Feature";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { useEntityList } from "@/lib/api/crud";

type StaffRow = Record<string, unknown>;

function staffLabel(row: StaffRow): string {
  return String(row.display_name ?? row.displayName ?? row.id ?? "Staff");
}

function staffId(row: StaffRow): string {
  return String(row.id ?? row.ID ?? "");
}

export default function MyEarningsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { data: staff = [], isLoading: staffLoading } = useEntityList<StaffRow>(orgId, "staff");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const staffIdToUse = selectedStaffId || (staff[0] ? staffId(staff[0]) : "");

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "analytics-my-earnings", staffIdToUse],
    enabled: Boolean(orgId && staffIdToUse),
    queryFn: () =>
      apiClient<Record<string, unknown>>(
        `/organizations/${orgId}/analytics/my-earnings?staff_id=${staffIdToUse}`,
      ),
  });

  const body = (
    <Card className="glass">
      <CardHeader>
        <CardTitle>My Earnings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {staffLoading ? (
          <p className="text-muted-foreground">Loading staff…</p>
        ) : staff.length === 0 ? (
          <p className="text-muted-foreground">No staff members found.</p>
        ) : (
          <div className="max-w-xs space-y-1.5">
            <label className="text-sm text-muted-foreground">Staff member</label>
            <Select
              value={staffIdToUse}
              onValueChange={setSelectedStaffId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((row) => (
                  <SelectItem key={staffId(row)} value={staffId(row)}>
                    {staffLabel(row)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {isLoading && staffIdToUse ? <p className="text-muted-foreground">Loading earnings…</p> : null}
        {error ? <p className="text-destructive">Failed to load earnings.</p> : null}
        {data ? (
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted/40 p-4 text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <ModulePage title="My Earnings" feature="advanced_analytics">
      <Feature flag="advanced_analytics">{body}</Feature>
    </ModulePage>
  );
}
