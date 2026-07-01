"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { DataTable, type Column } from "@/components/DataTable";
import { EntityForm, type FormFieldDef } from "@/components/EntityForm";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useEntityCreate, useEntityDelete, useEntityList, useEntityUpdate } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

export interface CrudModuleConfig {
  title: string;
  feature?: string;
  resource: string;
  fields: FormFieldDef[];
  columns: Column<Record<string, unknown>>[];
  emptyMessage?: string;
  mapFormToBody?: (values: Record<string, string>) => Record<string, unknown>;
  mapRowToForm?: (row: Record<string, unknown>) => Record<string, string>;
}

function rowId(row: Record<string, unknown>): string {
  return String(row.id ?? row.ID ?? "");
}

function pick(row: Record<string, unknown>, key: string): unknown {
  if (row[key] !== undefined) return row[key];
  const pascal = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  return row[pascal] ?? row[camel];
}

export function CrudModulePage({ config }: { config: CrudModuleConfig }) {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { apiParams } = useBranchFilter();
  const { data: rows = [], isLoading, error } = useEntityList<Record<string, unknown>>(
    orgId,
    config.resource,
    apiParams,
  );
  const createMut = useEntityCreate(orgId, config.resource);
  const updateMut = useEntityUpdate(orgId, config.resource);
  const deleteMut = useEntityDelete(orgId, config.resource);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const initialValues = useMemo(() => {
    const base: Record<string, string> = {};
    for (const f of config.fields) base[f.name] = "";
    return base;
  }, [config.fields]);

  function openCreate() {
    setEditing(null);
    setValues(initialValues);
    setOpen(true);
  }

  function openEdit(row: Record<string, unknown>) {
    setEditing(row);
    if (config.mapRowToForm) {
      setValues(config.mapRowToForm(row));
    } else {
      const next = { ...initialValues };
      for (const f of config.fields) {
        const v = pickRowField(row, f.name);
        next[f.name] = v != null ? String(v) : "";
      }
      setValues(next);
    }
    setOpen(true);
  }

  async function save() {
    const body = config.mapFormToBody ? config.mapFormToBody(values) : { ...values };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: rowId(editing), body });
        toast.success("Updated");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Created");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(row: Record<string, unknown>) {
    try {
      await deleteMut.mutateAsync(rowId(row));
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const body = (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{config.title}</CardTitle>
        <Button onClick={openCreate} disabled={!orgId}>
          Add new
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">Failed to load data.</p>}
        <DataTable
          columns={config.columns}
          rows={rows}
          emptyMessage={config.emptyMessage ?? "No records yet."}
          rowKey={(row) => rowId(row)}
          onEdit={openEdit}
          onDelete={remove}
        />
      </CardContent>
      <CrudDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${config.title}` : `Add ${config.title}`}
        onSubmit={save}
        loading={createMut.isPending || updateMut.isPending}
      >
        <EntityForm
          fields={config.fields}
          values={values}
          onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </Card>
  );

  return (
    <ModulePage title={config.title} feature={config.feature}>
      {config.feature ? <Feature flag={config.feature}>{body}</Feature> : body}
    </ModulePage>
  );
}

export { pickRowField as crudPick, rowId as crudRowId };
