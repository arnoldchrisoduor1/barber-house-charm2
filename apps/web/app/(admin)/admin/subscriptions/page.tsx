"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

type SubscriptionRow = {
  organizationId: string;
  organizationName: string;
  plan: string;
  status: string;
  trialEndsAt?: string;
};

export default function AdminSubscriptionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform", "subscriptions"],
    queryFn: () => apiClient<{ data: SubscriptionRow[] }>("/platform/subscriptions"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">Plan and billing status across tenants.</p>
      </div>
      <Card className="glass">
        <CardHeader>
          <CardTitle>Active subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {error && <p className="text-destructive">Failed to load subscriptions.</p>}
          <DataTable
            columns={[
              { key: "organizationName", header: "Organization" },
              { key: "plan", header: "Plan" },
              { key: "status", header: "Status" },
              { key: "trialEndsAt", header: "Trial ends" },
            ]}
            rows={data?.data ?? []}
            emptyMessage="No subscriptions found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
