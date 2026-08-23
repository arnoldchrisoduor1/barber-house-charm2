"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { useCurrentStaffId } from "@/hooks/useCurrentStaffId";
import { advanceFieldJob, fetchFieldJobs } from "@/lib/api/mobile";
import { useEntityList } from "@/lib/api/crud";
import { formatDate, formatTime } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

const NEXT_STATUS: Record<string, string> = {
  assigned: "en_route",
  en_route: "on_site",
  on_site: "done",
};

export function MobileHubDashboard() {
  const { activeOrg } = useAuth();
  const { terms, categories } = useBusinessCategory();
  const staffId = useCurrentStaffId();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const specialty =
    categories.length === 2 && categories[0] === "mobile"
      ? String(categories[1]).replace(/_/g, " ")
      : "Mobile";
  const specialtyTitle = specialty.replace(/\b\w/g, (c) => c.toUpperCase());

  const bookingsQuery = useEntityList<Record<string, unknown>>(orgId, "bookings", {
    date: today,
    ...(staffId ? { staff_id: staffId } : {}),
  });

  const jobsQuery = useQuery({
    queryKey: ["org", orgId, "field-jobs", "hub", staffId],
    queryFn: () => fetchFieldJobs(orgId, staffId ? { staff_id: staffId } : undefined),
    enabled: !!orgId,
  });

  const advanceMut = useMutation({
    mutationFn: (id: string) => advanceFieldJob(orgId, id),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "field-jobs"] });
      toast.success(`Marked ${row.status.replace(/_/g, " ")}`);
    },
    onError: (e: Error) => toast.error(e.message || "Advance failed"),
  });

  const bookings = bookingsQuery.data ?? [];
  const jobs = (jobsQuery.data ?? []).filter((j) => j.status !== "done" && j.status !== "cancelled");
  const current = jobs[0];

  return (
    <div className="space-y-6" data-testid="mobile-hub-dashboard">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Mobile {specialtyTitle} Hub</h1>
        <p className="text-sm text-muted-foreground">
          Your visits and field jobs · {formatDate(today)}
        </p>
      </div>

      {current ? (
        <Card className="glass" data-testid="hub-current-job">
          <CardHeader>
            <CardTitle className="text-base">Current job</CardTitle>
            <CardDescription className="capitalize">{current.status.replace(/_/g, " ")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{current.visit_address || "Address pending"}</p>
            <p className="text-xs text-muted-foreground">{current.notes || "No notes"}</p>
            <div className="flex flex-wrap gap-2">
              {current.visit_address ? (
                <Button type="button" size="sm" variant="outline" asChild>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(current.visit_address)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Navigation className="mr-1 h-3.5 w-3.5" />
                    Navigate
                  </a>
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="outline" asChild>
                <a href="tel:+254700000000">
                  <Phone className="mr-1 h-3.5 w-3.5" />
                  Call
                </a>
              </Button>
              {NEXT_STATUS[current.status] ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => advanceMut.mutate(current.id)}
                  disabled={advanceMut.isPending}
                  data-testid="hub-advance-job"
                >
                  Mark {NEXT_STATUS[current.status].replace(/_/g, " ")}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Today&apos;s {terms.bookingPlural}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsQuery.isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visits on your schedule today.</p>
          ) : (
            <div className="divide-y divide-border">
              {bookings.slice(0, 10).map((row) => {
                const id = String(pickRowField(row, "id") ?? "");
                const status = String(pickRowField(row, "status") ?? "scheduled");
                const start = String(pickRowField(row, "start_time") ?? pickRowField(row, "startTime") ?? "");
                return (
                  <div key={id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium capitalize">{status.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(start)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
