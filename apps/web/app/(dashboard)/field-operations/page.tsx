"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Truck, Users } from "lucide-react";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

type Tab = "dispatch" | "routes" | "zones";

type FieldOpsRow = Record<string, unknown>;

export default function FieldOperationsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const [tab, setTab] = useState<Tab>("dispatch");

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "field-operations"],
    enabled: !!orgId && tab === "dispatch",
    queryFn: async () => {
      const resp = await api.get<{ data: FieldOpsRow[] }>(`/organizations/${orgId}/analytics/field-operations`);
      return resp.data ?? [];
    },
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: "dispatch", label: "Dispatch" },
    { id: "routes", label: "Routes" },
    { id: "zones", label: "Coverage zones" },
  ];

  return (
    <ModulePage title="Field Operations" feature="coverage_zones" description="Mobile dispatch and field team coordination.">
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button key={t.id} type="button" variant={tab === t.id ? "default" : "outline"} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "dispatch" ? (
        <Card className="glass" data-testid="field-ops-dispatch">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Active dispatches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? <p className="text-destructive">Failed to load dispatch data.</p> : null}
            {isLoading ? (
              <p className="text-muted-foreground">Loading dispatches…</p>
            ) : (data ?? []).length === 0 ? (
              <p className="text-muted-foreground">No active field jobs.</p>
            ) : (
              <div className="space-y-3">
                {(data ?? []).map((row) => {
                  const id = String(pickRowField(row, "id") ?? "");
                  return (
                    <div key={id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                      <div>
                        <p className="text-sm font-medium">{String(pickRowField(row, "staff_name") ?? "Staff")}</p>
                        <p className="text-xs text-muted-foreground">
                          {String(pickRowField(row, "location") ?? "On-site")} · {String(pickRowField(row, "scheduled_at") ?? "—")}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">
                        {String(pickRowField(row, "status") ?? "scheduled")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "routes" ? (
        <Card className="glass" data-testid="field-ops-routes">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Route planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Route optimization and daily run sheets will appear here. Connect coverage zones and staff schedules to enable auto-routing.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {tab === "zones" ? (
        <Card className="glass" data-testid="field-ops-zones">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Coverage zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define service areas and assign mobile professionals to zones. Manage zones from the Coverage Zones page.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </ModulePage>
  );
}
