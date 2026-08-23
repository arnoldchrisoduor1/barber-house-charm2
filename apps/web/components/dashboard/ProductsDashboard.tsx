"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, TriangleAlert, Wallet } from "lucide-react";

import { StatTile } from "@/components/dashboard/StatTile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { fetchShopDashboard, fetchShopOrders } from "@/lib/api/shop";
import { formatKES } from "@/lib/format";

export function ProductsDashboard() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";

  const dashQuery = useQuery({
    queryKey: ["org", orgId, "shop-dashboard"],
    queryFn: () => fetchShopDashboard(orgId),
    enabled: !!orgId,
  });

  const pendingQuery = useQuery({
    queryKey: ["org", orgId, "shop-orders", "pending"],
    queryFn: () => fetchShopOrders(orgId, "pending"),
    enabled: !!orgId,
  });

  const d = dashQuery.data;
  const pending = pendingQuery.data ?? [];

  return (
    <div className="space-y-6" data-testid="products-dashboard">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Store Dashboard</h1>
        <p className="text-sm text-muted-foreground">Retail KPIs, pending online orders, and stock health.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Wallet} label="Sales today" value={d ? formatKES(d.sales_today_kes) : "—"} loading={dashQuery.isLoading} testId="products-stat-sales" />
        <StatTile icon={ShoppingBag} label="Avg basket" value={d ? formatKES(d.avg_basket_kes) : "—"} loading={dashQuery.isLoading} testId="products-stat-basket" />
        <StatTile icon={Package} label="Pending orders" value={d ? String(d.pending_orders) : "—"} loading={dashQuery.isLoading} testId="products-stat-pending" />
        <StatTile
          icon={TriangleAlert}
          label="Low stock"
          value={d ? String(d.low_stock_count) : "—"}
          loading={dashQuery.isLoading}
          color={d && d.low_stock_count > 0 ? "text-amber-400" : undefined}
          testId="products-stat-low-stock"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Pending online orders</CardTitle>
            <CardDescription>Stock value {d ? formatKES(d.stock_value_kes) : "—"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending orders.</p>
            ) : (
              pending.slice(0, 8).map((o) => (
                <div key={o.id} className="flex justify-between text-sm" data-testid={`products-pending-${o.id}`}>
                  <span>
                    {o.order_number} · {o.customer_name}
                  </span>
                  <span>{formatKES(o.total_kes)}</span>
                </div>
              ))
            )}
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/shop-orders">Open order queue</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Top sellers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(d?.top_sellers ?? []).length === 0 ? (
              <p className="text-muted-foreground">No fulfilled sales yet.</p>
            ) : (
              (d?.top_sellers ?? []).map((s) => (
                <div key={s.product_name} className="flex justify-between">
                  <span>{s.product_name}</span>
                  <span className="text-muted-foreground">{s.qty} sold</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
