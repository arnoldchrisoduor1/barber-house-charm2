"use client";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CommissionsPage() {
  return (
    <ModulePage
      title="Commissions"
      feature="staff_commissions"
      description="Staff commission reports and payout splits."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Commission reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Commission calculations and period statements will appear here once POS and service
            revenue data is connected.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
