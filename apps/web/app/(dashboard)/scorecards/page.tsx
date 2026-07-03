"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Star } from "lucide-react";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { formatKES } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

type ScorecardRow = Record<string, unknown>;

export default function ScorecardsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "analytics-scorecards"],
    enabled: !!orgId,
    queryFn: async () => {
      const resp = await api.get<{ data: ScorecardRow[] }>(`/organizations/${orgId}/analytics/scorecards`);
      return resp.data ?? [];
    },
  });

  const chartData = (data ?? []).map((row) => ({
    name: String(pickRowField(row, "display_name") ?? pickRowField(row, "full_name") ?? "Staff"),
    revenue: Number(pickRowField(row, "revenue_kes") ?? 0),
    bookings: Number(pickRowField(row, "bookings") ?? 0),
    rating: Number(pickRowField(row, "avg_rating") ?? pickRowField(row, "rating") ?? 0),
  }));

  return (
    <ModulePage title="Scorecards" feature="advanced_analytics" description="Staff performance scorecards.">
      {error ? <p className="text-destructive">Failed to load scorecards.</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Revenue by staff</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : chartData.length === 0 ? (
              <p className="text-muted-foreground">No scorecard data yet.</p>
            ) : (
              <div className="h-[280px]" data-testid="scorecards-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      formatter={(value) => [formatKES(Number(value)), "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader>
            <CardTitle>Staff ratings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3" data-testid="scorecards-list">
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : chartData.length === 0 ? (
              <p className="text-muted-foreground">No staff scorecards yet.</p>
            ) : (
              chartData.map((row) => (
                <div key={row.name} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.bookings} bookings · {formatKES(row.revenue)}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    {row.rating.toFixed(1)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
