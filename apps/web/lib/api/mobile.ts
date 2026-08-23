import { api } from "@/lib/api-client";

export type CoverageZone = {
  id: string;
  name: string;
  city: string;
  radius_km: number;
  surcharge_kes: number;
  is_active: boolean;
};

export type FieldJob = {
  id: string;
  booking_id?: string;
  staff_id?: string;
  coverage_zone_id?: string;
  status: string;
  visit_address: string;
  notes: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
};

function pick(raw: Record<string, unknown>, snake: string, pascal: string) {
  return raw[snake] ?? raw[pascal];
}

function mapZone(raw: Record<string, unknown>): CoverageZone {
  return {
    id: String(pick(raw, "id", "ID") ?? ""),
    name: String(pick(raw, "name", "Name") ?? ""),
    city: String(pick(raw, "city", "City") ?? ""),
    radius_km: Number(pick(raw, "radius_km", "RadiusKm") ?? 0),
    surcharge_kes: Number(pick(raw, "surcharge_kes", "SurchargeKES") ?? 0),
    is_active: Boolean(pick(raw, "is_active", "IsActive") ?? true),
  };
}

function mapJob(raw: Record<string, unknown>): FieldJob {
  const booking = pick(raw, "booking_id", "BookingID");
  const staff = pick(raw, "staff_id", "StaffID");
  const zone = pick(raw, "coverage_zone_id", "CoverageZoneID");
  return {
    id: String(pick(raw, "id", "ID") ?? ""),
    booking_id: booking ? String(booking) : undefined,
    staff_id: staff ? String(staff) : undefined,
    coverage_zone_id: zone ? String(zone) : undefined,
    status: String(pick(raw, "status", "Status") ?? "assigned"),
    visit_address: String(pick(raw, "visit_address", "VisitAddress") ?? ""),
    notes: String(pick(raw, "notes", "Notes") ?? ""),
    scheduled_at: pick(raw, "scheduled_at", "ScheduledAt")
      ? String(pick(raw, "scheduled_at", "ScheduledAt"))
      : undefined,
    started_at: pick(raw, "started_at", "StartedAt")
      ? String(pick(raw, "started_at", "StartedAt"))
      : undefined,
    completed_at: pick(raw, "completed_at", "CompletedAt")
      ? String(pick(raw, "completed_at", "CompletedAt"))
      : undefined,
  };
}

export async function fetchCoverageZones(orgId: string) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/coverage-zones`);
  return (res.data ?? []).map(mapZone);
}

export async function createCoverageZone(
  orgId: string,
  body: { name: string; city: string; radius_km: number; surcharge_kes: number; is_active?: boolean },
) {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/coverage-zones`, body);
  return mapZone(row);
}

export async function updateCoverageZone(
  orgId: string,
  id: string,
  body: { name: string; city: string; radius_km: number; surcharge_kes: number; is_active?: boolean },
) {
  const row = await api.put<Record<string, unknown>>(`/organizations/${orgId}/coverage-zones/${id}`, body);
  return mapZone(row);
}

export async function deleteCoverageZone(orgId: string, id: string) {
  await api.delete(`/organizations/${orgId}/coverage-zones/${id}`);
}

export async function fetchFieldJobs(orgId: string, params?: { staff_id?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.staff_id) qs.set("staff_id", params.staff_id);
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/field-jobs${suffix}`);
  return (res.data ?? []).map(mapJob);
}

export async function createFieldJob(
  orgId: string,
  body: {
    booking_id?: string;
    staff_id?: string;
    coverage_zone_id?: string;
    status?: string;
    visit_address?: string;
    notes?: string;
    scheduled_at?: string;
  },
) {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/field-jobs`, body);
  return mapJob(row);
}

export async function advanceFieldJob(orgId: string, id: string, status?: string) {
  const row = await api.post<Record<string, unknown>>(
    `/organizations/${orgId}/field-jobs/${id}/advance`,
    status ? { status } : {},
  );
  return mapJob(row);
}

export async function deleteFieldJob(orgId: string, id: string) {
  await api.delete(`/organizations/${orgId}/field-jobs/${id}`);
}
