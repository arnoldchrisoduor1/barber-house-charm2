"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, Phone, Users } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { EntityForm, type FormFieldDef } from "@/components/EntityForm";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useEntityList } from "@/lib/api/crud";
import { apiClient } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type BranchRow = Record<string, unknown>;
type StaffRow = Record<string, unknown>;

const EDIT_FIELDS: FormFieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "address", label: "Address" },
  { name: "phone", label: "Phone" },
];

function rowId(row: BranchRow): string {
  return String(row.id ?? row.ID ?? "");
}

export default function BranchesPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const { data: branches = [], isLoading, error } = useEntityList<BranchRow>(orgId, "branches");
  const { data: staff = [] } = useEntityList<StaffRow>(orgId, "staff");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<BranchRow | null>(null);
  const [editValues, setEditValues] = useState({ name: "", address: "", phone: "" });

  const staffCountByBranch = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of staff) {
      const branchId = String(pickRowField(row, "branch_id") ?? "");
      if (branchId) counts.set(branchId, (counts.get(branchId) ?? 0) + 1);
    }
    return counts;
  }, [staff]);

  const createBranch = useMutation({
    mutationFn: (payload: { name: string; address: string; phone: string }) =>
      apiClient(`/organizations/${orgId}/branches`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "branches"] });
      setName("");
      setAddress("");
      setPhone("");
      toast.success("Branch created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Create failed"),
  });

  const updateBranch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, string> }) =>
      apiClient(`/organizations/${orgId}/branches/${id}`, {
        method: "PUT",
        body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "branches"] });
      setEditOpen(false);
      toast.success("Branch updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update not available yet"),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    createBranch.mutate({ name: name.trim(), address: address.trim(), phone: phone.trim() });
  }

  function openEdit(row: BranchRow) {
    setEditing(row);
    setEditValues({
      name: String(pickRowField(row, "name") ?? ""),
      address: String(pickRowField(row, "address") ?? ""),
      phone: String(pickRowField(row, "phone") ?? ""),
    });
    setEditOpen(true);
  }

  function saveEdit() {
    if (!editing) return;
    updateBranch.mutate({ id: rowId(editing), body: editValues });
  }

  return (
    <ModulePage
      title="Branches"
      feature="multi_branch"
      description="Manage locations and branch contact details."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {isLoading && <p className="text-muted-foreground">Loading branches…</p>}
          {error && <p className="text-destructive">Failed to load branches.</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            {branches.map((row) => {
              const id = rowId(row);
              const branchName = String(pickRowField(row, "name") ?? "Branch");
              const branchAddress = String(pickRowField(row, "address") ?? "");
              const branchPhone = String(pickRowField(row, "phone") ?? "");
              const isActive = pickRowField(row, "is_active") ?? pickRowField(row, "isActive") ?? true;
              const staffCount = staffCountByBranch.get(id) ?? 0;

              return (
                <Card
                  key={id}
                  className="glass cursor-pointer transition hover:-translate-y-0.5 hover:shadow-glow"
                  onClick={() => openEdit(row)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          isActive
                            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{branchName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {branchAddress && (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        {branchAddress}
                      </p>
                    )}
                    {branchPhone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        {branchPhone}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0" />
                      {staffCount} staff member{staffCount !== 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {!isLoading && branches.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">No branches yet.</p>
          )}
        </div>

        <Card className="glass h-fit">
          <CardHeader>
            <CardTitle>Add branch</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Address</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-muted-foreground">Phone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <Button type="submit" disabled={!orgId || createBranch.isPending} className="w-full">
                {createBranch.isPending ? "Creating…" : "Create branch"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <CrudDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit branch"
        onSubmit={saveEdit}
        loading={updateBranch.isPending}
      >
        <EntityForm
          fields={EDIT_FIELDS}
          values={editValues}
          onChange={(field, value) => setEditValues((prev) => ({ ...prev, [field]: value }))}
        />
      </CrudDialog>
    </ModulePage>
  );
}
