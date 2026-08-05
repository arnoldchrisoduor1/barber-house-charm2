import { api } from "@/lib/api-client";

export type PatchTest = {
  id: string;
  test_type: string;
  performed_at: string;
  result: string;
  expires_at?: string;
  notes?: string;
};

export type Consultation = {
  id: string;
  service_name?: string;
  treatment_summary: string;
  skin_notes?: string;
  product_used?: string;
  next_appointment_notes?: string;
  created_at: string;
};

export async function fetchPatchTests(orgId: string, customerId: string) {
  const res = await api.get<{ data: PatchTest[] }>(
    `/organizations/${orgId}/customers/${customerId}/patch-tests`,
  );
  return res.data ?? [];
}

export async function createPatchTest(
  orgId: string,
  customerId: string,
  body: { test_type?: string; result?: string; notes?: string },
) {
  const res = await api.post<PatchTest>(
    `/organizations/${orgId}/customers/${customerId}/patch-tests`,
    body,
  );
  return res;
}

export async function fetchConsultations(orgId: string, customerId: string) {
  const res = await api.get<{ data: Consultation[] }>(
    `/organizations/${orgId}/customers/${customerId}/consultations`,
  );
  return res.data ?? [];
}

export async function createConsultation(
  orgId: string,
  customerId: string,
  body: {
    service_name?: string;
    treatment_summary: string;
    skin_notes?: string;
    product_used?: string;
    next_appointment_notes?: string;
  },
) {
  const res = await api.post<Consultation>(
    `/organizations/${orgId}/customers/${customerId}/consultations`,
    body,
  );
  return res;
}
