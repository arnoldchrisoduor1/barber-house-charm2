"use client";

import { LockKeyhole, Unlock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatKes, type PosShiftRow } from "@/lib/api/finance";

interface ShiftDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "open" | "close";
  shift?: PosShiftRow | null;
  expectedCash?: number;
  onOpen: (floatKes: number) => void | Promise<void>;
  onCloseShift: (countedKes: number) => void | Promise<void>;
}

export function ShiftDialog({
  open,
  onClose,
  mode,
  shift,
  expectedCash = 0,
  onOpen,
  onCloseShift,
}: ShiftDialogProps) {
  const [floatKes, setFloatKes] = useState("2000");
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFloatKes("2000");
    setCounted("");
    setNotes("");
    setSubmitting(false);
  }, [open, mode]);

  const variance = counted ? Number.parseFloat(counted) - expectedCash : 0;

  async function handleOpen() {
    setSubmitting(true);
    try {
      await onOpen(Number.parseFloat(floatKes) || 0);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    setSubmitting(true);
    try {
      await onCloseShift(Number.parseFloat(counted) || 0);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent data-testid="pos-shift-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "open" ? (
              <>
                <Unlock className="h-5 w-5 text-green-500" /> Open shift
              </>
            ) : (
              <>
                <LockKeyhole className="h-5 w-5 text-orange-500" /> Close shift
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === "open" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Count the cash in the till and record the opening float.
            </p>
            <div>
              <Label htmlFor="opening-float">Opening cash float (KES)</Label>
              <Input
                id="opening-float"
                type="number"
                min={0}
                value={floatKes}
                onChange={(e) => setFloatKes(e.target.value)}
              />
            </div>
            <Button className="w-full" disabled={submitting} onClick={handleOpen}>
              {submitting ? "Opening…" : "Open shift"}
            </Button>
          </div>
        ) : null}

        {mode === "close" && shift ? (
          <div className="space-y-4">
            <div className="space-y-1 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opened</span>
                <span>{shift.openedAt ? new Date(shift.openedAt).toLocaleString() : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening float</span>
                <span className="font-medium">{formatKes(shift.openingFloatKes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash sales</span>
                <span className="font-medium">
                  {formatKes(Math.max(0, expectedCash - shift.openingFloatKes))}
                </span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1">
                <span>Expected in till</span>
                <span className="font-bold text-primary">{formatKes(expectedCash)}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="counted-cash">Counted cash (KES)</Label>
              <Input
                id="counted-cash"
                type="number"
                min={0}
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
                placeholder="Count physical cash"
              />
            </div>
            {counted ? (
              <div
                className={`flex items-center gap-2 rounded-lg border p-3 ${
                  Math.abs(variance) < 1
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-orange-500/30 bg-orange-500/10"
                }`}
              >
                {Math.abs(variance) < 1 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                )}
                <div className="flex-1 text-sm">
                  <p className="font-medium">
                    Variance:{" "}
                    <span className={variance >= 0 ? "text-green-500" : "text-orange-500"}>
                      {variance >= 0 ? "+" : ""}
                      {formatKes(variance)}
                    </span>
                  </p>
                </div>
              </div>
            ) : null}
            <div>
              <Label htmlFor="shift-notes">Notes (optional)</Label>
              <Textarea
                id="shift-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any incidents or explanations…"
              />
            </div>
            <Button className="w-full" disabled={!counted || submitting} onClick={handleClose}>
              {submitting ? "Closing…" : "Close shift"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
