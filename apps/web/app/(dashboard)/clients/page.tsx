"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Feature } from "@/components/Feature";
import { apiClient } from "@/lib/api-client";

type Customer = { id: string; fullName: string; phone?: string; loyaltyTier?: string };

export default function ClientsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["org", orgId, "customers"],
    enabled: !!orgId,
    queryFn: () => apiClient<{ data: Customer[] }>(`/organizations/${orgId}/customers`),
  });

  return (
    <AppShell title="Clients">
      <Feature flag="crm">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Client CRM</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (
              <DataTable
                columns={[
                  { key: "fullName", header: "Name" },
                  { key: "phone", header: "Phone" },
                  { key: "loyaltyTier", header: "Tier" },
                ]}
                rows={data?.data ?? []}
                emptyMessage="No clients yet."
              />
            )}
          </CardContent>
        </Card>
      </Feature>
    </AppShell>
  );
}
