"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

export default function WalletPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;

  const { data } = useQuery({
    queryKey: ["org", orgId, "ledger"],
    enabled: !!orgId,
    queryFn: () => apiClient<{ balanceKes: number }>(`/organizations/${orgId}/ledger/balance`),
  });

  return (
    <AppShell title="Wallet">
      <Card className="glass max-w-md">
        <CardHeader>
          <CardTitle>Tenant wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-display">KES {(data?.balanceKes ?? 0).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-2">Available after platform fees and holds.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
