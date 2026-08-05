"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { toast } from "sonner";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  createPurchaseOrder,
  fetchPurchaseOrders,
  updatePurchaseOrderStatus,
} from "@/lib/api/inventory-ops";
import { formatKes } from "@/lib/api/pos";

export default function PurchaseOrdersPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const queryClient = useQueryClient();
  const [supplier, setSupplier] = useState("");
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("");

  const posQuery = useQuery({
    queryKey: ["org", orgId, "purchase-orders"],
    queryFn: () => fetchPurchaseOrders(orgId),
    enabled: !!orgId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createPurchaseOrder(orgId, {
        supplier_name: supplier,
        lines: [{ name: itemName, quantity: Number(qty) || 1, unit_cost_kes: Number(unitCost) || 0 }],
      }),
    onSuccess: () => {
      setSupplier("");
      setItemName("");
      setQty("1");
      setUnitCost("");
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "purchase-orders"] });
      toast.success("Purchase order created");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updatePurchaseOrderStatus(orgId, id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "purchase-orders"] });
      if (vars.status === "received") {
        queryClient.invalidateQueries({ queryKey: ["org", orgId, "inventory"] });
      }
      toast.success(`PO marked ${vars.status}`);
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  return (
    <Feature flag="inventory_tracking">
      <ModulePage title="Purchase Orders" description="Draft, send, and receive supplier orders.">
        <div className="space-y-6" data-testid="purchase-orders-page">
          <Card className="glass">
            <CardContent className="grid gap-3 pt-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Supplier</Label>
                <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" data-testid="po-supplier" />
              </div>
              <div className="space-y-2">
                <Label>Item</Label>
                <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Blades box" data-testid="po-item-name" />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Unit cost (KES)</Label>
                <Input type="number" min={0} value={unitCost} onChange={(e) => setUnitCost(e.target.value)} data-testid="po-unit-cost" />
              </div>
              <Button
                className="md:col-span-2 gap-2"
                disabled={!supplier || !itemName}
                onClick={() => createMut.mutate()}
                data-testid="po-create"
              >
                <Plus className="h-4 w-4" />
                Create PO
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Truck className="h-4 w-4" />
              Orders
            </h2>
            {(posQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
            ) : (
              (posQuery.data ?? []).map((po) => (
                <Card key={po.id} className="glass" data-testid="purchase-order-row">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                    <div>
                      <p className="font-medium">{po.supplierName}</p>
                      <p className="text-sm text-muted-foreground">
                        {po.lines.map((l) => `${l.name} ×${l.quantity}`).join(", ")} — {formatKes(po.totalKes)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{po.status}</Badge>
                      {po.status === "draft" ? (
                        <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: po.id, status: "sent" })} data-testid="po-send">
                          Mark sent
                        </Button>
                      ) : null}
                      {po.status === "sent" ? (
                        <Button size="sm" onClick={() => statusMut.mutate({ id: po.id, status: "received" })} data-testid="po-receive">
                          Receive
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </ModulePage>
    </Feature>
  );
}
