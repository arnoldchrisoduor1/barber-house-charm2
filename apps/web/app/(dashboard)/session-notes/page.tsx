"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { FeatureGate } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useEntityList } from "@/lib/api/crud";
import {
  createSessionNote,
  deleteSessionNote,
  fetchSessionNotes,
  updateSessionNote,
  type SessionNote,
} from "@/lib/api/session-notes";
import { pickRowField } from "@/lib/record-fields";

type CustomerRow = Record<string, unknown>;

const emptyForm = {
  customer_id: "",
  session_date: new Date().toISOString().slice(0, 10),
  title: "",
  content: "",
  focus_area: "",
  pressure_level: "",
  oils_used: "",
  contraindications: "",
  next_visit_notes: "",
};

export default function SessionNotesPage() {
  const { activeOrg } = useAuth();
  const { mode, terms } = useBusinessCategory();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();
  const isTherapy = mode === "therapy";
  const clientLabel = isTherapy ? "Client" : (terms?.clientSingular ?? "Guest");

  const { data: customers = [] } = useEntityList<CustomerRow>(orgId, "customers");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SessionNote | null>(null);
  const [values, setValues] = useState(emptyForm);
  const [filterCustomer, setFilterCustomer] = useState("");

  const listQuery = useQuery({
    queryKey: ["org", orgId, "session-notes", filterCustomer],
    queryFn: () => fetchSessionNotes(orgId, filterCustomer || undefined),
    enabled: !!orgId,
  });

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        id: String(c.id ?? c.ID ?? ""),
        name: String(pickRowField(c, "full_name") ?? clientLabel),
      })),
    [customers, clientLabel],
  );

  function openCreate() {
    setEditing(null);
    setValues({ ...emptyForm, customer_id: filterCustomer });
    setOpen(true);
  }

  function openEdit(note: SessionNote) {
    setEditing(note);
    setValues({
      customer_id: note.customer_id,
      session_date: note.session_date,
      title: note.title,
      content: note.content,
      focus_area: note.focus_area ?? "",
      pressure_level: note.pressure_level ?? "",
      oils_used: note.oils_used ?? "",
      contraindications: note.contraindications ?? "",
      next_visit_notes: note.next_visit_notes ?? "",
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) {
        await updateSessionNote(orgId, editing.id, values);
      } else {
        await createSessionNote(orgId, values);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "session-notes"] });
      setOpen(false);
      toast.success(editing ? "Session note updated" : "Session note added");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSessionNote(orgId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "session-notes"] });
      toast.success("Session note deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  const notes = listQuery.data ?? [];

  return (
    <FeatureGate
      feature="therapy_notes"
      fallback={
        <ModulePage title="Session Notes" description="Clinical session documentation.">
          <div data-testid="session-notes-locked" className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Session notes locked on this plan. Enable therapy notes to add and edit records.
          </div>
        </ModulePage>
      }
    >
      <ModulePage
        title="Session Notes"
        description={
          isTherapy
            ? "Therapy session notes — presenting concern, interventions, homework, next session."
            : "Treatment session notes per guest."
        }
      >
        <div data-testid="session-notes-page" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2 min-w-[220px]">
              <Label>Filter {clientLabel.toLowerCase()}</Label>
              <Select value={filterCustomer || "__all"} onValueChange={(v) => setFilterCustomer(v === "__all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={`All ${clientLabel.toLowerCase()}s`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {customerOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreate} disabled={!orgId} className="gap-2">
              <Plus className="h-4 w-4" /> New note
            </Button>
          </div>

          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading notes…</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No session notes yet.</p>
          ) : (
            notes.map((n) => (
              <Card key={n.id} className="glass" data-testid={`session-note-${n.id}`}>
                <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{n.title || "Session note"}</CardTitle>
                    <p className="text-xs text-muted-foreground">{n.session_date}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" aria-label="Edit note" onClick={() => openEdit(n)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete note" onClick={() => deleteMut.mutate(n.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1 text-muted-foreground">
                  {n.content ? <p>{n.content}</p> : null}
                  {n.focus_area ? (
                    <p>
                      <span className="text-foreground">{isTherapy ? "Presenting concern:" : "Focus:"}</span>{" "}
                      {n.focus_area}
                    </p>
                  ) : null}
                  {n.pressure_level ? (
                    <p>
                      <span className="text-foreground">{isTherapy ? "Mood / engagement:" : "Pressure:"}</span>{" "}
                      {n.pressure_level}
                    </p>
                  ) : null}
                  {n.oils_used && !isTherapy ? (
                    <p>
                      <span className="text-foreground">Oils:</span> {n.oils_used}
                    </p>
                  ) : null}
                  {n.oils_used && isTherapy ? (
                    <p>
                      <span className="text-foreground">Interventions:</span> {n.oils_used}
                    </p>
                  ) : null}
                  {n.next_visit_notes ? (
                    <p>
                      <span className="text-foreground">{isTherapy ? "Homework / next:" : "Next visit:"}</span>{" "}
                      {n.next_visit_notes}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}

          <CrudDialog
            open={open}
            onOpenChange={setOpen}
            title={editing ? "Edit session note" : "New session note"}
            onSubmit={() => saveMut.mutate()}
            loading={saveMut.isPending}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>{clientLabel}</Label>
                <Select
                  value={values.customer_id}
                  onValueChange={(v) => setValues((s) => ({ ...s, customer_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${clientLabel.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {customerOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session date</Label>
                <Input
                  type="date"
                  value={values.session_date}
                  onChange={(e) => setValues((s) => ({ ...s, session_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={values.title}
                  onChange={(e) => setValues((s) => ({ ...s, title: e.target.value }))}
                  placeholder={isTherapy ? "CBT check-in" : "Swedish massage follow-up"}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Session summary</Label>
                <Textarea
                  value={values.content}
                  onChange={(e) => setValues((s) => ({ ...s, content: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{isTherapy ? "Presenting concern" : "Focus area"}</Label>
                <Input
                  value={values.focus_area}
                  onChange={(e) => setValues((s) => ({ ...s, focus_area: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{isTherapy ? "Mood / engagement" : "Pressure level"}</Label>
                <Input
                  value={values.pressure_level}
                  onChange={(e) => setValues((s) => ({ ...s, pressure_level: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{isTherapy ? "Interventions used" : "Oils / products used"}</Label>
                <Input
                  value={values.oils_used}
                  onChange={(e) => setValues((s) => ({ ...s, oils_used: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{isTherapy ? "Risks / contraindications" : "Contraindications noted"}</Label>
                <Input
                  value={values.contraindications}
                  onChange={(e) => setValues((s) => ({ ...s, contraindications: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{isTherapy ? "Homework / next session" : "Next visit notes"}</Label>
                <Textarea
                  value={values.next_visit_notes}
                  onChange={(e) => setValues((s) => ({ ...s, next_visit_notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
          </CrudDialog>
        </div>
      </ModulePage>
    </FeatureGate>
  );
}
