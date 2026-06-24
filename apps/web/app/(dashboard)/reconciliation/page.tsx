"use client";

import Link from "next/link";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReconciliationPage() {
  return (
    <ModulePage
      title="Reconciliation"
      description="Match collections, fees, and payout clearing against your ledger."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Reconciliation workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Full reconciliation reports will compare Pesapal collections, platform fees, and OpenFloat
            disbursements. For now, review individual ledger entries in Finance.
          </p>
          <Button asChild variant="outline">
            <Link href="/finance#ledger">View ledger entries</Link>
          </Button>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
