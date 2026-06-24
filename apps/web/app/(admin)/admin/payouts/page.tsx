"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPayoutsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Payout oversight</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide disbursement monitoring and retry controls.
        </p>
      </div>
      <Card className="glass max-w-2xl">
        <CardHeader>
          <CardTitle>Cross-tenant payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed payout alerts, OpenFloat reconciliation, and manual retry actions will be
            available here. Tenant payout history remains scoped under each organization&apos;s
            Finance module.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
