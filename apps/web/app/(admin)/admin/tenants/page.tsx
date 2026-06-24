"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

type Organization = {
  id: string;
  name: string;
  slug: string;
  businessType?: string;
};

export default function AdminTenantsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "organizations"],
    queryFn: () => apiClient<{ data: Organization[] }>("/platform/organizations"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Tenants</h1>
        <p className="text-sm text-muted-foreground">Cross-tenant organization directory.</p>
      </div>
      <Card className="glass">
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {error && <p className="text-destructive">Failed to load tenants.</p>}
          <DataTable
            columns={[
              { key: "name", header: "Name" },
              { key: "slug", header: "Slug" },
              { key: "businessType", header: "Mode" },
            ]}
            rows={data?.data ?? []}
            emptyMessage="No organizations found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
