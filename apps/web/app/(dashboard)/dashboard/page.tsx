"use client";

import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarCheck, Users, Wallet } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { api } from "@/lib/api-client";

interface ReportsSummary {
  total_revenue_kes: number;
  total_bookings: number;
  total_customers: number;
  completed_bookings: number;
}

const EXEC_ROLES = ["ceo", "director"];
const MANAGER_ROLES = ["branch_manager"];

function roleScope(roles: string[]): "executive" | "manager" | "staff" | "client" {
  if (roles.some((r) => EXEC_ROLES.includes(r))) return "executive";
  if (roles.some((r) => MANAGER_ROLES.includes(r))) return "manager";
  if (roles.some((r) => r === "customer" || r === "client")) return "client";
  return "staff";
}

function formatKes(amount: number): string {
  return `KES ${Number(amount ?? 0).toLocaleString()}`;
}

export default function DashboardPage() {
  const { me, isLoading, roles } = useAuth();
  const { terms, label, setFromSubscription } = useBusinessCategory();
  const { activeBranch, activeBranchId, apiParams, canFilter } = useBranchFilter();

  useEffect(() => {
    const businessType = me?.subscription?.businessType ?? me?.activeOrg?.businessType;
    if (businessType) setFromSubscription(businessType);
  }, [me, setFromSubscription]);

  const orgId = me?.activeOrg?.id ?? "";
  const scope = roleScope(roles);
  const showMetrics = scope === "executive" || scope === "manager";

  const reportsQuery = useQuery({
    queryKey: ["dashboard-reports", orgId, apiParams],
    enabled: !!orgId && showMetrics,
    retry: false,
    queryFn: () =>
      api.get<ReportsSummary>(`/organizations/${orgId}/analytics/reports`, { params: apiParams }),
  });

  const summary = reportsQuery.data;
  const branchLabel = activeBranchId ? (activeBranch?.name ?? "Selected branch") : "All branches";

  return (
    <AppShell title={terms.servicesPageTitle}>
      <div className="space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {label}
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {scopeLabel(scope)}
              </span>
            </CardTitle>
            <CardDescription>{terms.dashboardSubtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading workspace...</p>
            ) : me?.user ? (
              <p className="text-muted-foreground">
                Welcome, {me.user.fullName ?? me.user.email}.
                {canFilter ? (
                  <>
                    {" "}
                    Viewing data for <span className="font-medium text-foreground">{branchLabel}</span>.
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-muted-foreground">Sign in to view your dashboard.</p>
            )}
          </CardContent>
        </Card>

        {showMetrics ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="dashboard-metrics">
            <MetricCard
              icon={<Wallet className="h-5 w-5 text-primary" />}
              label="Revenue"
              value={summary ? formatKes(summary.total_revenue_kes) : "—"}
              loading={reportsQuery.isLoading}
            />
            <MetricCard
              icon={<CalendarCheck className="h-5 w-5 text-primary" />}
              label="Bookings"
              value={summary ? String(summary.total_bookings) : "—"}
              loading={reportsQuery.isLoading}
            />
            <MetricCard
              icon={<BarChart3 className="h-5 w-5 text-primary" />}
              label="Completed"
              value={summary ? String(summary.completed_bookings) : "—"}
              loading={reportsQuery.isLoading}
            />
            <MetricCard
              icon={<Users className="h-5 w-5 text-primary" />}
              label="Customers"
              value={summary ? String(summary.total_customers) : "—"}
              loading={reportsQuery.isLoading}
            />
          </div>
        ) : null}

        {scope === "staff" ? (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Your workspace</CardTitle>
              <CardDescription>Day-to-day operations</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Use the navigation to manage the point of sale, today&apos;s schedule, and your clients.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}

function scopeLabel(scope: ReturnType<typeof roleScope>): string {
  switch (scope) {
    case "executive":
      return "Executive";
    case "manager":
      return "Branch Manager";
    case "client":
      return "Client";
    default:
      return "Staff";
  }
}

function MetricCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <Card className="glass">
      <CardContent className="flex flex-col gap-2 py-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className="font-heading text-2xl font-semibold">{loading ? "…" : value}</p>
      </CardContent>
    </Card>
  );
}
