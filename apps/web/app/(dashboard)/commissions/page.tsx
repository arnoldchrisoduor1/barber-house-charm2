"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { fetchCommissionRules, fetchCommissionSummary, formatKes } from "@/lib/api/finance";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type StaffRow = Record<string, unknown>;

function staffLabel(row: StaffRow): string {
  return String(row.display_name ?? row.displayName ?? row.id ?? "Staff");
}

export default function CommissionsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const [period, setPeriod] = useState<"month" | "quarter">("month");

  const { data: staff = [] } = useEntityList<StaffRow>(orgId, "staff");

  const rulesQuery = useQuery({
    queryKey: ["org", orgId, "commission-rules"],
    enabled: !!orgId,
    queryFn: () => fetchCommissionRules(orgId!),
  });

  const summaryQuery = useQuery({
    queryKey: ["org", orgId, "commission-summary", period],
    enabled: !!orgId,
    queryFn: () => fetchCommissionSummary(orgId!, period),
  });

  const staffName = (staffId: string) => {
    const match = staff.find((row) => String(pickRowField(row, "id")) === staffId);
    return match ? staffLabel(match) : staffId.slice(0, 8);
  };

  const rulesRows = (rulesQuery.data ?? []).map((rule) => ({
    id: rule.id,
    staff_id: rule.staffId,
    service_id: rule.serviceId,
    rate_pct: rule.ratePct,
  })) as Record<string, unknown>[];

  const summaryRows = (summaryQuery.data ?? []).map((row) => ({
    staff_id: row.staffId,
    display_name: row.displayName,
    revenue_kes: row.revenueKes,
    commission_kes: row.commissionKes,
    owner_share_kes: row.ownerShareKes,
  })) as Record<string, unknown>[];

  return (
    <ModulePage
      title="Commissions"
      feature="staff_commissions_payroll"
      description="Staff commission rules and period summaries."
    >
      <div className="space-y-6">
        <Card className="glass">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Period summary</CardTitle>
            <Select value={period} onValueChange={(v) => setPeriod(v as "month" | "quarter")}>
              <SelectTrigger className="w-[180px]" aria-label="Commission period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Last month</SelectItem>
                <SelectItem value="quarter">Last quarter</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? <p className="text-muted-foreground">Loading summary…</p> : null}
            {summaryQuery.error ? (
              <p className="text-destructive">Failed to load commission summary.</p>
            ) : null}
            <DataTable
              columns={[
                { key: "display_name", header: "Staff" },
                {
                  key: "revenue_kes",
                  header: "Revenue",
                  render: (row) => formatKes(Number(pickRowField(row, "revenue_kes") ?? 0)),
                },
                {
                  key: "commission_kes",
                  header: "Commission",
                  render: (row) => formatKes(Number(pickRowField(row, "commission_kes") ?? 0)),
                },
                {
                  key: "owner_share_kes",
                  header: "Owner share",
                  render: (row) => formatKes(Number(pickRowField(row, "owner_share_kes") ?? 0)),
                },
              ]}
              rows={summaryRows}
              emptyMessage="No commission data for this period."
            />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Commission rules</CardTitle>
          </CardHeader>
          <CardContent>
            {rulesQuery.isLoading ? <p className="text-muted-foreground">Loading rules…</p> : null}
            {rulesQuery.error ? <p className="text-destructive">Failed to load rules.</p> : null}
            <DataTable
              columns={[
                {
                  key: "staff_id",
                  header: "Staff",
                  render: (row) => staffName(String(pickRowField(row, "staff_id") ?? "")),
                },
                {
                  key: "service_id",
                  header: "Service",
                  render: (row) => {
                    const id = pickRowField(row, "service_id");
                    return id ? String(id).slice(0, 8) : "All services";
                  },
                },
                {
                  key: "rate_pct",
                  header: "Rate %",
                  render: (row) => `${Number(pickRowField(row, "rate_pct") ?? 0)}%`,
                },
              ]}
              rows={rulesRows}
              emptyMessage="No commission rules configured."
            />
          </CardContent>
        </Card>
      </div>
    </ModulePage>
  );
}
