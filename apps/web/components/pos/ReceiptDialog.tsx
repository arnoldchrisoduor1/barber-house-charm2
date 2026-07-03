"use client";

import { Printer, MessageSquare, Mail, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatKes } from "@/lib/api/pos";
import type { PosCartLine } from "@/lib/api/pos";
import type { PayMethod } from "@/components/pos/PaymentDialog";

interface ReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  txId: string;
  items: PosCartLine[];
  payment: {
    method: PayMethod;
    reference?: string;
    cashTendered?: number;
    change?: number;
  } | null;
  total: number;
  customerName?: string;
  customerPhone?: string;
  businessName?: string;
}

export function ReceiptDialog({
  open,
  onClose,
  txId,
  items,
  payment,
  total,
  customerName,
  customerPhone,
  businessName = "Haus of Wellness",
}: ReceiptDialogProps) {
  const buildText = () =>
    [
      `Receipt #${txId.slice(0, 8)}`,
      businessName,
      "",
      ...items.map((i) => `${i.quantity}x ${i.name} — ${formatKes(i.unitPriceKes * i.quantity)}`),
      "",
      `Total: ${formatKes(total)}`,
      payment ? `Paid via ${payment.method.toUpperCase()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    if (!customerPhone) {
      toast.error("No customer phone on file");
      return;
    }
    const url = `https://wa.me/${customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(buildText())}`;
    window.open(url, "_blank");
    toast.success("WhatsApp opened");
  };

  const handleEmail = () => {
    toast.info("Email receipts will be wired to the messaging worker");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="p-0 sm:max-w-sm" data-testid="pos-receipt-dialog">
        <div id="receipt-print" className="bg-card p-6">
          <div className="border-b border-dashed border-border pb-3 text-center">
            <h3 className="font-heading text-lg font-bold">{businessName}</h3>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">Tx #{txId.slice(0, 8)}</p>
          </div>

          {customerName ? (
            <p className="py-3 text-xs">
              Customer: <span className="font-medium">{customerName}</span>
            </p>
          ) : null}

          <div className="space-y-1.5 border-t border-dashed border-border pt-3">
            {items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="text-xs">
                <div className="flex justify-between">
                  <span>{item.name}</span>
                  <span>{formatKes(item.unitPriceKes * item.quantity)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {item.quantity} × {formatKes(item.unitPriceKes)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1 border-t border-dashed border-border pt-3 text-xs">
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>TOTAL</span>
              <span>{formatKes(total)}</span>
            </div>
          </div>

          {payment ? (
            <div className="mt-3 space-y-1 border-t border-dashed border-border pt-3 text-xs">
              <div className="flex justify-between">
                <span>Paid via</span>
                <span className="font-medium uppercase">{payment.method}</span>
              </div>
              {payment.reference ? (
                <div className="flex justify-between">
                  <span>Reference</span>
                  <span className="font-mono">{payment.reference}</span>
                </div>
              ) : null}
              {payment.cashTendered !== undefined ? (
                <>
                  <div className="flex justify-between">
                    <span>Tendered</span>
                    <span>{formatKes(payment.cashTendered)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change</span>
                    <span>{formatKes(payment.change ?? 0)}</span>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <p className="mt-4 text-center text-[10px] text-muted-foreground">Thank you!</p>
        </div>

        <div className="flex gap-2 border-t border-border p-3 print:hidden">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handlePrint}>
            <Printer className="h-3 w-3" /> Print
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handleWhatsApp}>
            <MessageSquare className="h-3 w-3" /> WA
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handleEmail}>
            <Mail className="h-3 w-3" /> Email
          </Button>
          <Button size="sm" className="flex-1 gap-1" onClick={onClose}>
            <X className="h-3 w-3" /> Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
