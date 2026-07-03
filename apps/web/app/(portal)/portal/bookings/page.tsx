"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Scissors, User } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import {
  fetchBookings,
  fetchBookingServices,
  fetchOrgCatalog,
  formatKes,
} from "@/lib/api/booking";
import { readPortalCustomerPhone, usePortalCustomerStore } from "@/lib/store/portal-customer-store";

type Tab = "upcoming" | "past";

const UPCOMING_STATUSES = new Set(["scheduled", "confirmed", "in_progress", "pending"]);

function statusClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-500/15 text-green-600";
    case "cancelled":
    case "no_show":
      return "bg-red-500/15 text-red-600";
    case "in_progress":
      return "bg-primary/15 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function PortalBookingsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const { apiParams } = useBranchFilter();
  const storePhone = usePortalCustomerStore((s) => s.phone);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");

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

  const filtered = useMemo(() => {
    const rows = bookingsQuery.data ?? [];
    if (tab === "upcoming") {
      return rows.filter(
        (b) =>
          UPCOMING_STATUSES.has(b.status) &&
          (b.bookingDate >= today || b.status === "in_progress"),
      );
    }
    return rows.filter(
      (b) => !UPCOMING_STATUSES.has(b.status) || b.bookingDate < today,
    );
  }, [bookingsQuery.data, tab, today]);

  const staffMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of catalogQuery.data?.staff ?? []) {
      map.set(s.id, s.displayName);
    }
    return map;
  }, [catalogQuery.data?.staff]);

  return (
    <AppShell title="My bookings">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(["upcoming", "past"] as Tab[]).map((t) => (
            <Button
              key={t}
              type="button"
              variant={tab === t ? "default" : "outline"}
              onClick={() => setTab(t)}
              data-testid={`bookings-tab-${t}`}
            >
              {t === "upcoming" ? "Upcoming" : "Past"}
            </Button>
          ))}
        </div>

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
        ) : filtered.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No {tab} bookings.{" "}
              <Link href="/portal/book" className="text-primary underline">
                Book your next visit
              </Link>
            </CardContent>
          </Card>
        ) : (
          filtered.map((row) => (
            <BookingCard
              key={row.id}
              orgId={orgId}
              row={row}
              staffName={staffMap.get((row as { staffId?: string }).staffId ?? "") ?? "Assigned pro"}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}

function BookingCard({
  orgId,
  row,
  staffName,
}: {
  orgId: string;
  row: { id: string; bookingDate: string; startTime: string; endTime: string; status: string };
  staffName: string;
}) {
  const servicesQuery = useQuery({
    queryKey: ["portal-booking-services", orgId, row.id],
    enabled: !!orgId && !!row.id,
    queryFn: () => fetchBookingServices(orgId, row.id),
  });

  const total = (servicesQuery.data ?? []).reduce((sum, s) => sum + s.priceKes, 0);
  const serviceNames = (servicesQuery.data ?? []).map((s) => s.serviceName).join(", ");

  return (
    <Card className="glass" data-testid="portal-booking-card">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">
            {row.bookingDate.slice(0, 10)} · {row.startTime}
          </CardTitle>
          <span className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${statusClass(row.status)}`}>
            {row.status.replace(/_/g, " ")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
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
          {row.startTime} – {row.endTime}
        </p>
        {total > 0 ? (
          <p className="font-medium text-foreground">{formatKes(total)}</p>
        ) : null}
        {row.status === "scheduled" || row.status === "confirmed" ? (
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link href="/portal/reschedule">
              <Calendar className="mr-1 h-3 w-3" />
              Reschedule
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
