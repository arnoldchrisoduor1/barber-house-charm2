"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin, Truck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { fetchFieldJobs } from "@/lib/api/mobile";
import { useEntityList } from "@/lib/api/crud";
import { formatDate, formatTime } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

export function MobileDispatchDashboard() {
  const { activeOrg } = useAuth();
  const { terms, categories } = useBusinessCategory();
  const orgId = activeOrg?.id ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const specialty =
    categories.length === 2 && categories[0] === "mobile"
      ? String(categories[1]).replace(/_/g, " ")
      : "Mobile";
  const specialtyTitle = specialty.replace(/\b\w/g, (c) => c.toUpperCase());

  const bookingsQuery = useEntityList<Record<string, unknown>>(orgId, "bookings", {
    date: today,
  });
  const jobsQuery = useQuery({
    queryKey: ["org", orgId, "field-jobs", "dispatch"],
    queryFn: () => fetchFieldJobs(orgId),
    enabled: !!orgId,
  });

  const bookings = bookingsQuery.data ?? [];
  const jobs = (jobsQuery.data ?? []).filter((j) => j.status !== "done" && j.status !== "cancelled");

  return (
    <div className="space-y-6" data-testid="mobile-dispatch-dashboard">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Mobile {specialtyTitle} Dispatch</h1>
        <p className="text-sm text-muted-foreground">
          Today&apos;s home visits and field jobs · {formatDate(today)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Today&apos;s {terms.bookingPlural}
            </CardTitle>
            <CardDescription>{bookings.length} scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsQuery.isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visits booked for today.</p>
            ) : (
              <div className="divide-y divide-border">
                {bookings.slice(0, 12).map((row) => {
                  const id = String(pickRowField(row, "id") ?? "");
                  const status = String(pickRowField(row, "status") ?? "scheduled");
                  const start = String(pickRowField(row, "start_time") ?? pickRowField(row, "startTime") ?? "");
                  const address = String(pickRowField(row, "visit_address") ?? pickRowField(row, "visitAddress") ?? "");
                  return (
                    <div key={id} className="flex min-w-0 flex-wrap items-start justify-between gap-2 py-2.5" data-testid={`dispatch-booking-${id}`}>
                      <div>
                        <p className="text-sm font-medium capitalize">{status.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(start)}
                          {address ? ` · ${address}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-primary" />
              Open field jobs
            </CardTitle>
            <CardDescription>{jobs.length} active</CardDescription>
          </CardHeader>
          <CardContent>
            {jobsQuery.isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open field jobs.</p>
            ) : (
              <div className="space-y-2">
                {jobs.slice(0, 12).map((job) => (
                  <div
                    key={job.id}
                    className="flex min-w-0 flex-wrap items-start justify-between gap-2 rounded-lg border border-border/40 px-3 py-2"
                    data-testid={`dispatch-job-${job.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{job.visit_address || "No address"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{job.status.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
