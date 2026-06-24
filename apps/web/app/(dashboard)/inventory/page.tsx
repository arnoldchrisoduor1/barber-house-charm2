"use client";

import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

type InventoryItem = {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
};

export default function InventoryPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["org", orgId, "inventory"],
    enabled: !!orgId,
    queryFn: () => apiClient<{ data: InventoryItem[] }>(`/organizations/${orgId}/inventory`),
  });

  const rows = data?.data ?? [];
  const lowStockCount = rows.filter((item) => item.quantity <= item.reorderLevel).length;

  return (
    <ModulePage
      title="Inventory"
      feature="inventory_tracking"
      description="Stock levels with low-stock highlights."
    >
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock on hand</CardTitle>
          {lowStockCount > 0 ? (
            <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
              {lowStockCount} low-stock item{lowStockCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {error && <p className="text-destructive">Failed to load inventory.</p>}
          <DataTable
            columns={[
              { key: "name", header: "Item" },
              { key: "sku", header: "SKU" },
              {
                key: "quantity",
                header: "Qty",
                render: (row) => {
                  const low = row.quantity <= row.reorderLevel;
                  return (
                    <span className={low ? "font-semibold text-destructive" : undefined}>
                      {row.quantity} {row.unit}
                      {low ? " · low" : ""}
                    </span>
                  );
                },
              },
              { key: "reorderLevel", header: "Reorder at" },
            ]}
            rows={rows}
            emptyMessage="No inventory items yet."
          />
        </CardContent>
      </Card>
    </ModulePage>
  );
}
