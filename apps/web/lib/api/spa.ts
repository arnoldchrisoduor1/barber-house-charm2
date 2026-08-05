import { api } from "@/lib/api-client";

export type SpaResource = {
  id: string;
  name: string;
  resource_type: string;
  capacity: number;
  status: string;
  notes?: string;
  branch_id?: string;
};

export type SessionNote = {
  id: string;
  customer_id: string;
  staff_id?: string;
  booking_id?: string;
  session_date: string;
  title: string;
  content: string;
  focus_area?: string;
  pressure_level?: string;
  oils_used?: string;
  contraindications?: string;
  next_visit_notes?: string;
  created_at: string;
};

export async function fetchResources(orgId: string, branchId?: string) {
  const qs = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : "";
  const res = await api.get<{ data: SpaResource[] }>(`/organizations/${orgId}/resources${qs}`);
  return res.data ?? [];
}

export async function createResource(
  orgId: string,
  body: {
    name: string;
    resource_type?: string;
    capacity?: number;
    status?: string;
    notes?: string;
    branch_id?: string;
  },
) {
  return api.post<SpaResource>(`/organizations/${orgId}/resources`, body);
}

export async function updateResource(orgId: string, id: string, body: Partial<SpaResource>) {
  return api.put<SpaResource>(`/organizations/${orgId}/resources/${id}`, body);
}

export async function deleteResource(orgId: string, id: string) {
  return api.delete(`/organizations/${orgId}/resources/${id}`);
}

export async function fetchSessionNotes(orgId: string, customerId?: string) {
  const qs = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : "";
  const res = await api.get<{ data: SessionNote[] }>(`/organizations/${orgId}/session-notes${qs}`);
  return res.data ?? [];
}

export async function createSessionNote(
  orgId: string,
  body: {
    customer_id: string;
    staff_id?: string;
    booking_id?: string;
    session_date: string;
    title?: string;
    content?: string;
    focus_area?: string;
    pressure_level?: string;
    oils_used?: string;
    contraindications?: string;
    next_visit_notes?: string;
  },
) {
  return api.post<SessionNote>(`/organizations/${orgId}/session-notes`, body);
}

export async function updateSessionNote(orgId: string, id: string, body: Partial<SessionNote>) {
  return api.put<SessionNote>(`/organizations/${orgId}/session-notes/${id}`, body);
}

export async function deleteSessionNote(orgId: string, id: string) {
  return api.delete(`/organizations/${orgId}/session-notes/${id}`);
}

export const SPA_AFTERCARE_TEMPLATES = [
  {
    title: "Post-Massage Hydration",
    body: "Drink 2–3 glasses of water within 2 hours. Avoid alcohol for 24 hours. Light stretching recommended.",
  },
  {
    title: "Hot Stone Aftercare",
    body: "Rest for 30 minutes. Avoid cold exposure for 2 hours. Monitor skin for redness.",
  },
  {
    title: "Body Wrap / Detox",
    body: "Continue hydration. Avoid heavy meals for 4 hours. Gentle movement only for the rest of the day.",
  },
  {
    title: "Pre-Treatment Reminders",
    body: "Arrive hydrated. Avoid alcohol 24h before. Inform therapist of pregnancy, injuries, or allergies.",
  },
] as const;
