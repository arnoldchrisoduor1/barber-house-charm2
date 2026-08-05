"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchBookingDeposits,
  fetchBookingPolicy,
  formatKes,
  updateBookingPolicy,
  type BookingPolicy,
} from "@/lib/api/booking-deposits";

const DEFAULT_POLICY: BookingPolicy = {
  deposits_enabled: false,
  deposit_type: "percent",
  deposit_amount: 25,
  refund_window_hours: 24,
  late_cancel_fee_kes: 0,
  late_cancel_hours: 24,
};

export default function BookingDepositsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const queryClient = useQueryClient();
  const [policy, setPolicy] = useState<BookingPolicy>(DEFAULT_POLICY);

  const policyQuery = useQuery({
    queryKey: ["org", orgId, "booking-policy"],
    queryFn: () => fetchBookingPolicy(orgId!),
    enabled: Boolean(orgId),
  });

  const depositsQuery = useQuery({
    queryKey: ["org", orgId, "booking-deposits"],
    queryFn: () => fetchBookingDeposits(orgId!),
    enabled: Boolean(orgId),
  });

  useEffect(() => {
    if (policyQuery.data) {
      setPolicy(policyQuery.data);
    }
  }, [policyQuery.data]);

  const saveMut = useMutation({
    mutationFn: () => updateBookingPolicy(orgId!, policy),
    onSuccess: (saved) => {
      setPolicy(saved);
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "booking-policy"] });
      toast.success("Deposit configuration saved");
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  function update(patch: Partial<BookingPolicy>) {
    setPolicy((prev) => ({ ...prev, ...patch }));
  }

  const content = (
    <>
      <Card className="glass">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-base">Enable deposits</Label>
              <p className="text-sm text-muted-foreground">Customers pay before the slot is reserved</p>
            </div>
            <Switch
              checked={policy.deposits_enabled}
              onCheckedChange={(v) => update({ deposits_enabled: v })}
              data-testid="deposits-enabled-switch"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                value={policy.deposit_type}
                onChange={(e) => update({ deposit_type: e.target.value as BookingPolicy["deposit_type"] })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed (KES)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                value={policy.deposit_amount}
                onChange={(e) => update({ deposit_amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Refundable window (hours)</Label>
              <Input
                type="number"
                min={0}
                value={policy.refund_window_hours}
                onChange={(e) => update({ refund_window_hours: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Late cancel fee (KES)</Label>
              <Input
                type="number"
                min={0}
                value={policy.late_cancel_fee_kes}
                onChange={(e) => update({ late_cancel_fee_kes: Number(e.target.value) })}
                data-testid="late-cancel-fee-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Late cancel window (hours before appointment)</Label>
              <Input
                type="number"
                min={0}
                value={policy.late_cancel_hours}
                onChange={(e) => update({ late_cancel_hours: Number(e.target.value) })}
              />
            </div>
          </div>

          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || policyQuery.isLoading}
            data-testid="save-booking-policy"
          >
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5" />
            Recent Deposits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {depositsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading deposits…</p>
          ) : (depositsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No deposits recorded yet.</p>
          ) : (
            (depositsQuery.data ?? []).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-lg bg-muted/40 p-3"
                data-testid="booking-deposit-row"
              >
                <div>
                  <div className="font-medium">Booking {row.bookingId.slice(0, 8)}</div>
                  <div className="text-sm text-muted-foreground">Customer {row.customerId.slice(0, 8)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono">{formatKes(row.amountKes)}</div>
                  <Badge variant={row.status === "paid" ? "default" : "secondary"}>{row.status}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );

  return (
    <Feature flag="booking_deposits" fallback={<p>Upgrade to Professional with POS for booking deposits.</p>}>
      <div data-testid="booking-deposits-page">
        <ModulePage
          title="Online Deposits"
          description="Reduce no-shows by collecting deposits at booking and charging late cancellation fees."
        >
          {content}
        </ModulePage>
      </div>
    </Feature>
  );
}
