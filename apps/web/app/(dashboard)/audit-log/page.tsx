"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

type AuditEntry = {
  id: string;
  action: string;
  entityType?: string;
  createdAt: string;
};

export default function AuditLogPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "audit-log"],
    enabled: !!orgId,
    queryFn: () =>
      apiClient<{ data: AuditEntry[] }>(`/organizations/${orgId}/audit-log`),
  });

  return (
    <ModulePage
      title="Audit Log"
      feature="advanced_analytics"
      description="Append-only record of sensitive actions in your organization."
    >
      <Card className="glass">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {error && <p className="text-destructive">Failed to load audit log.</p>}
          <DataTable
            columns={[
              { key: "createdAt", header: "When" },
              { key: "action", header: "Action" },
              { key: "entityType", header: "Entity" },
            ]}
            rows={data?.data ?? []}
            emptyMessage="No audit entries yet."
          />
        </CardContent>
      </Card>
    </ModulePage>
  );
}
