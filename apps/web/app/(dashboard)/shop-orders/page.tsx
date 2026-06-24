"use client";

import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShopOrdersPage() {
  return (
    <ModulePage
      title="Shop Orders"
      feature="shop_orders"
      description="Online product orders and fulfillment for retail modes."
    >
      <Card className="glass max-w-xl">
        <CardHeader>
          <CardTitle>Online orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            E-commerce order queue, pick/pack status, and delivery tracking will be wired to
            inventory and POS.
          </p>
        </CardContent>
      </Card>
    </ModulePage>
  );
}
