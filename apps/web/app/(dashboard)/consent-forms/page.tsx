"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { EntityForm } from "@/components/EntityForm";
import { Feature } from "@/components/Feature";
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
import { useBusinessCategory } from "@/hooks/useBusinessCategory";
import { useEntityCreate, useEntityDelete, useEntityList, useEntityUpdate } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type FormRow = Record<string, unknown>;

const BEAUTY_FORM_TYPES = [
  { value: "chemical", label: "Chemical treatment" },
  { value: "waxing", label: "Waxing / facial" },
  { value: "allergy", label: "Allergy & patch test" },
  { value: "general", label: "General salon consent" },
];

const SPA_FORM_TYPES = [
  { value: "massage", label: "Massage consent" },
  { value: "contraindication", label: "Contra-indication declaration" },
  { value: "pregnancy", label: "Pregnancy massage" },
  { value: "general", label: "General spa consent" },
];

export default function ConsentFormsPage() {
  const { activeOrg } = useAuth();
  const { mode, label } = useBusinessCategory();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const isBeauty = mode === "beauty";
  const isSpa = mode === "spa";

  const { data: forms = [], isLoading, error } = useEntityList<FormRow>(orgId, "consent-forms");
  const createMut = useEntityCreate(orgId, "consent-forms");
  const updateMut = useEntityUpdate(orgId, "consent-forms");
  const deleteMut = useEntityDelete(orgId, "consent-forms");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FormRow | null>(null);
  const [values, setValues] = useState({ title: "", form_type: "general", content: "" });

  function openCreate() {
    setEditing(null);
    setValues({ title: "", form_type: isBeauty ? "chemical" : isSpa ? "massage" : "general", content: "" });
    setOpen(true);
  }

  function openEdit(row: FormRow) {
    setEditing(row);
    setValues({
      title: String(pickRowField(row, "title") ?? ""),
      form_type: String(pickRowField(row, "form_type") ?? "general"),
      content: String(pickRowField(row, "content") ?? ""),
    });
    setOpen(true);
  }

  async function save() {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: String(editing.id ?? editing.ID), body: values });
        toast.success("Consent form updated");
      } else {
        await createMut.mutateAsync(values);
        toast.success("Consent form created");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["org", orgId, "consent-forms"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  const description = isBeauty
    ? "Salon consent for chemical treatments, waxing, facials, and patch-test declarations."
    : isSpa
      ? "Spa consent for massage, contra-indications, pregnancy treatments, and allergy declarations."
      : "Client consent and intake forms.";

  return (
    <Feature flag="clinical">
      <ModulePage title="Consent Forms" description={description}>
        <div data-testid="consent-forms-page" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate} disabled={!orgId} className="gap-2">
              <Plus className="h-4 w-4" />
              New form
            </Button>
          </div>

          {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
          {error ? <p className="text-destructive">Failed to load forms.</p> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {forms.map((row) => (
              <Card key={String(row.id ?? row.ID)} className="glass cursor-pointer" onClick={() => openEdit(row)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{String(pickRowField(row, "title") ?? "Form")}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {String(pickRowField(row, "form_type") ?? "general")} · {label}
                </CardContent>
              </Card>
            ))}
          </div>

          <CrudDialog
            open={open}
            onOpenChange={setOpen}
            title={editing ? "Edit consent form" : "New consent form"}
            onSubmit={save}
            loading={createMut.isPending || updateMut.isPending}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={values.title}
                  onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Form type</Label>
                <Select value={values.form_type} onValueChange={(v) => setValues((s) => ({ ...s, form_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(isBeauty ? BEAUTY_FORM_TYPES : isSpa ? SPA_FORM_TYPES : BEAUTY_FORM_TYPES.slice(3)).map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  rows={6}
                  value={values.content}
                  onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
                  placeholder={isBeauty ? "Client acknowledges chemical treatment risks…" : "Consent body…"}
                />
              </div>
            </div>
          </CrudDialog>
        </div>
      </ModulePage>
    </Feature>
  );
}
