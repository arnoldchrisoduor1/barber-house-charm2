import { api, apiClient } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

export interface BookingBranch {
  id: string;
  name: string;
  address?: string;
}

export interface BookingServiceItem {
  id: string;
  name: string;
  category: string;
  priceKes: number;
  durationMinutes: number;
  description?: string;
}

export interface BookingStaffMember {
  id: string;
  displayName: string;
  title?: string;
  role: string;
  bio?: string;
  branchId?: string;
}

export interface BookingCatalog {
  branches: BookingBranch[];
  services: BookingServiceItem[];
  staff: BookingStaffMember[];
}

export interface PortalBookingPayload {
  branchId?: string;
  staffId: string;
  serviceIds: string[];
  bookingDate: string;
  startTime: string;
  fullName: string;
  phone: string;
  notes?: string;
}

function mapBranch(row: Record<string, unknown>): BookingBranch {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    name: String(pickRowField(row, "name") ?? "Branch"),
    address: pickRowField(row, "address") ? String(pickRowField(row, "address")) : undefined,
  };
}

function mapService(row: Record<string, unknown>): BookingServiceItem {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    name: String(pickRowField(row, "name") ?? ""),
    category: String(pickRowField(row, "category") ?? ""),
    priceKes: Number(pickRowField(row, "price_kes") ?? 0),
    durationMinutes: Number(pickRowField(row, "duration_minutes") ?? 30),
    description: pickRowField(row, "description") ? String(pickRowField(row, "description")) : undefined,
  };
}

function mapStaff(row: Record<string, unknown>): BookingStaffMember {
  const branchId = pickRowField(row, "branch_id");
  return {
    id: String(pickRowField(row, "id") ?? ""),
    displayName: String(pickRowField(row, "display_name") ?? ""),
    title: pickRowField(row, "title") ? String(pickRowField(row, "title")) : undefined,
    role: String(pickRowField(row, "role") ?? ""),
    bio: pickRowField(row, "bio") ? String(pickRowField(row, "bio")) : undefined,
    branchId: branchId ? String(branchId) : undefined,
  };
}

export async function fetchPublicCatalog(orgSlug: string, branchId?: string): Promise<BookingCatalog> {
  const res = await apiClient<{
    branches: Record<string, unknown>[];
    services: Record<string, unknown>[];
    staff: Record<string, unknown>[];
  }>(`/organizations/public/${orgSlug}/catalog`, {
    params: branchId ? { branch_id: branchId } : undefined,
  });
  return {
    branches: (res.branches ?? []).map(mapBranch),
    services: (res.services ?? []).filter((s) => pickRowField(s, "is_active") !== false).map(mapService),
    staff: (res.staff ?? []).map(mapStaff),
  };
}

export async function fetchOrgCatalog(orgId: string, branchId?: string): Promise<BookingCatalog> {
  const res = await api.get<{
    branches: Record<string, unknown>[];
    services: Record<string, unknown>[];
    staff: Record<string, unknown>[];
  }>(`/organizations/${orgId}/bookings/catalog`, {
    params: branchId ? { branch_id: branchId } : undefined,
  });
  return {
    branches: (res.branches ?? []).map(mapBranch),
    services: (res.services ?? []).filter((s) => pickRowField(s, "is_active") !== false).map(mapService),
    staff: (res.staff ?? []).map(mapStaff),
  };
}

export async function fetchStaffAvailability(
  basePath: string,
  params: {
    bookingDate: string;
    startTime: string;
    durationMinutes: number;
    branchId?: string;
    staffIds: string[];
  },
): Promise<Record<string, boolean>> {
  const res = await apiClient<{ availability: Record<string, boolean> }>(basePath, {
    params: {
      booking_date: params.bookingDate,
      start_time: params.startTime,
      duration_minutes: params.durationMinutes,
      branch_id: params.branchId,
      staff_ids: params.staffIds.join(","),
    },
  });
  return res.availability ?? {};
}

export async function submitPublicBooking(orgSlug: string, payload: PortalBookingPayload) {
  return apiClient(`/organizations/public/${orgSlug}/bookings`, {
    method: "POST",
    body: { ...payload } as Record<string, unknown>,
  });
}

export async function submitPortalBooking(orgId: string, payload: PortalBookingPayload) {
  return api.post<Record<string, unknown>>(`/organizations/${orgId}/bookings/portal`, { ...payload } as Record<string, unknown>);
}

export interface BookingRow {
  id: string;
  customerId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface BookingServiceLine {
  serviceName: string;
  durationMinutes: number;
  priceKes: number;
}

function mapBookingRow(row: Record<string, unknown>): BookingRow {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    customerId: String(pickRowField(row, "customer_id") ?? ""),
    bookingDate: String(pickRowField(row, "booking_date") ?? ""),
    startTime: String(pickRowField(row, "start_time") ?? ""),
    endTime: String(pickRowField(row, "end_time") ?? ""),
    status: String(pickRowField(row, "status") ?? "scheduled"),
  };
}

export async function fetchBookings(
  orgId: string,
  params?: { customerPhone?: string; status?: string; branchId?: string },
) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/bookings`, {
    params: {
      customer_phone: params?.customerPhone,
      status: params?.status,
      branch_id: params?.branchId,
    },
  });
  return (res.data ?? []).map(mapBookingRow);
}

export async function fetchBookingServices(orgId: string, bookingId: string) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    `/organizations/${orgId}/bookings/${bookingId}/services`,
  );
  return (res.data ?? []).map((row) => ({
    serviceName: String(pickRowField(row, "service_name") ?? ""),
    durationMinutes: Number(pickRowField(row, "duration_minutes") ?? 30),
    priceKes: Number(pickRowField(row, "price_kes") ?? 0),
  }));
}

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

export function addMinutesToTime(start: string, minutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}
