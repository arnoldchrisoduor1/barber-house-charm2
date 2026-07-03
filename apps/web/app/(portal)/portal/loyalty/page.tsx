"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Gift } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { fetchLoyaltyRewards, fetchLoyaltyWallet, redeemLoyaltyReward } from "@/lib/api/portal";
import { readPortalCustomerPhone, usePortalCustomerStore } from "@/lib/store/portal-customer-store";

const TIER_THRESHOLDS: Record<string, number> = {
  bronze: 100,
  silver: 500,
  gold: 1500,
  platinum: 5000,
};

export default function PortalLoyaltyPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const storePhone = usePortalCustomerStore((s) => s.phone);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    setCustomerPhone(readPortalCustomerPhone());
    const unsub = usePortalCustomerStore.persist.onFinishHydration(() => {
      setCustomerPhone(readPortalCustomerPhone());
    });
    return unsub;
  }, [storePhone]);

  const walletQuery = useQuery({
    queryKey: ["portal-wallet", orgId, customerPhone],
    enabled: !!orgId && !!customerPhone,
    queryFn: () => fetchLoyaltyWallet(orgId, customerPhone!),
  });

  const rewardsQuery = useQuery({
    queryKey: ["portal-rewards", orgId],
    enabled: !!orgId,
    queryFn: () => fetchLoyaltyRewards(orgId),
  });

  const redeemMut = useMutation({
    mutationFn: (rewardId: string) =>
      redeemLoyaltyReward(orgId, walletQuery.data!.customer_id, rewardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-wallet", orgId] });
      toast.success("Reward redeemed!");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Redeem failed"),
  });

  const points = walletQuery.data?.loyalty_points ?? 0;
  const tier = (walletQuery.data?.loyalty_tier ?? "bronze").toLowerCase();
  const nextTier = tier === "bronze" ? "silver" : tier === "silver" ? "gold" : tier === "gold" ? "platinum" : "platinum";
  const nextThreshold = TIER_THRESHOLDS[nextTier] ?? TIER_THRESHOLDS.platinum;
  const progress = Math.min(100, Math.round((points / nextThreshold) * 100));

  const body = !customerPhone ? (
    <Card className="glass">
      <CardContent className="space-y-4 py-10 text-center text-sm text-muted-foreground">
        <p>Book an appointment to start earning loyalty points.</p>
        <Button asChild className="bg-gradient-gold text-primary-foreground">
          <Link href="/portal/book">Book now</Link>
        </Button>
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-6">
      <Card className="glass border-primary/20 bg-gradient-to-br from-primary/10 to-transparent" data-testid="loyalty-wallet">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {walletQuery.data?.full_name ?? "Your wallet"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <span className="font-heading text-4xl font-bold text-primary">{points}</span>
            <span className="pb-1 text-muted-foreground">points</span>
          </div>
          <p className="text-sm capitalize text-muted-foreground">
            Tier: <span className="font-medium text-foreground">{tier}</span>
          </p>
          {tier !== "platinum" ? (
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Progress to {nextTier}</span>
                <span>{points} / {nextThreshold}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
          <Gift className="h-5 w-5 text-primary" />
          Redeemable rewards
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {(rewardsQuery.data ?? []).map((reward) => (
            <Card key={reward.id} className="glass">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{reward.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {reward.points_required} pts
                    {reward.description ? ` · ${reward.description}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={points < reward.points_required || redeemMut.isPending}
                  onClick={() => redeemMut.mutate(reward.id)}
                >
                  Redeem
                </Button>
              </CardContent>
            </Card>
          ))}
          {(rewardsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No rewards available yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );

  return (
    <AppShell title="Loyalty">
      <Feature flag="loyalty">{body}</Feature>
    </AppShell>
  );
}
