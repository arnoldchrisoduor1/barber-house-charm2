"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { DataTable } from "@/components/DataTable";
import { EntityForm, type FormFieldDef } from "@/components/EntityForm";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { createPayslip, fetchPayslips, formatKes } from "@/lib/api/finance";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type StaffRow = Record<string, unknown>;

function staffLabel(row: StaffRow): string {
  return String(row.display_name ?? row.displayName ?? row.id ?? "Staff");
}

function staffId(row: StaffRow): string {
  return String(row.id ?? row.ID ?? "");
}

const PAYSLIP_FIELDS: FormFieldDef[] = [
  { name: "staff_id", label: "Staff ID", required: true },
  { name: "period_start", label: "Period start (YYYY-MM-DD)", required: true },
  { name: "period_end", label: "Period end (YYYY-MM-DD)", required: true },
  { name: "gross_kes", label: "Gross (KES)", type: "number", required: true },
  { name: "commission_kes", label: "Commission (KES)", type: "number" },
  { name: "deductions_kes", label: "Deductions (KES)", type: "number" },
];

export default function PayrollPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const queryClient = useQueryClient();
  const { data: staff = [] } = useEntityList<StaffRow>(orgId, "staff");

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    staff_id: "",
    period_start: "",
    period_end: "",
    gross_kes: "",
    commission_kes: "0",
    deductions_kes: "0",
  });

  const payslipsQuery = useQuery({
    queryKey: ["org", orgId, "payslips"],
    enabled: !!orgId,
    queryFn: () => fetchPayslips(orgId!),
  });

  const generateMut = useMutation({
    mutationFn: () =>
      createPayslip(orgId!, {
        staff_id: values.staff_id,
        period_start: values.period_start,
        period_end: values.period_end,
        gross_kes: Number.parseInt(values.gross_kes, 10) || 0,
        commission_kes: Number.parseInt(values.commission_kes, 10) || 0,
        deductions_kes: Number.parseInt(values.deductions_kes, 10) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "payslips"] });
      toast.success("Payslip generated");
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Generate failed"),
  });

  const staffName = (id: string) => {
    const match = staff.find((row) => staffId(row) === id);
    return match ? staffLabel(match) : id.slice(0, 8);
  };

  const rows = (payslipsQuery.data ?? []).map((p) => ({
    id: p.id,
    staff_id: p.staffId,
    period_start: p.periodStart,
    period_end: p.periodEnd,
    gross_kes: p.grossKes,
    commission_kes: p.commissionKes,
    deductions_kes: p.deductionsKes,
    net_kes: p.netKes,
    status: p.status,
  })) as Record<string, unknown>[];

  const staffOptions = staff.map((row) => ({
    value: staffId(row),
    label: staffLabel(row),
  }));

  const fieldsWithStaffSelect: FormFieldDef[] = PAYSLIP_FIELDS.map((field) =>
    field.name === "staff_id" && staffOptions.length > 0
      ? { ...field, type: "select", options: staffOptions, label: "Staff member" }
      : field,
  );

  return (
    <ModulePage
      title="Payroll"
      feature="staff_commissions_payroll"
      description="Generate and review staff payslips."
    >
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Payslips</CardTitle>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              const today = new Date();
              const start = new Date(today.getFullYear(), today.getMonth(), 1);
              setValues({
                staff_id: staff[0] ? staffId(staff[0]) : "",
                period_start: start.toISOString().slice(0, 10),
                period_end: today.toISOString().slice(0, 10),
                gross_kes: "",
                commission_kes: "0",
                deductions_kes: "0",
              });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Generate payslip
          </Button>
        </CardHeader>
        <CardContent>
          {payslipsQuery.isLoading ? <p className="text-muted-foreground">Loading payslips…</p> : null}
          {payslipsQuery.error ? <p className="text-destructive">Failed to load payslips.</p> : null}
          <DataTable
            columns={[
              {
                key: "staff_id",
                header: "Staff",
                render: (row) => staffName(String(pickRowField(row, "staff_id") ?? "")),
              },
              {
                key: "period_start",
                header: "Period",
                render: (row) =>
                  `${String(pickRowField(row, "period_start") ?? "").slice(0, 10)} – ${String(pickRowField(row, "period_end") ?? "").slice(0, 10)}`,
              },
              {
                key: "gross_kes",
                header: "Gross",
                render: (row) => formatKes(Number(pickRowField(row, "gross_kes") ?? 0)),
              },
              {
                key: "net_kes",
                header: "Net",
                render: (row) => formatKes(Number(pickRowField(row, "net_kes") ?? 0)),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => String(pickRowField(row, "status") ?? "—"),
              },
            ]}
            rows={rows}
            emptyMessage="No payslips generated yet."
          />
        </CardContent>
      </Card>

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title="Generate payslip"
        description="Creates a payslip record for the selected period."
        onSubmit={() => generateMut.mutate()}
        loading={generateMut.isPending}
        submitLabel="Generate"
      >
        <EntityForm
          fields={fieldsWithStaffSelect}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </ModulePage>
  );
}
