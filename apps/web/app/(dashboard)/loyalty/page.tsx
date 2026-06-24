"use client";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoyaltyPage() {
  return (
    <ModulePage
      title="Loyalty"
      feature="loyalty"
      description="Points, tiers, and reward redemptions."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Loyalty program</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure earn rules, tier thresholds, and reward catalog. Customer balances sync from
            CRM and transaction history.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
