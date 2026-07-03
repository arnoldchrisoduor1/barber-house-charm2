"use client";

import { useMemo, useState } from "react";
import { Clock, Plus, Scissors } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { EntityForm } from "@/components/EntityForm";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useEntityCreate, useEntityList, useEntityUpdate } from "@/lib/api/crud";
import { servicesConfig } from "@/lib/crud-configs";
import { formatKES } from "@/lib/format";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type ServiceRow = Record<string, unknown>;

function rowId(row: ServiceRow): string {
  return String(row.id ?? row.ID ?? "");
}

export default function ServicesPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { apiParams } = useBranchFilter();
  const { data: services = [], isLoading, error } = useEntityList<ServiceRow>(orgId, "services", apiParams);
  const createMut = useEntityCreate(orgId, "services");
  const updateMut = useEntityUpdate(orgId, "services");

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    name: "",
    category: "",
    duration_minutes: "30",
    price_kes: "",
    description: "",
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const row of services) {
      const cat = String(pickRowField(row, "category") ?? "").trim();
      if (cat) set.add(cat);
    }
    return Array.from(set).sort();
  }, [services]);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return services;
    return services.filter((row) => String(pickRowField(row, "category") ?? "") === categoryFilter);
  }, [services, categoryFilter]);

  function openCreate() {
    setEditing(null);
    setValues({ name: "", category: "", duration_minutes: "30", price_kes: "", description: "" });
    setOpen(true);
  }

  function openEdit(row: ServiceRow) {
    setEditing(row);
    setValues({
      name: String(pickRowField(row, "name") ?? ""),
      category: String(pickRowField(row, "category") ?? ""),
      duration_minutes: String(pickRowField(row, "duration_minutes") ?? "30"),
      price_kes: String(pickRowField(row, "price_kes") ?? ""),
      description: String(pickRowField(row, "description") ?? ""),
    });
    setOpen(true);
  }

  async function save() {
    const body = servicesConfig.mapFormToBody!(values);
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: rowId(editing), body });
        toast.success("Service updated");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Service created");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  const body = (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              categoryFilter === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50",
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                categoryFilter === cat
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <Button onClick={openCreate} disabled={!orgId} className="gap-2">
          <Plus className="h-4 w-4" />
          Add service
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading services…</p>}
      {error && <p className="text-destructive">Failed to load services.</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row) => {
          const name = String(pickRowField(row, "name") ?? "Service");
          const category = String(pickRowField(row, "category") ?? "General");
          const duration = Number(pickRowField(row, "duration_minutes") ?? 30);
          const price = Number(pickRowField(row, "price_kes") ?? 0);
          return (
            <Card
              key={rowId(row)}
              className="glass cursor-pointer transition hover:-translate-y-0.5 hover:shadow-glow"
              onClick={() => openEdit(row)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Scissors className="h-5 w-5 text-primary" />
                  </div>
                  <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {category}
                  </span>
                </div>
                <CardTitle className="text-lg">{name}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {duration} min
                </span>
                <span className="font-semibold text-primary">{formatKES(price)}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No services yet. Add your first service.</p>
      )}

      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit service" : "Add service"}
        onSubmit={save}
        loading={createMut.isPending || updateMut.isPending}
      >
        <EntityForm
          fields={servicesConfig.fields}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </>
  );

  return (
    <ModulePage title="Services" feature="bookings" description="Manage your service menu and pricing.">
      <Feature flag="bookings">{body}</Feature>
    </ModulePage>
  );
}
