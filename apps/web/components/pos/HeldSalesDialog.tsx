"use client";

import { Pause, Play, Trash2, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatKes } from "@/lib/api/pos";
import type { HeldSale } from "@/lib/held-sales";

interface HeldSalesDialogProps {
  open: boolean;
  onClose: () => void;
  sales: HeldSale[];
  onResume: (id: string) => void;
  onRemove: (id: string) => void;
}

export function HeldSalesDialog({ open, onClose, sales, onResume, onRemove }: HeldSalesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="pos-held-sales-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-4 w-4 text-primary" /> Held sales ({sales.length})
          </DialogTitle>
          <DialogDescription>Resume a parked cart or remove it.</DialogDescription>
        </DialogHeader>
        {sales.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No held sales. Park a cart from POS to see it here.
          </div>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {sales.map((sale) => {
              const total = sale.items.reduce((sum, item) => sum + item.unitPriceKes * item.quantity, 0);
              return (
                <div key={sale.id} className="rounded-lg border border-border/60 bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{sale.label}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(sale.heldAt).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {" · "}
                        {sale.items.length} item{sale.items.length !== 1 ? "s" : ""}
                      </p>
                      <p className="mt-1 text-xs font-bold text-primary">{formatKes(total)}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => {
                          onResume(sale.id);
                          onClose();
                        }}
                      >
                        <Play className="h-3 w-3" /> Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-destructive"
                        onClick={() => onRemove(sale.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
