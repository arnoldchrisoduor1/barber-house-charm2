"use client";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PayrollPage() {
  return (
    <ModulePage
      title="Payroll"
      feature="payroll"
      description="Generate payroll exports for your staff."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Payroll export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Payroll runs are processed asynchronously and delivered as signed downloads. Export
            generation will be wired to the worker pipeline.
          </p>
          <Button variant="outline" disabled>
            Export payroll (coming soon)
          </Button>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
