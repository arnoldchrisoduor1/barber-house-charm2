"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { advanceShopOrder, fetchShopOrders, type ShopOrder } from "@/lib/api/shop";
import { formatKES } from "@/lib/format";

const NEXT: Record<string, string> = {
  pending: "ready",
  ready: "fulfilled",
};

export default function ShopOrdersPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["org", orgId, "shop-orders"],
    queryFn: () => fetchShopOrders(orgId),
    enabled: !!orgId,
  });

  const advanceMut = useMutation({
    mutationFn: ({ order, status }: { order: ShopOrder; status?: string }) =>
      advanceShopOrder(orgId, order.id, status),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "shop-orders"] });
      toast.success(`Order ${row.order_number} → ${row.status}`);
    },
    onError: (e: Error) => toast.error(e.message || "Advance failed"),
  });

  const orders = listQuery.data ?? [];

  return (
    <ModulePage
      title="Online Orders"
      feature="shop_orders"
      description="Fulfillment queue for storefront orders."
    >
      <div data-testid="shop-orders-page" className="space-y-3">
        {listQuery.isLoading ? (
          <p className="text-muted-foreground">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground">No online orders yet.</p>
        ) : (
          orders.map((order) => {
            const next = NEXT[order.status];
            return (
              <Card key={order.id} className="glass" data-testid={`shop-order-${order.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                    <span>
                      {order.order_number} · {order.customer_name}
                    </span>
                    <span
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary"
                      data-testid={`shop-order-status-${order.id}`}
                    >
                      {order.status}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    {order.fulfillment_type} · {order.payment_method} · {formatKES(order.total_kes)}
                    {order.stock_decremented ? " · stock decremented" : ""}
                  </p>
                  <ul className="text-xs text-muted-foreground">
                    {(order.items ?? []).map((item) => (
                      <li key={item.id}>
                        {item.quantity}× {item.product_name} ({formatKES(item.line_total_kes)})
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {next ? (
                      <Button
                        type="button"
                        size="sm"
                        data-testid={`shop-order-advance-${order.id}`}
                        disabled={advanceMut.isPending}
                        onClick={() => advanceMut.mutate({ order, status: next })}
                      >
                        Mark {next}
                      </Button>
                    ) : null}
                    {order.status === "pending" || order.status === "ready" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={advanceMut.isPending}
                        onClick={() => advanceMut.mutate({ order, status: "cancelled" })}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </ModulePage>
  );
}
