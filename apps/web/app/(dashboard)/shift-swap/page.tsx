"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { ModulePage } from "@/components/ModulePage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type SwapRow = Record<string, unknown>;
type StaffRow = Record<string, unknown>;

function swapId(row: SwapRow): string {
  return String(row.id ?? row.ID ?? "");
}

export default function ShiftSwapPage() {
  const { activeOrg, me } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const { data: staff = [] } = useEntityList<StaffRow>(orgId, "staff");

  const canReview = (me?.roles ?? []).some((r) =>
    ["ceo", "director", "branch_manager"].includes(r),
  );

  const [fromStaffId, setFromStaffId] = useState("");
  const [toStaffId, setToStaffId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [shiftLabel, setShiftLabel] = useState("");

  const listQuery = useQuery({
    queryKey: ["org", orgId, "shift-swaps"],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api.get<{ data: SwapRow[] }>(`/organizations/${orgId}/shift-swaps`);
      return res.data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: async () =>
      api.post(`/organizations/${orgId}/shift-swaps`, {
        from_staff_id: fromStaffId,
        to_staff_id: toStaffId,
        schedule_date: scheduleDate,
        shift_label: shiftLabel,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "shift-swaps"] });
      toast.success("Swap requested");
      setFromStaffId("");
      setToStaffId("");
      setScheduleDate("");
      setShiftLabel("");
    },
    onError: (e: Error) => toast.error(e.message || "Request failed"),
  });

  const reviewMut = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) =>
      api.post(`/organizations/${orgId}/shift-swaps/${id}/${approve ? "approve" : "deny"}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "shift-swaps"] });
      toast.success("Swap updated");
    },
    onError: (e: Error) => toast.error(e.message || "Review failed"),
  });

  const staffName = (id: string) => {
    const row = staff.find((s) => String(pickRowField(s, "id")) === id);
    return row ? String(pickRowField(row, "display_name") ?? id) : id;
  };

  const rows = listQuery.data ?? [];

  return (
    <ModulePage
      title="Shift Swap"
      feature="staff_shift_swap"
      description="Staff trade shifts with manager approval."
    >
      <div className="space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Request a swap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={fromStaffId} onValueChange={setFromStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="From staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((row) => {
                    const id = String(pickRowField(row, "id") ?? "");
                    return (
                      <SelectItem key={id} value={id}>
                        {String(pickRowField(row, "display_name") ?? id)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={toStaffId} onValueChange={setToStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Covering staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((row) => {
                    const id = String(pickRowField(row, "id") ?? "");
                    return (
                      <SelectItem key={id} value={id}>
                        {String(pickRowField(row, "display_name") ?? id)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              <Input
                placeholder="Shift (e.g. 9am – 5pm)"
                value={shiftLabel}
                onChange={(e) => setShiftLabel(e.target.value)}
              />
            </div>
            <Button
              data-testid="shift-swap-submit-btn"
              disabled={!fromStaffId || !toStaffId || !scheduleDate || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Submit request
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">All swap requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {listQuery.isLoading && <p className="text-muted-foreground">Loading…</p>}
            {rows.length === 0 && !listQuery.isLoading && (
              <p className="text-muted-foreground">No swap requests yet.</p>
            )}
            {rows.map((row) => {
              const id = swapId(row);
              const fromId = String(pickRowField(row, "from_staff_id") ?? "");
              const toId = String(pickRowField(row, "to_staff_id") ?? "");
              const status = String(pickRowField(row, "status") ?? "pending");
              const date = String(pickRowField(row, "schedule_date") ?? "").slice(0, 10);
              const label = String(pickRowField(row, "shift_label") ?? "");
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                  data-testid={`shift-swap-row-${id}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {staffName(fromId)} → {staffName(toId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {date}
                      {label ? ` · ${label}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      status === "approved" ? "default" : status === "denied" ? "destructive" : "secondary"
                    }
                  >
                    {status}
                  </Badge>
                  {canReview && status === "pending" && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`shift-swap-approve-${id}`}
                        onClick={() => reviewMut.mutate({ id, approve: true })}
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`shift-swap-deny-${id}`}
                        onClick={() => reviewMut.mutate({ id, approve: false })}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
