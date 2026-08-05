import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

export interface CustomerPhoto {
  id: string;
  customerId: string;
  photoType: "before" | "after";
  serviceName?: string;
  imageUrl: string;
  takenAt?: string;
}

export interface CustomerRow {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  totalVisits: number;
  totalSpent: number;
  mergedIntoId?: string;
}

function mapCustomer(row: Record<string, unknown>): CustomerRow {
  const merged = pickRowField(row, "merged_into_id") ?? pickRowField(row, "MergedIntoID");
  return {
    id: String(pickRowField(row, "id") ?? ""),
    fullName: String(pickRowField(row, "full_name") ?? pickRowField(row, "FullName") ?? ""),
    phone: pickRowField(row, "phone") ? String(pickRowField(row, "phone")) : undefined,
    email: pickRowField(row, "email") ? String(pickRowField(row, "email")) : undefined,
    totalVisits: Number(pickRowField(row, "total_visits") ?? 0),
    totalSpent: Number(pickRowField(row, "total_spent") ?? 0),
    mergedIntoId: merged ? String(merged) : undefined,
  };
}

function mapTag(row: Record<string, unknown>): CustomerTag {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    name: String(pickRowField(row, "name") ?? ""),
    color: String(pickRowField(row, "color") ?? "bg-primary"),
  };
}

function mapPhoto(row: Record<string, unknown>): CustomerPhoto {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    customerId: String(pickRowField(row, "customer_id") ?? ""),
    photoType: (pickRowField(row, "photo_type") ?? "after") as "before" | "after",
    serviceName: pickRowField(row, "service_name") ? String(pickRowField(row, "service_name")) : undefined,
    imageUrl: String(pickRowField(row, "image_url") ?? ""),
    takenAt: pickRowField(row, "taken_at") ? String(pickRowField(row, "taken_at")) : undefined,
  };
}

export async function fetchCustomers(orgId: string): Promise<CustomerRow[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/customers`);
  return (res.data ?? []).map(mapCustomer);
}

export async function mergeCustomers(orgId: string, primaryId: string, mergeIds: string[]): Promise<CustomerRow> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/customers/merge`, {
    primary_id: primaryId,
    merge_ids: mergeIds,
  });
  return mapCustomer(row);
}

export async function fetchCustomerTags(orgId: string): Promise<CustomerTag[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/customer-tags`);
  return (res.data ?? []).map(mapTag);
}

export async function createCustomerTag(orgId: string, name: string, color?: string): Promise<CustomerTag> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/customer-tags`, { name, color });
  return mapTag(row);
}

export async function deleteCustomerTag(orgId: string, tagId: string): Promise<void> {
  await api.delete(`/organizations/${orgId}/customer-tags/${tagId}`);
}

export async function fetchCustomerPhotos(orgId: string, customerId: string): Promise<CustomerPhoto[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    `/organizations/${orgId}/customers/${customerId}/photos`,
  );
  return (res.data ?? []).map(mapPhoto);
}

export async function createCustomerPhoto(
  orgId: string,
  customerId: string,
  payload: { photo_type: "before" | "after"; service_name?: string; image_url: string; taken_at?: string },
): Promise<CustomerPhoto> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/customers/${customerId}/photos`, payload);
  return mapPhoto(row);
}
