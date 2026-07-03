"use client";

import { useMemo, useState } from "react";
import { Armchair, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { DataTable } from "@/components/DataTable";
import { EntityForm } from "@/components/EntityForm";
import { Feature } from "@/components/Feature";
import { StatTile } from "@/components/dashboard/StatTile";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useEntityCreate, useEntityDelete, useEntityList, useEntityUpdate } from "@/lib/api/crud";
import { seatRentalConfig } from "@/lib/crud-configs";
import { formatKES } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";

type SeatRow = Record<string, unknown>;

function rowId(row: SeatRow): string {
  return String(row.id ?? row.ID ?? "");
}

export default function SeatRentalPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { data: seats = [], isLoading, error } = useEntityList<SeatRow>(orgId, "seat-rentals");
  const createMut = useEntityCreate(orgId, "seat-rentals");
  const updateMut = useEntityUpdate(orgId, "seat-rentals");
  const deleteMut = useEntityDelete(orgId, "seat-rentals");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SeatRow | null>(null);
  const [values, setValues] = useState({ seat_label: "", monthly_rate_kes: "", notes: "" });

  const stats = useMemo(() => {
    const total = seats.length;
    const occupied = seats.filter((row) => {
      const staffId = pickRowField(row, "staff_id");
      const status = String(pickRowField(row, "status") ?? "active");
      return Boolean(staffId) || status === "occupied";
    }).length;
    const monthlyRevenue = seats.reduce(
      (sum, row) => sum + Number(pickRowField(row, "monthly_rate_kes") ?? 0),
      0,
    );
    return { total, occupied, monthlyRevenue };
  }, [seats]);

  function openCreate() {
    setEditing(null);
    setValues({ seat_label: "", monthly_rate_kes: "", notes: "" });
    setOpen(true);
  }

  function openEdit(row: SeatRow) {
    setEditing(row);
    setValues({
      seat_label: String(pickRowField(row, "seat_label") ?? ""),
      monthly_rate_kes: String(pickRowField(row, "monthly_rate_kes") ?? ""),
      notes: String(pickRowField(row, "notes") ?? ""),
    });
    setOpen(true);
  }

  async function save() {
    const body = seatRentalConfig.mapFormToBody!(values);
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: rowId(editing), body });
        toast.success("Seat rental updated");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Seat rental added");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(row: SeatRow) {
    try {
      await deleteMut.mutateAsync(rowId(row));
      toast.success("Seat rental deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const body = (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={Armchair}
          label="Total chairs"
          value={String(stats.total)}
          loading={isLoading}
          testId="seat-total"
        />
        <StatTile
          icon={Users}
          label="Occupied"
          value={String(stats.occupied)}
          subtitle={stats.total > 0 ? `${Math.round((stats.occupied / stats.total) * 100)}% utilization` : undefined}
          loading={isLoading}
          testId="seat-occupied"
        />
        <StatTile
          icon={DollarSign}
          label="Monthly revenue projection"
          value={formatKES(stats.monthlyRevenue)}
          loading={isLoading}
          testId="seat-revenue"
        />
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Seat rentals</CardTitle>
          <Button onClick={openCreate} disabled={!orgId}>
            Add seat
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {error && <p className="text-destructive">Failed to load seat rentals.</p>}
          <DataTable
            columns={[
              ...seatRentalConfig.columns,
              {
                key: "staff_id",
                header: "Occupant",
                render: (row) => {
                  const staffId = pickRowField(row, "staff_id");
                  return staffId ? "Assigned" : "Vacant";
                },
              },
              {
                key: "status",
                header: "Status",
                render: (row) => String(pickRowField(row, "status") ?? "active"),
              },
            ]}
            rows={seats}
            emptyMessage="No seat rentals yet."
            rowKey={(row) => rowId(row)}
            onEdit={openEdit}
            onDelete={remove}
          />
        </CardContent>
      </Card>

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit seat rental" : "Add seat rental"}
        onSubmit={save}
        loading={createMut.isPending || updateMut.isPending}
      >
        <EntityForm
          fields={seatRentalConfig.fields}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </>
  );

  return (
    <ModulePage
      title="Seat Rental"
      feature="staff_commissions_payroll"
      description="Track chair assignments and monthly rent."
    >
      <Feature flag="staff_commissions_payroll">{body}</Feature>
    </ModulePage>
  );
}
