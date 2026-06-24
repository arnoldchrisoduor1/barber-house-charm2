"use client";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TipsPage() {
  return (
    <ModulePage
      title="Tips"
      feature="staff_commissions_payroll"
      description="Track and distribute staff tips."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Tips ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tip pooling and per-staff allocation will be available after POS checkout integration.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
