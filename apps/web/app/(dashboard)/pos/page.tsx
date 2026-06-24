"use client";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Feature } from "@/components/Feature";
import { apiClient } from "@/lib/api-client";

export default function POSPage() {
  const { activeOrg } = useAuth();

  async function checkout() {
    if (!activeOrg?.id) return;
    await apiClient(`/organizations/${activeOrg.id}/transactions`, {
      method: "POST",
      body: JSON.stringify({ amountKes: 2500, paymentMethod: "mpesa" }),
    });
    alert("Payment initiated via Pesapal");
  }

  return (
    <AppShell title="POS">
      <Feature flag="pos_payments" fallback={<p>Upgrade to Professional for POS.</p>}>
        <Card className="glass max-w-lg">
          <CardHeader>
            <CardTitle>Point of sale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="stat-tile p-4">
              <p className="text-sm text-muted-foreground">Sample sale</p>
              <p className="text-2xl font-display">KES 2,500</p>
            </div>
            <Button onClick={checkout}>Pay with Pesapal</Button>
          </CardContent>
        </Card>
      </Feature>
    </AppShell>
  );
}
