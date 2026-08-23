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

export {
  type SessionNote,
  fetchSessionNotes,
  createSessionNote,
  updateSessionNote,
  deleteSessionNote,
} from "@/lib/api/session-notes";

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
