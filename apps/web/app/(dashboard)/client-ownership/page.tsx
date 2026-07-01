"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

type OwnershipRow = Record<string, unknown>;

function pick(row: OwnershipRow, key: string): unknown {
  if (row[key] !== undefined) return row[key];
  const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  return row[camel];
}

export default function ClientOwnershipPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "customers-ownership"],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const body = await apiClient<{ data: OwnershipRow[] } | OwnershipRow[]>(
        `/organizations/${orgId}/customers/ownership`,
      );
      return Array.isArray(body) ? body : (body.data ?? []);
    },
  });

  const body = (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Client ownership</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">Failed to load ownership data.</p>}
        <DataTable
          columns={[
            {
              key: "full_name",
              header: "Client",
              render: (row) => String(pick(row, "full_name") ?? "—"),
            },
            {
              key: "phone",
              header: "Phone",
              render: (row) => String(pick(row, "phone") ?? "—"),
            },
            {
              key: "assigned_staff_id",
              header: "Assigned staff",
              render: (row) => String(pick(row, "assigned_staff_id") ?? "Unassigned"),
            },
            {
              key: "loyalty_tier",
              header: "Tier",
              render: (row) => String(pick(row, "loyalty_tier") ?? "—"),
            },
          ]}
          rows={data ?? []}
          emptyMessage="No client ownership records yet."
          rowKey={(row) => String(row.id ?? row.ID ?? "")}
        />
      </CardContent>
    </Card>
  );

  return (
    <ModulePage title="Client Ownership" feature="crm">
      <Feature flag="crm">{body}</Feature>
    </ModulePage>
  );
}
