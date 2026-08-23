"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { CrudModulePage } from "@/components/CrudModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { api } from "@/lib/api-client";
import { consumptionConfig } from "@/lib/crud-configs";
import { pickRowField } from "@/lib/record-fields";

function isShrinkage(notes: string, qty: number) {
  return /shrink|waste|loss|spoil|breakage/i.test(notes) || qty >= 10;
}

export default function Page() {
  const { mode } = useBusinessCategory();
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";

  const logsQuery = useQuery({
    queryKey: ["org", orgId, "consumption-shrinkage"],
    enabled: mode === "products" && !!orgId,
    queryFn: async () => {
      const body = await api.get<{ data?: Record<string, unknown>[] }>(
        `/organizations/${orgId}/consumption-logs`,
      );
      return body.data ?? [];
    },
  });

  const shrinkage = useMemo(() => {
    return (logsQuery.data ?? []).filter((row) =>
      isShrinkage(String(pickRowField(row, "notes") ?? ""), Number(pickRowField(row, "quantity") ?? 0)),
    );
  }, [logsQuery.data]);

  return (
    <div className="space-y-6">
      {mode === "products" ? (
        <Card className="glass" data-testid="consumption-shrinkage">
          <CardHeader>
            <CardTitle className="text-base">Shrinkage flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {logsQuery.isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : shrinkage.length === 0 ? (
              <p className="text-muted-foreground">No shrinkage-flagged consumption logs.</p>
            ) : (
              shrinkage.slice(0, 20).map((row) => {
                const id = String(pickRowField(row, "id") ?? "");
                return (
                  <div key={id} className="flex justify-between rounded-lg border border-amber-500/30 px-3 py-2">
                    <span>
                      Qty {String(pickRowField(row, "quantity") ?? "")} · {String(pickRowField(row, "notes") ?? "—")}
                    </span>
                    <span className="text-xs uppercase text-amber-400">Shrinkage</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : null}
      <CrudModulePage config={consumptionConfig} />
    </div>
  );
}
