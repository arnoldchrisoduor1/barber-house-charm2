"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { DataTable } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchCommissionLines,
  fetchCommissionRules,
  fetchCommissionSummary,
  formatKes,
  reverseCommissionLine,
} from "@/lib/api/finance";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type StaffRow = Record<string, unknown>;

function staffLabel(row: StaffRow): string {
  return String(row.display_name ?? row.displayName ?? row.id ?? "Staff");
}

export default function CommissionsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const [period, setPeriod] = useState<"month" | "quarter">("month");
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseLineId, setReverseLineId] = useState("");
  const [reverseReason, setReverseReason] = useState("");

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

  const linesQuery = useQuery({
    queryKey: ["org", orgId, "commission-lines", period],
    enabled: !!orgId,
    queryFn: () => fetchCommissionLines(orgId!, period),
  });

  const reverseMut = useMutation({
    mutationFn: () => reverseCommissionLine(orgId!, reverseLineId, reverseReason),
    onSuccess: () => {
      toast.success("Commission line reversed");
      qc.invalidateQueries({ queryKey: ["org", orgId, "commission-lines"] });
      qc.invalidateQueries({ queryKey: ["org", orgId, "commission-summary"] });
      setReverseOpen(false);
      setReverseLineId("");
      setReverseReason("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Reverse failed"),
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

  const linesRows = (linesQuery.data ?? []).map((line) => ({
    id: line.id,
    staff_id: line.staffId,
    kind: line.kind,
    base_kes: line.baseKes,
    rate_pct: line.ratePct,
    amount_kes: line.amountKes,
    created_at: line.createdAt,
  })) as Record<string, unknown>[];

  function openReverse(lineId: string) {
    setReverseLineId(lineId);
    setReverseReason("");
    setReverseOpen(true);
  }

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
              <SelectTrigger className="w-full min-w-0 sm:w-[180px]" aria-label="Commission period">
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
            <CardTitle>Commission lines</CardTitle>
          </CardHeader>
          <CardContent>
            {linesQuery.isLoading ? <p className="text-muted-foreground">Loading lines…</p> : null}
            {linesQuery.error ? <p className="text-destructive">Failed to load commission lines.</p> : null}
            <DataTable
              columns={[
                {
                  key: "created_at",
                  header: "When",
                  render: (row) => String(pickRowField(row, "created_at") ?? "—").slice(0, 10),
                },
                {
                  key: "staff_id",
                  header: "Staff",
                  render: (row) => staffName(String(pickRowField(row, "staff_id") ?? "")),
                },
                { key: "kind", header: "Kind" },
                {
                  key: "amount_kes",
                  header: "Amount",
                  render: (row) => formatKes(Number(pickRowField(row, "amount_kes") ?? 0)),
                },
                {
                  key: "actions",
                  header: "",
                  render: (row) => {
                    const kind = String(pickRowField(row, "kind") ?? "");
                    const id = String(pickRowField(row, "id") ?? "");
                    if (kind !== "service") return null;
                    return (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-testid="commission-reverse-btn"
                        onClick={() => openReverse(id)}
                      >
                        Reverse
                      </Button>
                    );
                  },
                },
              ]}
              rows={linesRows}
              emptyMessage="No commission lines for this period."
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

      <CrudDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title="Reverse commission line"
        description="Creates an offsetting adjustment line. The original line is never edited."
        onSubmit={() => {
          if (!reverseReason.trim()) return;
          reverseMut.mutate();
        }}
        submitLabel="Confirm reverse"
        loading={reverseMut.isPending}
      >
        <div className="space-y-3" data-testid="commission-reverse-form">
          <div className="space-y-1">
            <Label htmlFor="reverse-reason">Reason (required)</Label>
            <Textarea
              id="reverse-reason"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              rows={3}
              data-testid="commission-reverse-reason"
            />
          </div>
        </div>
      </CrudDialog>
    </ModulePage>
  );
}
