"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarCheck,
  Clock,
  DollarSign,
  Star,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { AiInsightsWidget } from "@/components/dashboard/AiInsightsWidget";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StaffLeaderboard } from "@/components/dashboard/StaffLeaderboard";
import { StatTile } from "@/components/dashboard/StatTile";
import { TopServicesChart } from "@/components/dashboard/TopServicesChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { useStaffScope } from "@/hooks/useStaffScope";
import { useCurrentStaffId } from "@/hooks/useCurrentStaffId";
import { usePortalView } from "@/hooks/usePortalView";
import { api } from "@/lib/api-client";
import { useEntityList } from "@/lib/api/crud";
import { formatDate, formatKES, formatTime } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

interface ReportsSummary {
  total_revenue_kes: number;
  total_bookings: number;
  total_customers: number;
  completed_bookings: number;
}

interface DashboardExtras {
  bookings_today: number;
  no_show_rate: number;
  completion_rate: number;
  monthly_target_kes: number;
  monthly_progress_kes: number;
}

const EXEC_ROLES = ["ceo", "director"];
const MANAGER_ROLES = ["branch_manager"];

function roleScope(roles: string[]): "executive" | "manager" | "staff" | "client" {
  if (roles.some((r) => EXEC_ROLES.includes(r))) return "executive";
  if (roles.some((r) => MANAGER_ROLES.includes(r))) return "manager";
  if (roles.some((r) => r === "customer" || r === "client")) return "client";
  return "staff";
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

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { me, isLoading } = useAuth();
  const { effectiveRoles } = usePortalView();
  const { terms, label, setFromSubscription } = useBusinessCategory();
  const { activeBranch, activeBranchId, apiParams, canFilter } = useBranchFilter();
  const { staffId, isStaffScoped } = useStaffScope();
  const linkedStaffId = useCurrentStaffId();
  const staffIdFilter = staffId ?? linkedStaffId;
  const orgId = me?.activeOrg?.id ?? "";
  const scope = roleScope(effectiveRoles);
  const showMetrics = scope === "executive" || scope === "manager";
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const businessType = me?.subscription?.businessType ?? me?.activeOrg?.businessType;
    if (businessType) setFromSubscription(businessType);
  }, [me, setFromSubscription]);

  const reportsQuery = useQuery({
    queryKey: ["dashboard", orgId, "reports", apiParams],
    enabled: !!orgId && showMetrics,
    retry: false,
    queryFn: () =>
      api.get<ReportsSummary>(`/organizations/${orgId}/analytics/reports`, { params: apiParams }),
  });

  const extrasQuery = useQuery({
    queryKey: ["dashboard", orgId, "extras", apiParams],
    enabled: !!orgId && showMetrics,
    queryFn: () =>
      api.get<DashboardExtras>(`/organizations/${orgId}/analytics/dashboard-extras`, { params: apiParams }),
  });

  const revenueChartQuery = useQuery({
    queryKey: ["dashboard", orgId, "revenue-chart", apiParams],
    enabled: !!orgId && showMetrics,
    queryFn: async () => {
      const resp = await api.get<{ data: { date: string; revenue_kes: number; expenses_kes: number }[] }>(
        `/organizations/${orgId}/analytics/revenue-chart`,
        { params: { ...apiParams, days: 7 } },
      );
      return (resp.data ?? []).map((row) => {
        const d = new Date(row.date);
        return {
          date: d.toLocaleDateString("en-KE", { weekday: "short" }),
          revenue: Number(row.revenue_kes ?? 0),
          expenses: Number(row.expenses_kes ?? 0),
        };
      });
    },
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ["dashboard", orgId, "payment-methods", apiParams],
    enabled: !!orgId && showMetrics,
    queryFn: async () => {
      const resp = await api.get<{ data: { method: string; amount_kes: number; count: number }[] }>(
        `/organizations/${orgId}/analytics/payment-methods`,
        { params: apiParams },
      );
      return (resp.data ?? []).map((row) => ({
        method: String(row.method ?? "cash"),
        amount: Number(row.amount_kes ?? 0),
        count: Number(row.count ?? 0),
      }));
    },
  });

  const topServicesQuery = useQuery({
    queryKey: ["dashboard", orgId, "top-services", apiParams],
    enabled: !!orgId && showMetrics,
    queryFn: async () => {
      const resp = await api.get<{ data: { service_name: string; revenue_kes: number; bookings: number }[] }>(
        `/organizations/${orgId}/analytics/top-services`,
        { params: { ...apiParams, limit: 5 } },
      );
      return (resp.data ?? []).map((row) => ({
        name: String(row.service_name ?? "Service"),
        revenue: Number(row.revenue_kes ?? 0),
        count: Number(row.bookings ?? 0),
      }));
    },
  });

  const leaderboardQuery = useQuery({
    queryKey: ["dashboard", orgId, "staff-leaderboard", apiParams],
    enabled: !!orgId && showMetrics,
    queryFn: async () => {
      const resp = await api.get<{ data: { full_name: string; revenue_kes: number; bookings: number; rating: number }[] }>(
        `/organizations/${orgId}/analytics/staff-leaderboard`,
        { params: apiParams },
      );
      return (resp.data ?? []).map((row) => ({
        name: String(row.full_name ?? "Staff"),
        revenue: Number(row.revenue_kes ?? 0),
        bookings: Number(row.bookings ?? 0),
        rating: Number(row.rating ?? 0),
      }));
    },
  });

  const reviewsQuery = useEntityList<Record<string, unknown>>(orgId, "reviews");

  const staffBookingsQuery = useQuery({
    queryKey: ["dashboard", orgId, "staff-bookings", today, staffIdFilter],
    enabled: !!orgId && scope === "staff",
    queryFn: async () => {
      const resp = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/bookings`, {
        params: { status: "" },
      });
      const rows = resp.data ?? [];
      return rows.filter((row) => {
        const date = String(pickRowField(row, "booking_date") ?? pickRowField(row, "bookingDate") ?? "");
        const rowStaff = String(pickRowField(row, "staff_id") ?? pickRowField(row, "staffId") ?? "");
        const dateMatch = date.startsWith(today);
        const staffMatch = !staffIdFilter || rowStaff === staffIdFilter;
        return dateMatch && staffMatch;
      });
    },
  });

  const summary = reportsQuery.data;
  const extras = extrasQuery.data;
  const branchLabel = activeBranchId ? (activeBranch?.name ?? "Selected branch") : "All branches";

  const targetProgress = useMemo(() => {
    if (!extras?.monthly_target_kes) return 0;
    return Math.min(100, Math.round((extras.monthly_progress_kes / extras.monthly_target_kes) * 100));
  }, [extras]);

  const aiMetrics = useMemo(
    () => ({
      todayBookings: Number(extras?.bookings_today ?? 0),
      totalCustomers: Number(summary?.total_customers ?? 0),
      todayRevenue: Number(summary?.total_revenue_kes ?? 0),
      activeStaff: 0,
      noShowRate: Number(extras?.no_show_rate ?? 0),
      chairUtil: 0,
      avgTransaction:
        summary && summary.completed_bookings > 0
          ? Math.round(summary.total_revenue_kes / summary.completed_bookings)
          : 0,
      pendingBookings: 0,
    }),
    [extras, summary],
  );

  const recentReviews = useMemo(() => {
    return [...(reviewsQuery.data ?? [])]
      .sort((a, b) => {
        const aDate = String(pickRowField(a, "created_at") ?? pickRowField(a, "createdAt") ?? "");
        const bDate = String(pickRowField(b, "created_at") ?? pickRowField(b, "createdAt") ?? "");
        return bDate.localeCompare(aDate);
      })
      .slice(0, 5);
  }, [reviewsQuery.data]);

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
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="dashboard-metrics">
              <StatTile
                icon={Wallet}
                label="Revenue"
                value={summary ? formatKES(summary.total_revenue_kes) : "—"}
                loading={reportsQuery.isLoading}
                testId="stat-revenue"
              />
              <StatTile
                icon={CalendarCheck}
                label="Bookings"
                value={summary ? String(summary.total_bookings) : "—"}
                loading={reportsQuery.isLoading}
                testId="stat-bookings"
              />
              <StatTile
                icon={BarChart3}
                label="Completed"
                value={summary ? String(summary.completed_bookings) : "—"}
                loading={reportsQuery.isLoading}
                testId="stat-completed"
              />
              <StatTile
                icon={Users}
                label="Customers"
                value={summary ? String(summary.total_customers) : "—"}
                loading={reportsQuery.isLoading}
                testId="stat-customers"
              />
              <StatTile
                icon={CalendarCheck}
                label="Today"
                value={extras ? String(extras.bookings_today) : "—"}
                loading={extrasQuery.isLoading}
                testId="stat-today"
              />
              <StatTile
                icon={TrendingUp}
                label="No-show rate"
                value={extras ? `${extras.no_show_rate.toFixed(0)}%` : "—"}
                loading={extrasQuery.isLoading}
                color={extras && extras.no_show_rate > 15 ? "text-red-400" : undefined}
                testId="stat-noshow"
              />
              <StatTile
                icon={Target}
                label="Completion rate"
                value={extras ? `${extras.completion_rate.toFixed(0)}%` : "—"}
                loading={extrasQuery.isLoading}
                testId="stat-completion"
              />
              <StatTile
                icon={DollarSign}
                label="Monthly progress"
                value={extras ? formatKES(extras.monthly_progress_kes) : "—"}
                subtitle={extras ? `Target ${formatKES(extras.monthly_target_kes)}` : undefined}
                loading={extrasQuery.isLoading}
                color="text-green-400"
                testId="stat-monthly"
              />
            </div>

            {extras ? (
              <Card className="glass" data-testid="monthly-target">
                <CardContent className="py-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Monthly Revenue Target</p>
                      <p className="text-xs text-muted-foreground">
                        {formatKES(extras.monthly_progress_kes)} of {formatKES(extras.monthly_target_kes)}
                      </p>
                    </div>
                    <span className={`font-heading text-lg font-bold ${targetProgress >= 100 ? "text-green-400" : "text-primary"}`}>
                      {targetProgress}%
                    </span>
                  </div>
                  <Progress value={targetProgress} className="h-3" />
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="glass lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue vs Expenses (7 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueChartQuery.isLoading ? (
                    <p className="text-muted-foreground">Loading chart…</p>
                  ) : (
                    <RevenueChart data={revenueChartQuery.data ?? []} />
                  )}
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentMethodsQuery.isLoading ? (
                    <p className="text-muted-foreground">Loading chart…</p>
                  ) : (
                    <PaymentMethodsChart data={paymentMethodsQuery.data ?? []} />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Top {terms.servicePlural}</CardTitle>
                </CardHeader>
                <CardContent>
                  {topServicesQuery.isLoading ? (
                    <p className="text-muted-foreground">Loading chart…</p>
                  ) : (
                    <TopServicesChart data={topServicesQuery.data ?? []} />
                  )}
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Top {terms.staffPlural}</CardTitle>
                </CardHeader>
                <CardContent>
                  {leaderboardQuery.isLoading ? (
                    <p className="text-muted-foreground">Loading…</p>
                  ) : (
                    <StaffLeaderboard data={leaderboardQuery.data ?? []} />
                  )}
                </CardContent>
              </Card>
              <Card className="glass" data-testid="recent-reviews">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Recent reviews
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reviewsQuery.isLoading ? (
                    <p className="text-muted-foreground">Loading reviews…</p>
                  ) : recentReviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reviews yet.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {recentReviews.map((row) => {
                        const id = String(pickRowField(row, "id") ?? "");
                        const rating = Number(pickRowField(row, "rating") ?? 0);
                        const comment = String(pickRowField(row, "comment") ?? "");
                        const created = String(
                          pickRowField(row, "created_at") ?? pickRowField(row, "createdAt") ?? "",
                        );
                        return (
                          <div key={id} className="py-3 first:pt-0 last:pb-0">
                            <StarDisplay rating={rating} />
                            {comment ? (
                              <p className="mt-1 text-sm text-foreground line-clamp-2">{comment}</p>
                            ) : (
                              <p className="mt-1 text-sm italic text-muted-foreground">No comment</p>
                            )}
                            {created ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(created).toLocaleDateString()}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
              <AiInsightsWidget metrics={aiMetrics} />
            </div>
          </>
        ) : null}

        {scope === "staff" ? (
          <div className="space-y-4" data-testid="staff-dashboard">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile
                icon={CalendarCheck}
                label="Today's appointments"
                value={String(staffBookingsQuery.data?.length ?? 0)}
                loading={staffBookingsQuery.isLoading}
                testId="staff-stat-bookings"
              />
              <StatTile
                icon={Wallet}
                label="Status"
                value={isStaffScoped ? "On floor" : "Active"}
                loading={false}
                testId="staff-stat-status"
              />
              <StatTile
                icon={Clock}
                label="Schedule"
                value={formatDate(today)}
                loading={false}
                testId="staff-stat-date"
              />
            </div>
            <Card className="glass" data-testid="staff-schedule">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Today&apos;s Schedule
              </CardTitle>
              <CardDescription>{formatDate(today)}</CardDescription>
            </CardHeader>
            <CardContent>
              {staffBookingsQuery.isLoading ? (
                <p className="text-muted-foreground">Loading schedule…</p>
              ) : (staffBookingsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No {terms.bookingPlural.toLowerCase()} scheduled for today.</p>
              ) : (
                <div className="divide-y divide-border">
                  {(staffBookingsQuery.data ?? []).slice(0, 10).map((row) => {
                    const id = String(pickRowField(row, "id") ?? "");
                    const status = String(pickRowField(row, "status") ?? "scheduled");
                    const start = String(pickRowField(row, "start_time") ?? pickRowField(row, "startTime") ?? "");
                    return (
                      <div key={id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              status === "completed"
                                ? "bg-green-400"
                                : status === "in_progress"
                                  ? "bg-primary"
                                  : status === "no_show"
                                    ? "bg-red-400"
                                    : "bg-muted-foreground"
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium capitalize text-foreground">{status.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(start)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
