"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Clock, Scissors, User, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import {
  addMinutesToTime,
  fetchBookings,
  fetchBookingServices,
  fetchOrgCatalog,
  formatKes,
  patchBookingStatus,
  updateBooking,
  type BookingRow,
} from "@/lib/api/booking";
import { readPortalCustomerPhone, usePortalCustomerStore } from "@/lib/store/portal-customer-store";

const UPCOMING_STATUSES = new Set(["scheduled", "confirmed", "in_progress", "pending"]);

export default function PortalReschedulePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const { apiParams } = useBranchFilter();
  const storePhone = usePortalCustomerStore((s) => s.phone);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);

  useEffect(() => {
    setCustomerPhone(readPortalCustomerPhone());
    const unsub = usePortalCustomerStore.persist.onFinishHydration(() => {
      setCustomerPhone(readPortalCustomerPhone());
    });
    return unsub;
  }, [storePhone]);

  const catalogQuery = useQuery({
    queryKey: ["portal-catalog", orgId],
    enabled: !!orgId,
    queryFn: () => fetchOrgCatalog(orgId),
  });

  const bookingsQuery = useQuery({
    queryKey: ["portal-bookings", orgId, customerPhone, apiParams],
    enabled: !!orgId && !!customerPhone,
    queryFn: () =>
      fetchBookings(orgId, {
        customerPhone: customerPhone ?? undefined,
        branchId: apiParams.branch_id,
      }),
  });

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(() => {
    return (bookingsQuery.data ?? []).filter(
      (b) =>
        UPCOMING_STATUSES.has(b.status) &&
        (b.bookingDate >= today || b.status === "in_progress"),
    );
  }, [bookingsQuery.data, today]);

  const staffMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of catalogQuery.data?.staff ?? []) {
      map.set(s.id, s.displayName);
    }
    return map;
  }, [catalogQuery.data?.staff]);

  return (
    <AppShell title="Reschedule">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Change the date and time of an upcoming visit, or cancel if you can no longer make it.
        </p>

        {!customerPhone ? (
          <Card className="glass">
            <CardContent className="space-y-4 py-10 text-center text-sm text-muted-foreground">
              <p>Book an appointment first so we can match your visits to this portal.</p>
              <Button asChild className="bg-gradient-gold text-primary-foreground">
                <Link href="/portal/book">Book now</Link>
              </Button>
            </CardContent>
          </Card>
        ) : bookingsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading bookings…</p>
        ) : upcoming.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No upcoming bookings to reschedule.{" "}
              <Link href="/portal/book" className="text-primary underline">
                Book your next visit
              </Link>
            </CardContent>
          </Card>
        ) : (
          upcoming.map((row) => (
            <RescheduleCard
              key={row.id}
              orgId={orgId}
              row={row}
              staffName={staffMap.get(row.staffId ?? "") ?? "Assigned pro"}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}

function RescheduleCard({
  orgId,
  row,
  staffName,
}: {
  orgId: string;
  row: BookingRow;
  staffName: string;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [bookingDate, setBookingDate] = useState(row.bookingDate.slice(0, 10));
  const [startTime, setStartTime] = useState(row.startTime.slice(0, 5));

  const servicesQuery = useQuery({
    queryKey: ["portal-booking-services", orgId, row.id],
    enabled: !!orgId && !!row.id,
    queryFn: () => fetchBookingServices(orgId, row.id),
  });

  const durationMinutes = (servicesQuery.data ?? []).reduce(
    (sum, s) => sum + s.durationMinutes,
    30,
  );
  const total = (servicesQuery.data ?? []).reduce((sum, s) => sum + s.priceKes, 0);
  const serviceNames = (servicesQuery.data ?? []).map((s) => s.serviceName).join(", ");

  const cancelMut = useMutation({
    mutationFn: () => patchBookingStatus(orgId, row.id, "cancelled"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-bookings", orgId] });
      toast.success("Booking cancelled");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Cancel failed"),
  });

  const rescheduleMut = useMutation({
    mutationFn: () =>
      updateBooking(orgId, row.id, {
        customerId: row.customerId,
        staffId: row.staffId,
        branchId: row.branchId,
        bookingDate,
        startTime,
        endTime: addMinutesToTime(startTime, durationMinutes),
        notes: row.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-bookings", orgId] });
      setEditing(false);
      toast.success("Booking rescheduled");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Reschedule failed"),
  });

  return (
    <Card className="glass" data-testid="portal-reschedule-card">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" />
            {row.bookingDate.slice(0, 10)} · {row.startTime.slice(0, 5)}
          </CardTitle>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize">
            {row.status.replace(/_/g, " ")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {serviceNames ? (
          <p className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            {serviceNames}
          </p>
        ) : null}
        <p className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          {staffName}
        </p>
        <p className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          {row.startTime.slice(0, 5)} – {row.endTime.slice(0, 5)}
        </p>
        {total > 0 ? <p className="font-medium text-foreground">{formatKes(total)}</p> : null}

        {editing ? (
          <form
            className="space-y-3 rounded-lg border border-border/60 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              rescheduleMut.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`date-${row.id}`}>New date</Label>
                <Input
                  id={`date-${row.id}`}
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`time-${row.id}`}>New time</Label>
                <Input
                  id={`time-${row.id}`}
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={rescheduleMut.isPending}>
                Save changes
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <CalendarClock className="mr-1 h-3 w-3" />
              Change date/time
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate()}
            >
              <XCircle className="mr-1 h-3 w-3" />
              Cancel booking
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
