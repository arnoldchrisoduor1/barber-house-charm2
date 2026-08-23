import { api } from "@/lib/api-client";

export type PatientIntake = {
  id: string;
  customer_id: string;
  medical_history: string;
  allergies: string;
  medications: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  consent_given: boolean;
  notes: string;
};

export type AftercareInstruction = {
  id: string;
  title: string;
  body: string;
  procedure_name: string;
  booking_id?: string;
  follow_up_at?: string;
  is_template: boolean;
};

export type ProgressMetric = {
  id: string;
  customer_id: string;
  metric_name: string;
  metric_value: string;
  notes: string;
  recorded_at: string;
};

function pick(raw: Record<string, unknown>, snake: string, pascal: string) {
  return raw[snake] ?? raw[pascal];
}

export async function fetchPatientIntake(orgId: string, customerId?: string) {
  const qs = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : "";
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/patient-intake${qs}`);
  return (res.data ?? []).map((raw) => ({
    id: String(pick(raw, "id", "ID") ?? ""),
    customer_id: String(pick(raw, "customer_id", "CustomerID") ?? ""),
    medical_history: String(pick(raw, "medical_history", "MedicalHistory") ?? ""),
    allergies: String(pick(raw, "allergies", "Allergies") ?? ""),
    medications: String(pick(raw, "medications", "Medications") ?? ""),
    emergency_contact_name: String(pick(raw, "emergency_contact_name", "EmergencyContactName") ?? ""),
    emergency_contact_phone: String(pick(raw, "emergency_contact_phone", "EmergencyContactPhone") ?? ""),
    consent_given: Boolean(pick(raw, "consent_given", "ConsentGiven")),
    notes: String(pick(raw, "notes", "Notes") ?? ""),
  })) as PatientIntake[];
}

export async function createPatientIntake(orgId: string, body: Omit<PatientIntake, "id">) {
  return api.post(`/organizations/${orgId}/patient-intake`, body);
}

export async function updatePatientIntake(orgId: string, id: string, body: Partial<PatientIntake>) {
  return api.put(`/organizations/${orgId}/patient-intake/${id}`, body);
}

export async function deletePatientIntake(orgId: string, id: string) {
  return api.delete(`/organizations/${orgId}/patient-intake/${id}`);
}

export async function fetchAftercare(orgId: string) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/aftercare-instructions`);
  return (res.data ?? []).map((raw) => ({
    id: String(pick(raw, "id", "ID") ?? ""),
    title: String(pick(raw, "title", "Title") ?? ""),
    body: String(pick(raw, "body", "Body") ?? ""),
    procedure_name: String(pick(raw, "procedure_name", "ProcedureName") ?? ""),
    booking_id: pick(raw, "booking_id", "BookingID")
      ? String(pick(raw, "booking_id", "BookingID"))
      : undefined,
    follow_up_at: pick(raw, "follow_up_at", "FollowUpAt")
      ? String(pick(raw, "follow_up_at", "FollowUpAt")).slice(0, 10)
      : undefined,
    is_template: Boolean(pick(raw, "is_template", "IsTemplate") ?? true),
  })) as AftercareInstruction[];
}

export async function createAftercare(orgId: string, body: Omit<AftercareInstruction, "id">) {
  return api.post(`/organizations/${orgId}/aftercare-instructions`, body);
}

export async function updateAftercare(orgId: string, id: string, body: Partial<AftercareInstruction>) {
  return api.put(`/organizations/${orgId}/aftercare-instructions/${id}`, body);
}

export async function deleteAftercare(orgId: string, id: string) {
  return api.delete(`/organizations/${orgId}/aftercare-instructions/${id}`);
}

export async function fetchProgressMetrics(orgId: string, customerId?: string) {
  const qs = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : "";
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/progress-tracking${qs}`);
  return (res.data ?? []).map((raw) => ({
    id: String(pick(raw, "id", "ID") ?? ""),
    customer_id: String(pick(raw, "customer_id", "CustomerID") ?? ""),
    metric_name: String(pick(raw, "metric_name", "MetricName") ?? ""),
    metric_value: String(pick(raw, "metric_value", "MetricValue") ?? ""),
    notes: String(pick(raw, "notes", "Notes") ?? ""),
    recorded_at: String(pick(raw, "recorded_at", "RecordedAt") ?? "").slice(0, 10),
  })) as ProgressMetric[];
}

export async function createProgressMetric(orgId: string, body: Omit<ProgressMetric, "id">) {
  return api.post(`/organizations/${orgId}/progress-tracking`, body);
}

export async function updateProgressMetric(orgId: string, id: string, body: Partial<ProgressMetric>) {
  return api.put(`/organizations/${orgId}/progress-tracking/${id}`, body);
}

export async function deleteProgressMetric(orgId: string, id: string) {
  return api.delete(`/organizations/${orgId}/progress-tracking/${id}`);
}
