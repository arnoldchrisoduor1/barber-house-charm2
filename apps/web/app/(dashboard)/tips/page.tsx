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
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { createTip, deleteTip, fetchTips, formatKes, updateTip } from "@/lib/api/finance";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type StaffRow = Record<string, unknown>;

function staffLabel(row: StaffRow): string {
  return String(row.display_name ?? row.displayName ?? row.id ?? "Staff");
}

function staffId(row: StaffRow): string {
  return String(row.id ?? row.ID ?? "");
}

const TIP_FIELDS: FormFieldDef[] = [
  { name: "staff_id", label: "Staff member", required: true },
  { name: "amount_kes", label: "Amount (KES)", type: "number", required: true },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "pending", label: "Pending" },
      { value: "distributed", label: "Distributed" },
    ],
  },
  {
    name: "payment_method",
    label: "Payment method",
    type: "select",
    options: [
      { value: "cash", label: "Cash" },
      { value: "mpesa", label: "M-Pesa" },
      { value: "card", label: "Card" },
    ],
  },
  { name: "tip_date", label: "Tip date (YYYY-MM-DD)" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function TipsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { apiParams } = useBranchFilter();
  const queryClient = useQueryClient();
  const { data: staff = [] } = useEntityList<StaffRow>(orgId, "staff");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    staff_id: "",
    amount_kes: "",
    status: "pending",
    payment_method: "cash",
    tip_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const tipsQuery = useQuery({
    queryKey: ["org", orgId, "tips", apiParams],
    enabled: !!orgId,
    queryFn: () => fetchTips(orgId!, apiParams),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        staff_id: values.staff_id,
        amount_kes: Number.parseInt(values.amount_kes, 10) || 0,
        status: values.status,
        payment_method: values.payment_method,
        tip_date: values.tip_date,
        notes: values.notes,
      };
      if (editingId) return updateTip(orgId!, editingId, body);
      return createTip(orgId!, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "tips"] });
      toast.success(editingId ? "Tip updated" : "Tip recorded");
      setOpen(false);
      setEditingId(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTip(orgId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "tips"] });
      toast.success("Tip deleted");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const staffName = (id: string) => {
    const match = staff.find((row) => staffId(row) === id);
    return match ? staffLabel(match) : id.slice(0, 8);
  };

  const staffOptions = staff.map((row) => ({ value: staffId(row), label: staffLabel(row) }));
  const fields = TIP_FIELDS.map((field) =>
    field.name === "staff_id" && staffOptions.length > 0
      ? { ...field, type: "select" as const, options: staffOptions }
      : field,
  );

  const rows = (tipsQuery.data ?? []).map((tip) => ({
    id: tip.id,
    staff_id: tip.staffId,
    amount_kes: tip.amountKes,
    status: tip.status,
    payment_method: tip.paymentMethod,
    tip_date: tip.tipDate,
    notes: tip.notes,
  })) as Record<string, unknown>[];

  function openCreate() {
    setEditingId(null);
    setValues({
      staff_id: staff[0] ? staffId(staff[0]) : "",
      amount_kes: "",
      status: "pending",
      payment_method: "cash",
      tip_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(row: Record<string, unknown>) {
    setEditingId(String(pickRowField(row, "id")));
    setValues({
      staff_id: String(pickRowField(row, "staff_id") ?? ""),
      amount_kes: String(pickRowField(row, "amount_kes") ?? ""),
      status: String(pickRowField(row, "status") ?? "pending"),
      payment_method: String(pickRowField(row, "payment_method") ?? "cash"),
      tip_date: String(pickRowField(row, "tip_date") ?? "").slice(0, 10),
      notes: String(pickRowField(row, "notes") ?? ""),
    });
    setOpen(true);
  }

  return (
    <ModulePage
      title="Tips"
      feature="tips_management"
      description="Track and distribute staff tips."
    >
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Tips ledger</CardTitle>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Record tip
          </Button>
        </CardHeader>
        <CardContent>
          {tipsQuery.isLoading ? <p className="text-muted-foreground">Loading tips…</p> : null}
          {tipsQuery.error ? <p className="text-destructive">Failed to load tips.</p> : null}
          <DataTable
            columns={[
              {
                key: "tip_date",
                header: "Date",
                render: (row) => String(pickRowField(row, "tip_date") ?? "—").slice(0, 10),
              },
              {
                key: "staff_id",
                header: "Staff",
                render: (row) => staffName(String(pickRowField(row, "staff_id") ?? "")),
              },
              {
                key: "amount_kes",
                header: "Amount",
                render: (row) => formatKes(Number(pickRowField(row, "amount_kes") ?? 0)),
              },
              {
                key: "payment_method",
                header: "Method",
                render: (row) => String(pickRowField(row, "payment_method") ?? "—"),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => String(pickRowField(row, "status") ?? "—"),
              },
            ]}
            rows={rows}
            emptyMessage="No tips recorded yet."
            onEdit={openEdit}
            onDelete={(row) => deleteMut.mutate(String(pickRowField(row, "id")))}
          />
        </CardContent>
      </Card>

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit tip" : "Record tip"}
        onSubmit={() => saveMut.mutate()}
        loading={saveMut.isPending}
      >
        <EntityForm
          fields={fields}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </ModulePage>
  );
}
