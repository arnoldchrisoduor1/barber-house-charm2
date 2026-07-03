"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Copy, Gift, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/DataTable";
import { usePortalCustomer } from "@/hooks/usePortalCustomer";
import { fetchMyReferrals } from "@/lib/api/portal";
import { formatKes } from "@/lib/api/booking";

export default function PortalReferralsPage() {
  const { orgId, phone, referralCode, hasCustomerRecord } = usePortalCustomer();

  const referralsQuery = useQuery({
    queryKey: ["portal-referrals", orgId, phone],
    enabled: !!orgId && !!phone && hasCustomerRecord,
    queryFn: () => fetchMyReferrals(orgId, phone!),
    retry: false,
  });

  const code = referralsQuery.data?.referral_code ?? referralCode ?? "";
  const referrals = referralsQuery.data?.referrals ?? [];

  function copyCode() {
    if (!code) return;
    void navigator.clipboard.writeText(code);
    toast.success("Referral code copied");
  }

  const body = !phone ? (
    <Card className="glass">
      <CardContent className="space-y-4 py-10 text-center text-sm text-muted-foreground">
        <p>Book a visit to get your personal referral code.</p>
        <Button asChild className="bg-gradient-gold text-primary-foreground">
          <Link href="/portal/profile">Set up your profile</Link>
        </Button>
      </CardContent>
    </Card>
  ) : !hasCustomerRecord ? (
    <Card className="glass">
      <CardContent className="space-y-4 py-10 text-center text-sm text-muted-foreground">
        <p>Book a visit to get your personal referral code.</p>
        <Button asChild className="bg-gradient-gold text-primary-foreground">
          <Link href="/portal/book">Book now</Link>
        </Button>
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-6">
      <Card className="glass border-primary/20" data-testid="referral-code">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Your referral code
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <code className="rounded-lg bg-muted px-4 py-2 font-mono text-lg" data-testid="referral-code-value">
            {code || "—"}
          </code>
          <Button variant="outline" size="sm" className="gap-2" onClick={copyCode} disabled={!code}>
            <Copy className="h-4 w-4" />
            Copy code
          </Button>
          <p className="w-full text-sm text-muted-foreground">
            Share this code with friends. You earn rewards when they book their first visit.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="glass">
          <CardContent className="flex items-center gap-3 py-5">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{referralsQuery.data?.total ?? referrals.length}</p>
              <p className="text-sm text-muted-foreground">Total referrals</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Referral history</CardTitle>
        </CardHeader>
        <CardContent>
          {referralsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <DataTable
              columns={[
                {
                  key: "referred_name",
                  header: "Referred",
                  render: (r) => String(r.referred_name ?? r.referredName ?? "Guest"),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => String(r.status ?? "pending"),
                },
                {
                  key: "reward_kes",
                  header: "Reward",
                  render: (r) => formatKes(Number(r.reward_kes ?? r.rewardKes ?? 0)),
                },
              ]}
              rows={referrals as unknown as Record<string, unknown>[]}
              emptyMessage="No referrals yet — share your code to get started."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppShell title="Referrals">
      <Feature flag="referrals">{body}</Feature>
    </AppShell>
  );
}
