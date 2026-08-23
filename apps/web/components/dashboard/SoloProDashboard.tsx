"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, DollarSign, ShoppingCart } from "lucide-react";

import { StatTile } from "@/components/dashboard/StatTile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentStaffId } from "@/hooks/useCurrentStaffId";
import { api } from "@/lib/api-client";
import { formatKES, formatTime } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

export function SoloProDashboard() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const staffId = useCurrentStaffId();
  const today = new Date().toISOString().slice(0, 10);

  const bookingsQuery = useQuery({
    queryKey: ["org", orgId, "solo-today-bookings", today],
    enabled: !!orgId,
    queryFn: async () => {
      const resp = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/bookings`, {
        params: { status: "" },
      });
      return (resp.data ?? [])
        .filter((row) => {
          const date = String(pickRowField(row, "booking_date") ?? pickRowField(row, "bookingDate") ?? "");
          return date.startsWith(today);
        })
        .sort((a, b) => {
          const aT = String(pickRowField(a, "start_time") ?? pickRowField(a, "startTime") ?? "");
          const bT = String(pickRowField(b, "start_time") ?? pickRowField(b, "startTime") ?? "");
          return aT.localeCompare(bT);
        });
    },
  });

  const earningsQuery = useQuery({
    queryKey: ["org", orgId, "solo-earnings", staffId],
    enabled: Boolean(orgId && staffId),
    queryFn: () =>
      api.get<Record<string, unknown>>(
        `/organizations/${orgId}/analytics/my-earnings${staffId ? `?staff_id=${staffId}` : ""}`,
      ),
  });

  const todayRows = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);
  const next = useMemo(() => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return (
      todayRows.find((row) => {
        const t = String(pickRowField(row, "start_time") ?? pickRowField(row, "startTime") ?? "");
        return t >= hhmm;
      }) ?? todayRows[0]
    );
  }, [todayRows]);

  const commission = Number(pickRowField(earningsQuery.data ?? {}, "commission_kes") ?? 0);
  const revenue = Number(pickRowField(earningsQuery.data ?? {}, "revenue_kes") ?? 0);

  return (
    <div className="space-y-6" data-testid="solo-pro-dashboard">
      <div>
        <h1 className="font-heading text-2xl font-semibold">My Workspace</h1>
        <p className="text-sm text-muted-foreground">Today&apos;s strip, next client, and earnings at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={CalendarCheck}
          label="Today"
          value={bookingsQuery.isLoading ? "—" : String(todayRows.length)}
          loading={bookingsQuery.isLoading}
          testId="solo-stat-today"
        />
        <StatTile
          icon={DollarSign}
          label="Period revenue"
          value={earningsQuery.data ? formatKES(revenue) : "—"}
          loading={earningsQuery.isLoading}
          testId="solo-stat-revenue"
        />
        <StatTile
          icon={DollarSign}
          label="Commission"
          value={earningsQuery.data ? formatKES(commission) : "—"}
          loading={earningsQuery.isLoading}
          testId="solo-stat-commission"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Next appointment</CardTitle>
            <CardDescription>Up next on today&apos;s book</CardDescription>
          </CardHeader>
          <CardContent>
            {!next ? (
              <p className="text-sm text-muted-foreground">No appointments today.</p>
            ) : (
              <div className="space-y-1" data-testid="solo-next-appointment">
                <p className="font-medium">
                  {String(pickRowField(next, "customer_name") ?? pickRowField(next, "customerName") ?? "Client")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(String(pickRowField(next, "start_time") ?? pickRowField(next, "startTime") ?? ""))}
                  {" · "}
                  {String(pickRowField(next, "service_name") ?? pickRowField(next, "serviceName") ?? "Service")}
                </p>
              </div>
            )}
            <Button type="button" size="sm" variant="outline" className="mt-3" asChild>
              <Link href="/bookings">Open bookings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>One-tap paths for a solo day</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" size="sm" asChild>
              <Link href="/pos" data-testid="solo-quick-pos">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Open POS
              </Link>
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/my-earnings">My earnings</Link>
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/schedule">Schedule</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2" data-testid="solo-today-strip">
          {todayRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing booked for today.</p>
          ) : (
            todayRows.slice(0, 8).map((row) => {
              const id = String(pickRowField(row, "id") ?? "");
              return (
                <div key={id} className="flex justify-between text-sm border-b border-border/40 py-1.5 last:border-0">
                  <span>
                    {formatTime(String(pickRowField(row, "start_time") ?? pickRowField(row, "startTime") ?? ""))}
                    {" · "}
                    {String(pickRowField(row, "customer_name") ?? pickRowField(row, "customerName") ?? "Client")}
                  </span>
                  <span className="text-muted-foreground">
                    {String(pickRowField(row, "status") ?? "")}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
