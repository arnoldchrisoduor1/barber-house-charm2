"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

type Payout = {
  id: string;
  amountKES?: number;
  amountKes?: number;
  status: string;
  merchantReference: string;
  createdAt?: string;
};

type LedgerEntry = {
  id: string;
  account: string;
  direction: string;
  amountKES: number;
  ref?: string;
  createdAt?: string;
};

export default function FinancePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;

  const balanceQuery = useQuery({
    queryKey: ["org", orgId, "ledger-balance"],
    enabled: !!orgId,
    queryFn: () => apiClient<{ balanceKes: number }>(`/organizations/${orgId}/ledger/balance`),
  });

  const payoutsQuery = useQuery({
    queryKey: ["org", orgId, "payouts"],
    enabled: !!orgId,
    queryFn: () => apiClient<{ data: Payout[] }>(`/organizations/${orgId}/payouts`),
  });

  const ledgerQuery = useQuery({
    queryKey: ["org", orgId, "ledger-entries"],
    enabled: !!orgId,
    queryFn: () => apiClient<LedgerEntry[]>(`/organizations/${orgId}/ledger/entries`),
  });

  return (
    <ModulePage title="Finance" description="Wallet balance and payout history.">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Wallet balance</CardTitle>
          </CardHeader>
          <CardContent>
            {balanceQuery.isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (
              <p className="font-display text-3xl">
                KES {(balanceQuery.data?.balanceKes ?? 0).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass md:col-span-2">
          <CardHeader>
            <CardTitle>Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {payoutsQuery.isLoading && <p className="text-muted-foreground">Loading…</p>}
            {payoutsQuery.error && (
              <p className="text-destructive">Failed to load payouts.</p>
            )}
            <DataTable
              columns={[
                {
                  key: "amountKes",
                  header: "Amount",
                  render: (row) => {
                    const amount = row.amountKes ?? row.amountKES ?? 0;
                    return `KES ${amount.toLocaleString()}`;
                  },
                },
                { key: "status", header: "Status" },
                { key: "merchantReference", header: "Reference" },
                { key: "createdAt", header: "Created" },
              ]}
              rows={payoutsQuery.data?.data ?? []}
              emptyMessage="No payouts yet."
            />
          </CardContent>
        </Card>

        <Card className="glass md:col-span-2" id="ledger">
          <CardHeader>
            <CardTitle>Ledger entries</CardTitle>
          </CardHeader>
          <CardContent>
            {ledgerQuery.isLoading && <p className="text-muted-foreground">Loading…</p>}
            {ledgerQuery.error && (
              <p className="text-destructive">Failed to load ledger entries.</p>
            )}
            <DataTable
              columns={[
                { key: "createdAt", header: "When" },
                { key: "account", header: "Account" },
                { key: "direction", header: "Direction" },
                {
                  key: "amountKES",
                  header: "Amount",
                  render: (row) => `KES ${row.amountKES.toLocaleString()}`,
                },
                { key: "ref", header: "Ref" },
              ]}
              rows={Array.isArray(ledgerQuery.data) ? ledgerQuery.data : []}
              emptyMessage="No ledger entries yet."
            />
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
