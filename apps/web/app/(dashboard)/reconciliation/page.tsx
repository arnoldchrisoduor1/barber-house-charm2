"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DataTable } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import {
  closeReconciliation,
  fetchReconciliationRuns,
  fetchReconciliationToday,
  formatKes,
} from "@/lib/api/finance";
import { pickRowField } from "@/lib/record-fields";

export default function ReconciliationPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { apiParams } = useBranchFilter();
  const queryClient = useQueryClient();

  const [countedCash, setCountedCash] = useState("");
  const [countedCard, setCountedCard] = useState("");

  const todayQuery = useQuery({
    queryKey: ["org", orgId, "reconciliation-today", apiParams],
    enabled: !!orgId,
    queryFn: () => fetchReconciliationToday(orgId!, apiParams),
  });

  const runsQuery = useQuery({
    queryKey: ["org", orgId, "reconciliation-runs", apiParams],
    enabled: !!orgId,
    queryFn: () => fetchReconciliationRuns(orgId!, apiParams),
  });

  useEffect(() => {
    if (todayQuery.data && todayQuery.data.status === "open") {
      setCountedCash((prev) => prev || String(todayQuery.data!.expectedCashKes));
      setCountedCard((prev) => prev || String(todayQuery.data!.expectedCardKes));
    }
  }, [todayQuery.data]);

  const closeMut = useMutation({
    mutationFn: () =>
      closeReconciliation(orgId!, todayQuery.data!.id, {
        counted_cash_kes: Number.parseInt(countedCash, 10) || 0,
        counted_card_kes: Number.parseInt(countedCard, 10) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "reconciliation-today"] });
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "reconciliation-runs"] });
      toast.success("Day closed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Close failed"),
  });

  const today = todayQuery.data;
  const isClosed = today?.status === "closed";

  return (
    <ModulePage
      title="Reconciliation"
      feature="pos_payments"
      description="Day cash-up: expected collections vs what's actually in the till."
    >
      <div className="space-y-6">
        <Card className="glass max-w-2xl">
          <CardHeader>
            <CardTitle>Today&apos;s cash-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayQuery.isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
            {todayQuery.error ? (
              <p className="text-destructive">Failed to load today&apos;s reconciliation.</p>
            ) : null}
            {today ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Expected cash</p>
                    <p className="font-display text-xl">{formatKes(today.expectedCashKes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected card/mobile</p>
                    <p className="font-display text-xl">{formatKes(today.expectedCardKes)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="counted-cash">Counted cash</Label>
                    <Input
                      id="counted-cash"
                      type="number"
                      min={0}
                      value={countedCash}
                      disabled={isClosed}
                      onChange={(e) => setCountedCash(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="counted-card">Counted card/mobile</Label>
                    <Input
                      id="counted-card"
                      type="number"
                      min={0}
                      value={countedCard}
                      disabled={isClosed}
                      onChange={(e) => setCountedCard(e.target.value)}
                    />
                  </div>
                </div>

                {isClosed ? (
                  <p
                    className={`text-sm font-medium ${
                      (today.varianceKes ?? 0) === 0
                        ? "text-primary"
                        : (today.varianceKes ?? 0) > 0
                          ? "text-green-500"
                          : "text-destructive"
                    }`}
                  >
                    Closed — variance {formatKes(today.varianceKes ?? 0)}
                  </p>
                ) : (
                  <Button
                    className="bg-gradient-gold text-primary-foreground"
                    data-testid="reconciliation-close-day"
                    onClick={() => closeMut.mutate()}
                    disabled={closeMut.isPending}
                  >
                    {closeMut.isPending ? "Closing…" : "Close day"}
                  </Button>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            {runsQuery.isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
            <DataTable
              columns={[
                { key: "run_date", header: "Date", render: (row) => String(pickRowField(row, "run_date") ?? "—").slice(0, 10) },
                {
                  key: "expected_cash_kes",
                  header: "Expected",
                  render: (row) =>
                    formatKes(
                      Number(pickRowField(row, "expected_cash_kes") ?? 0) +
                        Number(pickRowField(row, "expected_card_kes") ?? 0),
                    ),
                },
                {
                  key: "variance_kes",
                  header: "Variance",
                  render: (row) => {
                    const v = pickRowField(row, "variance_kes");
                    return v === undefined || v === null ? "—" : formatKes(Number(v));
                  },
                },
                { key: "status", header: "Status", render: (row) => String(pickRowField(row, "status") ?? "—") },
              ]}
              rows={(runsQuery.data ?? []) as unknown as Record<string, unknown>[]}
              emptyMessage="No reconciliation runs yet."
            />
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
