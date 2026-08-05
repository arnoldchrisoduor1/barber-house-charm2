"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  createStockTake,
  fetchStockTakes,
  finalizeStockTake,
  updateStockTakeLines,
  type StockTake,
} from "@/lib/api/inventory-ops";

export default function StockTakePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const queryClient = useQueryClient();
  const [activeTake, setActiveTake] = useState<StockTake | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const takesQuery = useQuery({
    queryKey: ["org", orgId, "stock-takes"],
    queryFn: () => fetchStockTakes(orgId),
    enabled: !!orgId,
  });

  const createMut = useMutation({
    mutationFn: () => createStockTake(orgId),
    onSuccess: (take) => {
      setActiveTake(take);
      const next: Record<string, number> = {};
      take.lines.forEach((l) => {
        next[l.inventoryId] = l.countedQty;
      });
      setCounts(next);
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "stock-takes"] });
      toast.success("Stock take started");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      if (!activeTake) throw new Error("No active stock take");
      return updateStockTakeLines(
        orgId,
        activeTake.id,
        activeTake.lines.map((l) => ({
          inventory_id: l.inventoryId,
          counted_qty: counts[l.inventoryId] ?? l.countedQty,
        })),
      );
    },
    onSuccess: (take) => {
      setActiveTake(take);
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "stock-takes"] });
      toast.success("Counts saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const finalizeMut = useMutation({
    mutationFn: async () => {
      if (!activeTake) throw new Error("No active stock take");
      await updateStockTakeLines(
        orgId,
        activeTake.id,
        activeTake.lines.map((l) => ({
          inventory_id: l.inventoryId,
          counted_qty: counts[l.inventoryId] ?? l.countedQty,
        })),
      );
      return finalizeStockTake(orgId, activeTake.id);
    },
    onSuccess: () => {
      setActiveTake(null);
      setCounts({});
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "stock-takes"] });
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "inventory"] });
      toast.success("Stock take finalized — inventory updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const openTake = (take: StockTake) => {
    setActiveTake(take);
    const next: Record<string, number> = {};
    take.lines.forEach((l) => {
      next[l.inventoryId] = l.countedQty;
    });
    setCounts(next);
  };

  return (
    <Feature flag="inventory_tracking">
      <ModulePage title="Stock Take" description="Count on-hand stock and apply adjustments.">
        <div className="space-y-6" data-testid="stock-take-page">
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" onClick={() => createMut.mutate()} disabled={createMut.isPending} data-testid="stock-take-start">
              <Plus className="h-4 w-4" />
              New stock take
            </Button>
          </div>

          {activeTake ? (
            <Card className="glass">
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{activeTake.label}</p>
                    <Badge variant={activeTake.status === "finalized" ? "secondary" : "default"}>{activeTake.status}</Badge>
                  </div>
                  {activeTake.status === "draft" ? (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                        Save counts
                      </Button>
                      <Button onClick={() => finalizeMut.mutate()} disabled={finalizeMut.isPending} data-testid="stock-take-finalize">
                        Finalize
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="divide-y rounded-md border">
                  {activeTake.lines.map((line) => (
                    <div key={line.inventoryId} className="grid gap-2 p-3 sm:grid-cols-4 sm:items-center" data-testid="stock-take-line">
                      <p className="font-medium sm:col-span-2">{line.itemName || line.inventoryId.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">Expected: {line.expectedQty}</p>
                      {activeTake.status === "draft" ? (
                        <Input
                          type="number"
                          min={0}
                          value={counts[line.inventoryId] ?? line.countedQty}
                          onChange={(e) => setCounts((prev) => ({ ...prev, [line.inventoryId]: Number(e.target.value) }))}
                          data-testid={`stock-count-${line.inventoryId}`}
                        />
                      ) : (
                        <p className="text-sm">Counted: {line.countedQty}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              Past stock takes
            </h2>
            {(takesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock takes yet.</p>
            ) : (
              (takesQuery.data ?? []).map((take) => (
                <button
                  key={take.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted/50"
                  onClick={() => openTake(take)}
                >
                  <span>{take.label}</span>
                  <Badge variant="outline">{take.status}</Badge>
                </button>
              ))
            )}
          </div>
        </div>
      </ModulePage>
    </Feature>
  );
}
