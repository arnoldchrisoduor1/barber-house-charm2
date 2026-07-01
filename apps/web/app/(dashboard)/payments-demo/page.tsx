"use client";

import { CreditCard } from "lucide-react";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentsDemoPage() {
  return (
    <ModulePage
      title="Payments Demo"
      feature="pos_payments"
      description="UI-only preview of Pesapal checkout flow. No real charges are made."
    >
      <Card className="glass max-w-lg">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Pesapal checkout (demo)</CardTitle>
          <CardDescription>
            This screen demonstrates the payment UX. Connect your Pesapal credentials in production
            to enable live checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Sample order</p>
            <p className="mt-1 text-muted-foreground">Haircut + beard trim</p>
            <p className="mt-2 text-lg font-semibold">KES 2,500</p>
          </div>
          <Button className="w-full bg-gradient-gold text-primary-foreground" disabled>
            Pay with Pesapal (demo)
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo mode — no API calls are made.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
