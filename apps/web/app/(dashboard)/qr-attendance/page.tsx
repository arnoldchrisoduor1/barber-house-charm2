"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";

import { ModulePage } from "@/components/ModulePage";
import { Feature } from "@/components/Feature";
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
import { DataTable } from "@/components/DataTable";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { apiClient } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

type ScanRow = {
  id: string;
  staffId: string;
  scanType: string;
  scannedAt: string;
};

type AttendanceRow = {
  staffId: string;
  displayName: string;
  clockIn: string | null;
  clockOut: string | null;
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function QrAttendancePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const { branches: filterBranches, activeBranchId, setActiveBranchId, apiParams } = useBranchFilter();
  const branchId = activeBranchId ?? filterBranches[0]?.id ?? "";
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const branchesQuery = useQuery({
    queryKey: ["qr-branches", orgId],
    enabled: Boolean(orgId) && filterBranches.length === 0,
    queryFn: async () => {
      const res = await apiClient<Record<string, unknown>[] | { data: Record<string, unknown>[] }>(
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
  const effectiveBranchId = activeBranchId ?? branches[0]?.id ?? branchId;

  const tokenQuery = useQuery({
    queryKey: ["qr-branch-token", orgId, effectiveBranchId],
    enabled: Boolean(orgId && effectiveBranchId),
    queryFn: () =>
      apiClient<{ token: string }>(`/organizations/${orgId}/qr/branch-token/${effectiveBranchId}`),
  });

  const scansQuery = useQuery({
    queryKey: ["qr-scans", orgId, date],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const res = await apiClient<{ data: Record<string, unknown>[] }>(
        `/organizations/${orgId}/qr/scans`,
        { params: { date } },
      );
      return (res.data ?? []).map(
        (row): ScanRow => ({
          id: String(pickRowField(row, "id") ?? ""),
          staffId: String(pickRowField(row, "staff_id") ?? ""),
          scanType: String(pickRowField(row, "scan_type") ?? ""),
          scannedAt: String(pickRowField(row, "scanned_at") ?? ""),
        }),
      );
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ["qr-attendance", orgId, date, apiParams],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const res = await apiClient<{ data: Record<string, unknown>[] }>(
        `/organizations/${orgId}/qr/attendance`,
        { params: { date, ...apiParams } },
      );
      return (res.data ?? []).map(
        (row): AttendanceRow => ({
          staffId: String(pickRowField(row, "staff_id") ?? pickRowField(row, "StaffID") ?? ""),
          displayName: String(pickRowField(row, "display_name") ?? pickRowField(row, "DisplayName") ?? ""),
          clockIn: pickRowField(row, "clock_in") ? String(pickRowField(row, "clock_in")) : null,
          clockOut: pickRowField(row, "clock_out") ? String(pickRowField(row, "clock_out")) : null,
        }),
      );
    },
  });

  const qrPayload = tokenQuery.data
    ? JSON.stringify({ org: orgId, branch: effectiveBranchId, token: tokenQuery.data.token })
    : "";

  const body = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        {branches.length > 0 ? (
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Branch</label>
            <Select value={effectiveBranchId} onValueChange={setActiveBranchId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Branch" />
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass lg:col-span-1">
          <CardHeader>
            <CardTitle>Entrance QR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="mx-auto flex aspect-square max-w-[200px] items-center justify-center rounded-xl border border-border bg-white p-3"
              data-testid="qr-attendance-display"
            >
              {qrPayload ? (
                <QRCodeSVG value={qrPayload} size={170} level="M" includeMargin />
              ) : (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={!qrPayload}
              onClick={() => {
                const svg = document.querySelector("[data-testid='qr-attendance-display'] svg");
                if (!svg) return;
                const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `branch-qr-${effectiveBranchId.slice(0, 8)}.svg`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4" />
              Download QR
            </Button>
          </CardContent>
        </Card>

        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading attendance…</p>
            ) : (
              <DataTable
                columns={[
                  { key: "displayName", header: "Staff" },
                  {
                    key: "clockIn",
                    header: "Clock in",
                    render: (r) => formatTime(r.clockIn),
                  },
                  {
                    key: "clockOut",
                    header: "Clock out",
                    render: (r) => formatTime(r.clockOut),
                  },
                ]}
                rows={attendanceQuery.data ?? []}
                emptyMessage="No attendance records for this date."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Scan log</CardTitle>
        </CardHeader>
        <CardContent>
          {scansQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading scans…</p>
          ) : (
            <DataTable
              columns={[
                { key: "scannedAt", header: "Time", render: (r) => formatTime(r.scannedAt) },
                { key: "scanType", header: "Type" },
                { key: "staffId", header: "Staff", render: (r) => r.staffId.slice(0, 8) + "…" },
              ]}
              rows={scansQuery.data ?? []}
              emptyMessage="No scans recorded for this date."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ModulePage title="QR Attendance" description="Manager view for staff QR check-in." feature="qr_clock">
      <Feature flag="qr_clock">{body}</Feature>
    </ModulePage>
  );
}
