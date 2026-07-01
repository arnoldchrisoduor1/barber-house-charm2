"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { fetchBookings } from "@/lib/api/booking";
import { readPortalCustomerPhone, usePortalCustomerStore } from "@/lib/store/portal-customer-store";

export default function PortalBookingsPage() {
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

  const bookingsQuery = useQuery({
    queryKey: ["portal-bookings", orgId, customerPhone, apiParams],
    enabled: !!orgId && !!customerPhone,
    queryFn: () =>
      fetchBookings(orgId, {
        customerPhone: customerPhone ?? undefined,
        branchId: apiParams.branch_id,
      }),
  });

  const rows = bookingsQuery.data ?? [];

  return (
    <AppShell title="My bookings">
      <div className="space-y-4">
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
        ) : rows.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No bookings found for {customerPhone}.{" "}
              <Link href="/portal/book" className="text-primary underline">
                Book your next visit
              </Link>
            </CardContent>
          </Card>
        ) : (
          rows.map((row) => (
            <Card key={row.id} className="glass" data-testid="portal-booking-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {row.bookingDate.slice(0, 10)} {row.startTime}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Status: <span className="capitalize text-foreground">{row.status}</span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
