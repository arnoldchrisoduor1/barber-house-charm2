"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { EntityForm } from "@/components/EntityForm";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { SearchFilter } from "@/components/SearchFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useStaffScope } from "@/hooks/useStaffScope";
import { useEntityCreate, useEntityList, useEntityUpdate } from "@/lib/api/crud";
import { customersConfig } from "@/lib/crud-configs";
import { formatKES, formatPhone } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type CustomerRow = Record<string, unknown>;

function rowId(row: CustomerRow): string {
  return String(row.id ?? row.ID ?? "");
}

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-amber-900/30 text-amber-500 border-amber-700/50",
  silver: "bg-slate-500/20 text-slate-300 border-slate-500/50",
  gold: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  platinum: "bg-violet-500/20 text-violet-300 border-violet-500/50",
};

function TierBadge({ tier }: { tier: string }) {
  const key = tier.toLowerCase();
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        TIER_COLORS[key] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {tier}
    </span>
  );
}

export default function ClientsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { apiParams } = useBranchFilter();
  const { staffId, isStaffScoped } = useStaffScope();
  const { data: customers = [], isLoading, error } = useEntityList<CustomerRow>(orgId, "customers", apiParams);
  const createMut = useEntityCreate(orgId, "customers");
  const updateMut = useEntityUpdate(orgId, "customers");

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    full_name: "",
    phone: "",
    email: "",
    style_preferences: "",
    notes: "",
    loyalty_tier: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((row) => {
      if (isStaffScoped && staffId) {
        const assigned = String(pickRowField(row, "assigned_staff_id") ?? "");
        if (assigned && assigned !== staffId) return false;
      }
      if (!q) return true;
      const name = String(pickRowField(row, "full_name") ?? "").toLowerCase();
      const phone = String(pickRowField(row, "phone") ?? "").toLowerCase();
      const email = String(pickRowField(row, "email") ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [customers, search, isStaffScoped, staffId]);

  function openCreate() {
    setEditing(null);
    setValues({ full_name: "", phone: "", email: "", style_preferences: "", notes: "", loyalty_tier: "" });
    setOpen(true);
  }

  function openEdit(row: CustomerRow) {
    setEditing(row);
    setValues({
      full_name: String(pickRowField(row, "full_name") ?? ""),
      phone: String(pickRowField(row, "phone") ?? ""),
      email: String(pickRowField(row, "email") ?? ""),
      style_preferences: String(pickRowField(row, "style_preferences") ?? ""),
      notes: String(pickRowField(row, "notes") ?? ""),
      loyalty_tier: String(pickRowField(row, "loyalty_tier") ?? ""),
    });
    setOpen(true);
  }

  async function save() {
    const body = { ...values };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: rowId(editing), body });
        toast.success("Client updated");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Client added");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  const body = (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search clients by name or phone…"
          className="w-full max-w-sm"
        />
        <Button onClick={openCreate} disabled={!orgId} className="gap-2">
          <Plus className="h-4 w-4" />
          Add client
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading clients…</p>}
      {error && <p className="text-destructive">Failed to load clients.</p>}

      <div className="space-y-2">
        {filtered.map((row) => {
          const name = String(pickRowField(row, "full_name") ?? "Client");
          const phone = String(pickRowField(row, "phone") ?? "");
          const tier = String(pickRowField(row, "loyalty_tier") ?? "bronze");
          const visits = Number(pickRowField(row, "total_visits") ?? 0);
          const spent = Number(pickRowField(row, "total_spent") ?? 0);

          return (
            <Card
              key={rowId(row)}
              className="glass cursor-pointer transition hover:bg-card/80"
              onClick={() => openEdit(row)}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{name}</p>
                    <TierBadge tier={tier} />
                  </div>
                  {phone && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{formatPhone(phone)}</p>
                  )}
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold">{visits}</p>
                    <p className="text-xs text-muted-foreground">Visits</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{formatKES(spent)}</p>
                    <p className="text-xs text-muted-foreground">Spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No clients found.</p>
      )}

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit client" : "Add client"}
        onSubmit={save}
        loading={createMut.isPending || updateMut.isPending}
      >
        <EntityForm
          fields={customersConfig.fields}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </>
  );

  return (
    <ModulePage title="Clients" feature="crm" description="Search and manage your client directory.">
      <Feature flag="crm">{body}</Feature>
    </ModulePage>
  );
}
