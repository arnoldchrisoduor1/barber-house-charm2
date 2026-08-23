"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Badge } from "@/components/ui/badge";
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

const CLINIC_FORM_TYPES = [
  { value: "botox_liability", label: "Botox liability" },
  { value: "fillers_liability", label: "Fillers liability" },
  { value: "laser_liability", label: "Laser liability" },
  { value: "peel_liability", label: "Chemical peel liability" },
  { value: "general", label: "General treatment consent" },
];

const THERAPY_FORM_TYPES = [
  { value: "intake", label: "Intake consent" },
  { value: "medical", label: "Medical disclosure" },
  { value: "counselling", label: "Counselling agreement" },
  { value: "general", label: "General therapy consent" },
];

const NAILS_FORM_TYPES = [
  { value: "gel_allergy", label: "Gel allergy declaration" },
  { value: "acrylic_allergy", label: "Acrylic allergy declaration" },
  { value: "chemical_allergy", label: "Chemical allergy declaration" },
  { value: "general", label: "General nail consent" },
];

function formTypesForMode(mode: string) {
  switch (mode) {
    case "clinic":
      return CLINIC_FORM_TYPES;
    case "therapy":
      return THERAPY_FORM_TYPES;
    case "nail_bar":
      return NAILS_FORM_TYPES;
    case "beauty":
      return BEAUTY_FORM_TYPES;
    case "spa":
      return SPA_FORM_TYPES;
    default:
      return [{ value: "general", label: "General consent" }];
  }
}

function pageCopy(mode: string) {
  switch (mode) {
    case "clinic":
      return {
        title: "Consent & Liability",
        description: "Clinic liability forms for botox, fillers, laser, and peels — signed or pending.",
      };
    case "therapy":
      return {
        title: "Intake & Consent",
        description: "Therapy intake, medical disclosure, and counselling agreements.",
      };
    case "nail_bar":
      return {
        title: "Allergy Forms",
        description: "Gel, acrylic, and chemical allergy declarations for nail clients.",
      };
    case "beauty":
      return {
        title: "Consent Forms",
        description: "Salon consent for chemical treatments, waxing, facials, and patch-test declarations.",
      };
    case "spa":
      return {
        title: "Consent & Allergies",
        description: "Spa consent for massage, contra-indications, pregnancy treatments, and allergy declarations.",
      };
    default:
      return { title: "Consent Forms", description: "Client consent and intake forms." };
  }
}

export default function ConsentFormsPage() {
  const { activeOrg } = useAuth();
  const { mode } = useBusinessCategory();
  const orgId = activeOrg?.id;
  const qc = useQueryClient();
  const types = useMemo(() => formTypesForMode(mode), [mode]);
  const copy = pageCopy(mode);

  const { data: forms = [], isLoading, error } = useEntityList<FormRow>(orgId, "consent-forms");
  const createMut = useEntityCreate(orgId, "consent-forms");
  const updateMut = useEntityUpdate(orgId, "consent-forms");
  const deleteMut = useEntityDelete(orgId, "consent-forms");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FormRow | null>(null);
  const [values, setValues] = useState({
    title: "",
    form_type: types[0]?.value ?? "general",
    content: "",
    is_signed: false,
  });

  const signedCount = forms.filter((r) => Boolean(pickRowField(r, "is_signed"))).length;
  const pendingCount = forms.length - signedCount;

  function openCreate() {
    setEditing(null);
    setValues({ title: "", form_type: types[0]?.value ?? "general", content: "", is_signed: false });
    setOpen(true);
  }

  function openEdit(row: FormRow) {
    setEditing(row);
    setValues({
      title: String(pickRowField(row, "title") ?? ""),
      form_type: String(pickRowField(row, "form_type") ?? "general"),
      content: String(pickRowField(row, "content") ?? ""),
      is_signed: Boolean(pickRowField(row, "is_signed")),
    });
    setOpen(true);
  }

  async function save() {
    try {
      const body = {
        title: values.title,
        form_type: values.form_type,
        content: values.content,
        is_signed: values.is_signed,
      };
      if (editing) {
        await updateMut.mutateAsync({ id: String(editing.id ?? editing.ID), body });
        toast.success("Consent form updated");
      } else {
        await createMut.mutateAsync(body);
        toast.success("Consent form created");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["org", orgId, "consent-forms"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <Feature flag="clinical">
      <ModulePage title={copy.title} description={copy.description}>
        <div data-testid="consent-forms-page" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 text-sm">
              <Badge variant="secondary" data-testid="consent-signed-count">
                Signed {signedCount}
              </Badge>
              <Badge variant="outline" data-testid="consent-pending-count">
                Pending {pendingCount}
              </Badge>
            </div>
            <Button onClick={openCreate} disabled={!orgId} className="gap-2">
              <Plus className="h-4 w-4" />
              New form
            </Button>
          </div>

          {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
          {error ? <p className="text-destructive">Failed to load forms.</p> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {forms.map((row) => {
              const signed = Boolean(pickRowField(row, "is_signed"));
              const id = String(row.id ?? row.ID);
              return (
                <Card key={id} className="glass" data-testid={`consent-form-${id}`}>
                  <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                    <button type="button" className="text-left" onClick={() => openEdit(row)}>
                      <CardTitle className="text-base">{String(pickRowField(row, "title") ?? "Form")}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {String(pickRowField(row, "form_type") ?? "general")} · {signed ? "signed" : "pending"}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete consent form"
                      onClick={async () => {
                        try {
                          await deleteMut.mutateAsync(id);
                          toast.success("Form deleted");
                          qc.invalidateQueries({ queryKey: ["org", orgId, "consent-forms"] });
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Delete failed");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground line-clamp-3">
                    {String(pickRowField(row, "content") ?? "")}
                  </CardContent>
                </Card>
              );
            })}
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
                <Label htmlFor="consent-title">Title</Label>
                <input
                  id="consent-title"
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
                    {types.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={values.is_signed ? "signed" : "pending"}
                  onValueChange={(v) => setValues((s) => ({ ...s, is_signed: v === "signed" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  rows={6}
                  value={values.content}
                  onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
                  placeholder="Consent body…"
                />
              </div>
            </div>
          </CrudDialog>
        </div>
      </ModulePage>
    </Feature>
  );
}
