"use client";

import { useQuery } from "@tanstack/react-query";
import { DollarSign, Percent, Wallet } from "lucide-react";

import { ModulePage } from "@/components/ModulePage";
import { StatTile } from "@/components/dashboard/StatTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentStaffId } from "@/hooks/useCurrentStaffId";
import { api } from "@/lib/api-client";
import { formatDate, formatKES } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

export default function MyEarningsPage() {
  const { activeOrg } = useAuth();
  const staffId = useCurrentStaffId();
  const orgId = activeOrg?.id ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "analytics-my-earnings", staffId],
    enabled: Boolean(orgId && staffId),
    queryFn: async () => {
      const resp = await api.get<Record<string, unknown>>(
        `/organizations/${orgId}/analytics/my-earnings${staffId ? `?staff_id=${staffId}` : ""}`,
      );
      return resp;
    },
  });

  const revenue = Number(pickRowField(data ?? {}, "revenue_kes") ?? 0);
  const commission = Number(pickRowField(data ?? {}, "commission_kes") ?? 0);
  const rate = Number(pickRowField(data ?? {}, "commission_rate") ?? 0);
  const displayName = String(pickRowField(data ?? {}, "display_name") ?? "You");
  const periodStart = pickRowField(data ?? {}, "period_start");
  const periodEnd = pickRowField(data ?? {}, "period_end");

  return (
    <ModulePage title="My Earnings" feature="advanced_analytics" description="Your commission and revenue for the current period.">
      {!staffId ? (
        <Card className="glass">
          <CardContent className="py-8">
            <p className="text-muted-foreground">No staff profile linked to your account.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {error ? <p className="text-destructive">Failed to load earnings.</p> : null}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" data-testid="my-earnings-stats">
            <StatTile icon={Wallet} label="Revenue" value={data ? formatKES(revenue) : "—"} loading={isLoading} />
            <StatTile icon={DollarSign} label="Commission" value={data ? formatKES(commission) : "—"} loading={isLoading} color="text-green-400" />
            <StatTile icon={Percent} label="Rate" value={data ? `${rate}%` : "—"} loading={isLoading} />
          </div>
          <Card className="glass mt-6">
            <CardHeader>
              <CardTitle>{displayName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {periodStart && periodEnd ? (
                <p>
                  Period: {formatDate(String(periodStart))} – {formatDate(String(periodEnd))}
                </p>
              ) : null}
              <p>Commission is calculated from completed transactions in the last 30 days.</p>
            </CardContent>
          </Card>
        </>
      )}
    </ModulePage>
  );
}
