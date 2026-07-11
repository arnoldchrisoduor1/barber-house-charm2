"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Clock, LogIn, LogOut } from "lucide-react";

import { ModulePage } from "@/components/ModulePage";
import { Feature } from "@/components/Feature";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentStaffId } from "@/hooks/useCurrentStaffId";
import { useMyAttendance } from "@/hooks/useMyAttendance";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { api, apiClient } from "@/lib/api-client";
import { formatAttendanceTime } from "@/lib/format-attendance";
import { pickRowField } from "@/lib/record-fields";
import { useQuery } from "@tanstack/react-query";

export default function QrClockPage() {
  const { activeOrg } = useAuth();
  const staffId = useCurrentStaffId();
  const orgId = activeOrg?.id ?? "";
  const queryClient = useQueryClient();
  const { branches: filterBranches, activeBranchId, setActiveBranchId } = useBranchFilter();
  const [lastAction, setLastAction] = useState<string | null>(null);
  const myAttendance = useMyAttendance();

  const branchesQuery = useQuery({
    queryKey: ["qr-branches", orgId],
    enabled: Boolean(orgId) && filterBranches.length === 0,
    queryFn: async () => {
      const res = await api.get<Record<string, unknown>[] | { data: Record<string, unknown>[] }>(
        `/organizations/${orgId}/branches`,
      );
      const rows = Array.isArray(res) ? res : (res.data ?? []);
      return rows.map((row) => ({
        id: String(pickRowField(row, "id") ?? ""),
        name: String(pickRowField(row, "name") ?? "Branch"),
      }));
    },
  });

  const branches = filterBranches.length > 0 ? filterBranches : (branchesQuery.data ?? []);
  const branchId = activeBranchId ?? branches[0]?.id ?? "";

  const tokenQuery = useQuery({
    queryKey: ["qr-branch-token", orgId, branchId],
    enabled: Boolean(orgId && branchId),
    queryFn: () =>
      apiClient<{ token: string; branch_id: string }>(
        `/organizations/${orgId}/qr/branch-token/${branchId}`,
      ),
  });

  const clockMut = useMutation({
    mutationFn: (scanType: "clock_in" | "clock_out") =>
      api.post(`/organizations/${orgId}/qr/clock`, {
        staff_id: staffId ?? undefined,
        branch_id: branchId,
        scan_type: scanType,
      }),
    onSuccess: (_, scanType) => {
      const label = scanType === "clock_in" ? "Clocked in" : "Clocked out";
      setLastAction(`${label} at ${new Date().toLocaleTimeString()}`);
      toast.success(label);
      void queryClient.invalidateQueries({ queryKey: ["qr-my-attendance", orgId] });
      void queryClient.invalidateQueries({ queryKey: ["qr-attendance", orgId] });
      void queryClient.invalidateQueries({ queryKey: ["qr-scans", orgId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Clock action failed"),
  });

  const qrPayload = tokenQuery.data
    ? JSON.stringify({ org: orgId, branch: branchId, token: tokenQuery.data.token })
    : "";

  const body = (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Branch QR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {branches.length > 1 ? (
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Branch</label>
              <Select value={branchId} onValueChange={setActiveBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div
            className="mx-auto flex aspect-square max-w-xs items-center justify-center rounded-xl border border-border bg-white p-4"
            data-testid="qr-clock-display"
          >
            {tokenQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading QR…</p>
            ) : qrPayload ? (
              <QRCodeSVG value={qrPayload} size={220} level="M" includeMargin />
            ) : (
              <p className="text-sm text-muted-foreground">Select a branch to display QR.</p>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Scan this code at the branch entrance or use the buttons below to record attendance.
          </p>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Record shift</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!staffId ? (
            <p className="text-sm text-muted-foreground">
              No staff profile linked to your account. Ask your manager to link your user to a staff
              record.
            </p>
          ) : (
            <>
              <div
                className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm"
                data-testid="my-attendance-today"
              >
                <div>
                  <p className="text-muted-foreground">Clock in</p>
                  <p className="font-medium text-foreground" data-testid="my-clock-in">
                    {formatAttendanceTime(myAttendance.data?.clock_in)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Clock out</p>
                  <p className="font-medium text-foreground" data-testid="my-clock-out">
                    {formatAttendanceTime(myAttendance.data?.clock_out)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => clockMut.mutate("clock_in")}
                  disabled={!branchId || clockMut.isPending}
                  data-testid="qr-clock-in"
                >
                  <LogIn className="h-4 w-4" />
                  Clock in
                </Button>
                <Button
                  className="flex-1 gap-2"
                  variant="outline"
                  onClick={() => clockMut.mutate("clock_out")}
                  disabled={!branchId || clockMut.isPending}
                  data-testid="qr-clock-out"
                >
                  <LogOut className="h-4 w-4" />
                  Clock out
                </Button>
              </div>
              {lastAction ? (
                <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{lastAction}</p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ModulePage title="QR Clock" description="Self-service clock in and out." feature="qr_clock">
      <Feature flag="qr_clock">{body}</Feature>
    </ModulePage>
  );
}
