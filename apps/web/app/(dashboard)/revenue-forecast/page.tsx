"use client";

import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { formatKES } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

type ForecastRow = Record<string, unknown>;

export default function RevenueForecastPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "analytics-revenue-forecast"],
    enabled: !!orgId,
    queryFn: async () => {
      const resp = await api.get<{ data: ForecastRow[] }>(`/organizations/${orgId}/analytics/revenue-forecast`);
      return resp.data ?? [];
    },
  });

  const chartData = (data ?? []).map((row) => ({
    month: String(pickRowField(row, "month") ?? ""),
    revenue: Number(pickRowField(row, "revenue_kes") ?? 0),
    projected: Number(pickRowField(row, "projected_kes") ?? 0),
  }));

  return (
    <ModulePage title="Revenue Forecast" feature="advanced_analytics" description="Historical and projected revenue.">
      {error ? <p className="text-destructive">Failed to load forecast.</p> : null}
      <Card className="glass">
        <CardHeader>
          <CardTitle>6-month revenue trend</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading forecast…</p>
          ) : chartData.length === 0 ? (
            <p className="text-muted-foreground">No forecast data yet.</p>
          ) : (
            <div className="h-[320px]" data-testid="revenue-forecast-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(value, name) => [
                      formatKES(Number(value)),
                      name === "revenue" ? "Actual" : "Projected",
                    ]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#forecastGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="projected" stroke="#60a5fa" fill="none" strokeDasharray="4 4" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </ModulePage>
  );
}
