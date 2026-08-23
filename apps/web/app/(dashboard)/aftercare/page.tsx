"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  createAftercare,
  deleteAftercare,
  fetchAftercare,
  updateAftercare,
  type AftercareInstruction,
} from "@/lib/api/clinical";
import { SPA_AFTERCARE_TEMPLATES } from "@/lib/api/spa";

const emptyForm = {
  title: "",
  body: "",
  procedure_name: "",
  follow_up_at: "",
  is_template: true,
};

export default function AftercarePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["org", orgId, "aftercare-instructions"],
    queryFn: () => fetchAftercare(orgId),
    enabled: !!orgId,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AftercareInstruction | null>(null);
  const [values, setValues] = useState(emptyForm);

  function openCreate(seed?: { title: string; body: string }) {
    setEditing(null);
    setValues({
      ...emptyForm,
      title: seed?.title ?? "",
      body: seed?.body ?? "",
    });
    setOpen(true);
  }

  function openEdit(row: AftercareInstruction) {
    setEditing(row);
    setValues({
      title: row.title,
      body: row.body,
      procedure_name: row.procedure_name,
      follow_up_at: row.follow_up_at ?? "",
      is_template: row.is_template,
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        title: values.title,
        body: values.body,
        procedure_name: values.procedure_name,
        follow_up_at: values.follow_up_at || undefined,
        is_template: values.is_template,
      };
      if (editing) {
        await updateAftercare(orgId, editing.id, body);
      } else {
        await createAftercare(orgId, body);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "aftercare-instructions"] });
      setOpen(false);
      toast.success(editing ? "Aftercare updated" : "Aftercare created");
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAftercare(orgId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "aftercare-instructions"] });
      toast.success("Aftercare deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  const rows = listQuery.data ?? [];

  return (
    <Feature flag="clinical">
      <ModulePage title="Aftercare" description="Persisted aftercare templates and follow-up instructions.">
        <div data-testid="aftercare-page" className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => openCreate(SPA_AFTERCARE_TEMPLATES[0])} disabled={!orgId}>
              Seed spa template
            </Button>
            <Button onClick={() => openCreate()} disabled={!orgId} className="gap-2">
              <Plus className="h-4 w-4" /> New template
            </Button>
          </div>

          {listQuery.isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
          {!listQuery.isLoading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No aftercare templates yet.</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <Card key={row.id} className="glass" data-testid={`aftercare-${row.id}`}>
                <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                  <button type="button" className="text-left" onClick={() => openEdit(row)}>
                    <CardTitle className="text-base">{row.title}</CardTitle>
                    {row.procedure_name ? (
                      <p className="text-xs text-muted-foreground mt-1">{row.procedure_name}</p>
                    ) : null}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete aftercare"
                    onClick={() => deleteMut.mutate(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{row.body}</CardContent>
              </Card>
            ))}
          </div>

          <CrudDialog
            open={open}
            onOpenChange={setOpen}
            title={editing ? "Edit aftercare" : "New aftercare"}
            onSubmit={() => saveMut.mutate()}
            loading={saveMut.isPending}
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={values.title} onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Procedure / treatment</Label>
                <Input
                  value={values.procedure_name}
                  onChange={(e) => setValues((s) => ({ ...s, procedure_name: e.target.value }))}
                  placeholder="Botox, laser peel…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Instructions</Label>
                <Textarea
                  rows={5}
                  value={values.body}
                  onChange={(e) => setValues((s) => ({ ...s, body: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up date (optional)</Label>
                <Input
                  type="date"
                  value={values.follow_up_at}
                  onChange={(e) => setValues((s) => ({ ...s, follow_up_at: e.target.value }))}
                />
              </div>
            </div>
          </CrudDialog>
        </div>
      </ModulePage>
    </Feature>
  );
}
