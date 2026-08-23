"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { Feature } from "@/components/Feature";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  createPatientIntake,
  deletePatientIntake,
  fetchPatientIntake,
  updatePatientIntake,
  type PatientIntake,
} from "@/lib/api/clinical";
import { useEntityList } from "@/lib/api/crud";
import { pickRowField } from "@/lib/record-fields";

type CustomerRow = Record<string, unknown>;

const emptyForm = {
  customer_id: "",
  medical_history: "",
  allergies: "",
  medications: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  consent_given: false,
  notes: "",
};

export default function PatientIntakePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const qc = useQueryClient();
  const { data: customers = [] } = useEntityList<CustomerRow>(orgId, "customers");

  const listQuery = useQuery({
    queryKey: ["org", orgId, "patient-intake"],
    queryFn: () => fetchPatientIntake(orgId),
    enabled: !!orgId,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PatientIntake | null>(null);
  const [values, setValues] = useState(emptyForm);

  const customerName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers) {
      map.set(String(c.id ?? c.ID ?? ""), String(pickRowField(c, "full_name") ?? "Patient"));
    }
    return map;
  }, [customers]);

  function openCreate() {
    setEditing(null);
    setValues(emptyForm);
    setOpen(true);
  }

  function openEdit(row: PatientIntake) {
    setEditing(row);
    setValues({
      customer_id: row.customer_id,
      medical_history: row.medical_history,
      allergies: row.allergies,
      medications: row.medications,
      emergency_contact_name: row.emergency_contact_name,
      emergency_contact_phone: row.emergency_contact_phone,
      consent_given: row.consent_given,
      notes: row.notes,
    });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) {
        await updatePatientIntake(orgId, editing.id, values);
      } else {
        await createPatientIntake(orgId, values);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "patient-intake"] });
      setOpen(false);
      toast.success(editing ? "Intake updated" : "Intake created");
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePatientIntake(orgId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId, "patient-intake"] });
      toast.success("Intake deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  return (
    <Feature flag="clinical">
      <ModulePage title="Patient Intake" description="Medical history, allergies, medications, and emergency contacts.">
        <div data-testid="patient-intake-page" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreate} disabled={!orgId} className="gap-2">
              <Plus className="h-4 w-4" /> New intake
            </Button>
          </div>

          {listQuery.isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
          {!listQuery.isLoading && (listQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No intake records yet.</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {(listQuery.data ?? []).map((row) => (
              <Card key={row.id} className="glass" data-testid={`patient-intake-${row.id}`}>
                <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                  <button type="button" className="text-left" onClick={() => openEdit(row)}>
                    <CardTitle className="text-base">{customerName.get(row.customer_id) ?? "Patient"}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {row.consent_given ? "Consent on file" : "Consent pending"}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete intake"
                    onClick={() => deleteMut.mutate(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  {row.allergies ? <p>Allergies: {row.allergies}</p> : null}
                  {row.medications ? <p>Meds: {row.medications}</p> : null}
                  {row.emergency_contact_name ? (
                    <p>
                      Emergency: {row.emergency_contact_name} {row.emergency_contact_phone}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          <CrudDialog
            open={open}
            onOpenChange={setOpen}
            title={editing ? "Edit intake" : "New intake"}
            onSubmit={() => saveMut.mutate()}
            loading={saveMut.isPending}
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Patient</Label>
                <Select
                  value={values.customer_id}
                  onValueChange={(v) => setValues((s) => ({ ...s, customer_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => {
                      const id = String(c.id ?? c.ID ?? "");
                      return (
                        <SelectItem key={id} value={id}>
                          {String(pickRowField(c, "full_name") ?? "Patient")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Medical history</Label>
                <Textarea
                  rows={3}
                  value={values.medical_history}
                  onChange={(e) => setValues((s) => ({ ...s, medical_history: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Allergies</Label>
                <Input
                  value={values.allergies}
                  onChange={(e) => setValues((s) => ({ ...s, allergies: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Medications</Label>
                <Input
                  value={values.medications}
                  onChange={(e) => setValues((s) => ({ ...s, medications: e.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Emergency contact</Label>
                  <Input
                    value={values.emergency_contact_name}
                    onChange={(e) => setValues((s) => ({ ...s, emergency_contact_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Emergency phone</Label>
                  <Input
                    value={values.emergency_contact_phone}
                    onChange={(e) => setValues((s) => ({ ...s, emergency_contact_phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={values.notes}
                  onChange={(e) => setValues((s) => ({ ...s, notes: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={values.consent_given}
                  onCheckedChange={(v) => setValues((s) => ({ ...s, consent_given: v === true }))}
                />
                Consent given
              </label>
            </div>
          </CrudDialog>
        </div>
      </ModulePage>
    </Feature>
  );
}
