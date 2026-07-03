"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Crown, MapPin, Scissors, Star, Users } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { fetchBookings, fetchOrgCatalog, formatKes } from "@/lib/api/booking";
import { fetchLoyaltyWallet } from "@/lib/api/portal";
import { readPortalCustomerPhone, usePortalCustomerStore } from "@/lib/store/portal-customer-store";

export default function PortalHomePage() {
  const { terms, label } = useBusinessCategory();
  const { activeOrg, me } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const storePhone = usePortalCustomerStore((s) => s.phone);
  const storeName = usePortalCustomerStore((s) => s.fullName);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState("");

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
    queryKey: ["portal-home-bookings", orgId, customerPhone],
    enabled: !!orgId && !!customerPhone,
    queryFn: () => fetchBookings(orgId, { customerPhone: customerPhone ?? undefined }),
  });

  const walletQuery = useQuery({
    queryKey: ["portal-wallet", orgId, customerPhone],
    enabled: !!orgId && !!customerPhone,
    queryFn: () => fetchLoyaltyWallet(orgId, customerPhone!),
    retry: false,
  });

  const nextBooking = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (bookingsQuery.data ?? [])
      .filter((b) => b.status !== "cancelled" && b.status !== "completed" && b.bookingDate >= today)
      .sort((a, b) => `${a.bookingDate}${a.startTime}`.localeCompare(`${b.bookingDate}${b.startTime}`))[0];
  }, [bookingsQuery.data]);

  const branches = useMemo(() => {
    const list = catalogQuery.data?.branches ?? [];
    if (!branchSearch.trim()) return list;
    const q = branchSearch.toLowerCase();
    return list.filter((b) => b.name.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q));
  }, [catalogQuery.data?.branches, branchSearch]);

  const greetingName = storeName ?? me?.user?.fullName?.split(" ")[0] ?? "there";

  return (
    <AppShell title="Customer Portal">
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Hello, {greetingName}</h2>
          <p className="text-sm text-muted-foreground">Discover {label} and manage your visits.</p>
        </div>

        {nextBooking ? (
          <Card className="glass border-primary/30 bg-gradient-to-br from-primary/10 to-transparent" data-testid="portal-next-booking">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Next appointment
              </CardTitle>
              <CardDescription>
                {nextBooking.bookingDate.slice(0, 10)} at {nextBooking.startTime}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs capitalize text-primary">
                {nextBooking.status}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href="/portal/bookings">View details</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
              <div>
                <p className="font-medium">No upcoming visits</p>
                <p className="text-sm text-muted-foreground">{terms.bookingVerb} your next session.</p>
              </div>
              <Button asChild className="bg-gradient-gold text-primary-foreground">
                <Link href="/portal/book">Book now</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Feature flag="loyalty" fallback={null}>
          <Card className="glass">
            <CardContent className="flex items-center justify-between py-5">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Loyalty wallet</p>
                  <p className="text-sm text-muted-foreground">
                    {walletQuery.data
                      ? `${walletQuery.data.loyalty_points} pts · ${walletQuery.data.loyalty_tier}`
                      : customerPhone
                        ? "Sign in after booking to view points"
                        : "Book first to earn rewards"}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/loyalty">View rewards</Link>
              </Button>
            </CardContent>
          </Card>
        </Feature>

        <section>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="font-heading text-lg font-semibold">Branches</h3>
            <Input
              placeholder="Search branches…"
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <Card key={branch.id} className="glass">
                <CardContent className="py-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">{branch.name}</p>
                      {branch.address ? (
                        <p className="text-xs text-muted-foreground">{branch.address}</p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-heading text-lg font-semibold">Featured {terms.servicePlural.toLowerCase()}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(catalogQuery.data?.services ?? []).slice(0, 6).map((service) => (
              <Card key={service.id} className="glass">
                <CardContent className="py-4">
                  <div className="flex items-start gap-2">
                    <Scissors className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.durationMinutes} min · {formatKes(service.priceKes)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
            <Users className="h-5 w-5 text-primary" />
            Top {terms.staffPlural.toLowerCase()}
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {(catalogQuery.data?.staff ?? []).slice(0, 8).map((member) => (
              <Card key={member.id} className="glass min-w-[160px] shrink-0">
                <CardContent className="py-4 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
                    {member.displayName.charAt(0)}
                  </div>
                  <p className="text-sm font-medium">{member.displayName}</p>
                  <p className="text-xs capitalize text-muted-foreground">{member.title ?? member.role}</p>
                  <div className="mt-1 flex items-center justify-center gap-0.5 text-xs text-primary">
                    <Star className="h-3 w-3 fill-current" />
                    Pro
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
