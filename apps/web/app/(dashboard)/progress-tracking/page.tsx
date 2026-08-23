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
import {
  createProgressMetric,
  deleteProgressMetric,
  fetchProgressMetrics,
  updateProgressMetric,
  type ProgressMetric,
} from "@/lib/api/clinical";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type CustomerRow = Record<string, unknown>;

const emptyForm = {
  customer_id: "",
  metric_name: "",
  metric_value: "",
  notes: "",
  recorded_at: new Date().toISOString().slice(0, 10),
};

export default function ProgressTrackingPage() {
  const { activeOrg } = useAuth();
  const { mode, terms } = useBusinessCategory();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();
  const progressDescription =
    mode === "therapy"
      ? "Metric tracking for therapy clients."
      : mode === "spa"
        ? `Track ${terms.clientSingular.toLowerCase()} progress metrics across sessions.`
        : `Track metric_name / metric_value progress per ${terms.clientSingular.toLowerCase()}.`;
  const lockedDescription =
    mode === "therapy"
      ? "Metric tracking for therapy clients."
      : `Progress tracking for ${terms.clientPlural.toLowerCase()}.`;

  const { data: customers = [] } = useEntityList<CustomerRow>(orgId, "customers");
  const listQuery = useQuery({
    queryKey: ["org", orgId, "progress-tracking"],
    queryFn: () => fetchProgressMetrics(orgId),
    enabled: !!orgId,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProgressMetric | null>(null);
  const [values, setValues] = useState(emptyForm);

  const customerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers) {
      map.set(String(c.id ?? c.ID ?? ""), String(pickRowField(c, "full_name") ?? "Client"));
    }
    return map;
  }, [customers]);

  function openCreate() {
    setEditing(null);
    setValues(emptyForm);
    setOpen(true);
  }

  function openEdit(row: ProgressMetric) {
    setEditing(row);
    setValues({
      customer_id: row.customer_id,
      metric_name: row.metric_name,
      metric_value: row.metric_value,
      notes: row.notes,
      recorded_at: row.recorded_at,
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) {
        await updateProgressMetric(orgId, editing.id, values);
      } else {
        await createProgressMetric(orgId, values);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "progress-tracking"] });
      setOpen(false);
      toast.success(editing ? "Progress updated" : "Progress recorded!");
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProgressMetric(orgId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "progress-tracking"] });
      toast.success("Progress deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  const rows = listQuery.data ?? [];

  return (
    <FeatureGate
      feature="therapy_notes"
      fallback={
        <ModulePage title="Client Progress" description={lockedDescription}>
          <div data-testid="progress-tracking-locked" className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Progress tracking locked on this plan. Enable therapy notes to record metrics.
          </div>
        </ModulePage>
      }
    >
      <ModulePage title="Client Progress" description={progressDescription}>
        <div data-testid="progress-tracking-page" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate} disabled={!orgId} className="gap-2">
              <Plus className="h-4 w-4" /> Record progress
            </Button>
          </div>

          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading progress…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No progress metrics yet.</p>
          ) : (
            rows.map((row) => (
              <Card key={row.id} className="glass" data-testid={`progress-${row.id}`}>
                <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{customerName.get(row.customer_id) ?? "Client"}</CardTitle>
                    <p className="text-xs text-muted-foreground">{row.recorded_at}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" aria-label="Edit progress" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete progress" onClick={() => deleteMut.mutate(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    <span className="text-foreground font-medium">{row.metric_name}:</span> {row.metric_value}
                  </p>
                  {row.notes ? <p className="text-muted-foreground">{row.notes}</p> : null}
                </CardContent>
              </Card>
            ))
          )}

          <CrudDialog
            open={open}
            onOpenChange={setOpen}
            title={editing ? "Edit progress" : "Record progress"}
            onSubmit={() => saveMut.mutate()}
            loading={saveMut.isPending}
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select
                  value={values.customer_id}
                  onValueChange={(v) => setValues((s) => ({ ...s, customer_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => {
                      const id = String(c.id ?? c.ID ?? "");
                      return (
                        <SelectItem key={id} value={id}>
                          {String(pickRowField(c, "full_name") ?? "Client")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Metric name</Label>
                <Input
                  value={values.metric_name}
                  onChange={(e) => setValues((s) => ({ ...s, metric_name: e.target.value }))}
                  placeholder="Pain score, PHQ-9, ROM…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Metric value</Label>
                <Input
                  value={values.metric_value}
                  onChange={(e) => setValues((s) => ({ ...s, metric_value: e.target.value }))}
                  placeholder="4/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Recorded at</Label>
                <Input
                  type="date"
                  value={values.recorded_at}
                  onChange={(e) => setValues((s) => ({ ...s, recorded_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={values.notes}
                  onChange={(e) => setValues((s) => ({ ...s, notes: e.target.value }))}
                />
              </div>
            </div>
          </CrudDialog>
        </div>
      </ModulePage>
    </FeatureGate>
  );
}
