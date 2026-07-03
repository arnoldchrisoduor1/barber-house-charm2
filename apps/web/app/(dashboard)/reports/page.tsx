"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ModulePage } from "@/components/ModulePage";
import { StatTile } from "@/components/dashboard/StatTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { api } from "@/lib/api-client";
import { formatKES } from "@/lib/format";
import { BarChart3, CalendarCheck, DollarSign, Users } from "lucide-react";

interface ReportsSummary {
  total_revenue_kes: number;
  total_bookings: number;
  total_customers: number;
  completed_bookings: number;
}

export default function ReportsPage() {
  const { activeOrg } = useAuth();
  const { apiParams } = useBranchFilter();
  const orgId = activeOrg?.id ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "analytics-reports", apiParams],
    enabled: !!orgId,
    queryFn: () =>
      api.get<ReportsSummary>(`/organizations/${orgId}/analytics/reports`, { params: apiParams }),
  });

  const chartData = data
    ? [
        { name: "Revenue", value: data.total_revenue_kes },
        { name: "Bookings", value: data.total_bookings },
        { name: "Completed", value: data.completed_bookings },
        { name: "Customers", value: data.total_customers },
      ]
    : [];

  return (
    <ModulePage title="Reports" feature="basic_reports" description="Organization performance summary.">
      {error ? <p className="text-destructive">Failed to load reports.</p> : null}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="reports-stats">
        <StatTile icon={DollarSign} label="Total revenue" value={data ? formatKES(data.total_revenue_kes) : "—"} loading={isLoading} />
        <StatTile icon={CalendarCheck} label="Bookings" value={data ? String(data.total_bookings) : "—"} loading={isLoading} />
        <StatTile icon={BarChart3} label="Completed" value={data ? String(data.completed_bookings) : "—"} loading={isLoading} />
        <StatTile icon={Users} label="Customers" value={data ? String(data.total_customers) : "—"} loading={isLoading} />
      </div>
      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading chart…</p>
          ) : (
            <div className="h-[280px]" data-testid="reports-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(value, name) => [
                      name === "Revenue" ? formatKES(Number(value)) : String(value),
                      name,
                    ]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </ModulePage>
  );
}
