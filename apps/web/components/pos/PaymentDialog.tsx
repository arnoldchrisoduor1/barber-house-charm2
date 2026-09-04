"use client";

import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKes } from "@/lib/api/pos";

export type PayMethod = "cash" | "mpesa" | "card";

interface PaymentDialogProps {
  open: boolean;
  total: number;
  defaultPhone?: string;
  onClose: () => void;
  onConfirm: (result: {
    method: PayMethod;
    reference?: string;
    cashTendered?: number;
    change?: number;
    tipAmountKes?: number;
  }) => Promise<void>;
}

const TIP_PRESETS_PCT = [0, 5, 10, 15];

const METHODS: { id: PayMethod; label: string; Icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash", Icon: Banknote },
  { id: "mpesa", label: "M-Pesa", Icon: Smartphone },
  { id: "card", label: "Card", Icon: CreditCard },
];

export function PaymentDialog({ open, total, defaultPhone, onClose, onConfirm }: PaymentDialogProps) {
  const [method, setMethod] = useState<PayMethod>("cash");
  const [reference, setReference] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [tipPct, setTipPct] = useState(0);
  const [tipAmount, setTipAmount] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMethod("cash");
    setReference("");
    setCashTendered(String(total));
    setTipPct(0);
    setTipAmount("0");
    setError(null);
  }, [open, total]);

  function applyTipPct(pct: number) {
    setTipPct(pct);
    setTipAmount(String(Math.round((total * pct) / 100)));
  }

  const change =
    method === "cash" && cashTendered ? Math.max(0, Number.parseFloat(cashTendered) - total) : 0;

  async function handleConfirm() {
    setError(null);
    const tipAmountKes = Math.max(0, Math.round(Number.parseFloat(tipAmount || "0")) || 0);

    if (method === "cash") {
      const tendered = Number.parseFloat(cashTendered || "0");
      if (tendered < total) {
        setError("Cash tendered is less than total");
        return;
      }
      setSubmitting(true);
      try {
        await onConfirm({ method, cashTendered: tendered, change, tipAmountKes });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (method === "mpesa" && !reference.trim()) {
      setReference(`POS${Date.now().toString().slice(-8)}`);
    }

    setSubmitting(true);
    try {
      await onConfirm({ method, reference: reference.trim() || undefined, tipAmountKes });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span>Take payment</span>
            <span className="font-heading text-2xl text-primary">{formatKes(total)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {METHODS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border p-3 text-xs transition-colors ${
                method === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>

        {method === "cash" ? (
          <div className="space-y-2">
            <Label htmlFor="cash-tendered">Cash tendered</Label>
            <Input
              id="cash-tendered"
              type="number"
              min={0}
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">Change: {formatKes(change)}</p>
          </div>
        ) : null}

        {method === "mpesa" ? (
          <div className="space-y-2">
            <Label htmlFor="mpesa-ref">M-Pesa receipt / reference</Label>
            <Input
              id="mpesa-ref"
              placeholder={defaultPhone ? `Receipt for ${defaultPhone}` : "QHK7XXXXXX"}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Pesapal STK is not wired yet — enter a manual reference for testing.
            </p>
          </div>
        ) : null}

        {method === "card" ? (
          <div className="space-y-2">
            <Label htmlFor="card-ref">Card terminal reference (optional)</Label>
            <Input
              id="card-ref"
              placeholder="Terminal ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Pesapal card checkout is not wired yet — record manual terminal payments for testing.
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>Tip for barber (optional)</Label>
          <div className="grid grid-cols-4 gap-2">
            {TIP_PRESETS_PCT.map((pct) => (
              <button
                key={pct}
                type="button"
                data-testid={`tip-preset-${pct}`}
                onClick={() => applyTipPct(pct)}
                className={`min-h-11 rounded-lg border p-2 text-xs transition-colors ${
                  tipPct === pct
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {pct === 0 ? "No tip" : `${pct}%`}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min={0}
            value={tipAmount}
            onChange={(e) => {
              setTipPct(0);
              setTipAmount(e.target.value);
            }}
            aria-label="Tip amount (KES)"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-gold text-primary-foreground"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Processing…" : "Complete sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
