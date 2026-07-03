"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { EntityForm } from "@/components/EntityForm";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useEntityCreate, useEntityList, useEntityUpdate } from "@/lib/api/crud";
import { staffConfig } from "@/lib/crud-configs";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type StaffRow = Record<string, unknown>;

function rowId(row: StaffRow): string {
  return String(row.id ?? row.ID ?? "");
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function roleLabel(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ROLE_COLORS: Record<string, string> = {
  ceo: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  director: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  branch_manager: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  senior_barber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  junior_barber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  receptionist: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export default function StaffPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { apiParams } = useBranchFilter();
  const { data: staff = [], isLoading, error } = useEntityList<StaffRow>(orgId, "staff", apiParams);
  const createMut = useEntityCreate(orgId, "staff");
  const updateMut = useEntityUpdate(orgId, "staff");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const initialValues = useMemo(() => {
    const base: Record<string, string> = {};
    for (const f of staffConfig.fields) base[f.name] = "";
    return base;
  }, []);
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  function openCreate() {
    setEditing(null);
    setValues(initialValues);
    setOpen(true);
  }

  function openEdit(row: StaffRow) {
    setEditing(row);
    const next = { ...initialValues };
    for (const f of staffConfig.fields) {
      const v = pickRowField(row, f.name);
      if (f.name === "specialties" && Array.isArray(v)) {
        next[f.name] = v.join(", ");
      } else {
        next[f.name] = v != null ? String(v) : "";
      }
    }
    setValues(next);
    setOpen(true);
  }

  async function save() {
    const body = staffConfig.mapFormToBody!(values);
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: rowId(editing), body });
        toast.success("Staff updated");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Staff member added");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <ModulePage title="Staff" description="Your team directory and commission settings.">
      <div className="mb-6 flex justify-end">
        <Button onClick={openCreate} disabled={!orgId} className="gap-2">
          <Plus className="h-4 w-4" />
          Add staff
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading staff…</p>}
      {error && <p className="text-destructive">Failed to load staff.</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {staff.map((row) => {
          const name = String(pickRowField(row, "display_name") ?? "Staff");
          const role = String(pickRowField(row, "role") ?? "staff");
          const commission = Number(pickRowField(row, "commission_rate") ?? 0);
          const rawSpecialties = pickRowField(row, "specialties");
          const specialties = Array.isArray(rawSpecialties)
            ? rawSpecialties.map(String)
            : String(rawSpecialties ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

          return (
            <Card
              key={rowId(row)}
              className="glass cursor-pointer transition hover:-translate-y-0.5 hover:shadow-glow"
              onClick={() => openEdit(row)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-sm font-bold text-primary-foreground">
                    {initials(name)}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{name}</CardTitle>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                        ROLE_COLORS[role] ?? "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {roleLabel(role)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Commission: <span className="font-medium text-foreground">{commission}%</span>
                </p>
                {specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {specialties.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && staff.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No staff members yet.</p>
      )}

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit staff" : "Add staff"}
        onSubmit={save}
        loading={createMut.isPending || updateMut.isPending}
      >
        <EntityForm
          fields={staffConfig.fields}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </ModulePage>
  );
}
