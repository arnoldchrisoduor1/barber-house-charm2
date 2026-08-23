import { api } from "@/lib/api-client";

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
  created_at?: string;
};

function normalizeNote(raw: Record<string, unknown>): SessionNote {
  const dateRaw = String(raw.session_date ?? raw.SessionDate ?? "");
  return {
    id: String(raw.id ?? raw.ID ?? ""),
    customer_id: String(raw.customer_id ?? raw.CustomerID ?? ""),
    staff_id: raw.staff_id || raw.StaffID ? String(raw.staff_id ?? raw.StaffID) : undefined,
    booking_id: raw.booking_id || raw.BookingID ? String(raw.booking_id ?? raw.BookingID) : undefined,
    session_date: dateRaw.slice(0, 10),
    title: String(raw.title ?? raw.Title ?? ""),
    content: String(raw.content ?? raw.Content ?? ""),
    focus_area: String(raw.focus_area ?? raw.FocusArea ?? ""),
    pressure_level: String(raw.pressure_level ?? raw.PressureLevel ?? ""),
    oils_used: String(raw.oils_used ?? raw.OilsUsed ?? ""),
    contraindications: String(raw.contraindications ?? raw.Contraindications ?? ""),
    next_visit_notes: String(raw.next_visit_notes ?? raw.NextVisitNotes ?? ""),
    created_at: raw.created_at || raw.CreatedAt ? String(raw.created_at ?? raw.CreatedAt) : undefined,
  };
}

export async function fetchSessionNotes(orgId: string, customerId?: string) {
  const qs = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : "";
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/session-notes${qs}`);
  return (res.data ?? []).map(normalizeNote);
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
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/session-notes`, body);
  return normalizeNote(row as Record<string, unknown>);
}

export async function updateSessionNote(orgId: string, id: string, body: Partial<SessionNote>) {
  const row = await api.put<Record<string, unknown>>(`/organizations/${orgId}/session-notes/${id}`, body);
  return normalizeNote(row as Record<string, unknown>);
}

export async function deleteSessionNote(orgId: string, id: string) {
  return api.delete(`/organizations/${orgId}/session-notes/${id}`);
}
