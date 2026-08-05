import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

export interface Enquiry {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  source: string;
  status: string;
  convertedBookingId?: string;
  createdAt?: string;
}

function mapEnquiry(row: Record<string, unknown>): Enquiry {
  const bookingId = pickRowField(row, "converted_booking_id");
  return {
    id: String(pickRowField(row, "id") ?? ""),
    name: String(pickRowField(row, "name") ?? ""),
    email: pickRowField(row, "email") ? String(pickRowField(row, "email")) : undefined,
    phone: pickRowField(row, "phone") ? String(pickRowField(row, "phone")) : undefined,
    subject: String(pickRowField(row, "subject") ?? ""),
    message: String(pickRowField(row, "message") ?? ""),
    isRead: Boolean(pickRowField(row, "is_read")),
    source: String(pickRowField(row, "source") ?? "web"),
    status: String(pickRowField(row, "status") ?? "open"),
    convertedBookingId: bookingId ? String(bookingId) : undefined,
    createdAt: pickRowField(row, "created_at") ? String(pickRowField(row, "created_at")) : undefined,
  };
}

export async function fetchEnquiries(orgId: string): Promise<Enquiry[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/enquiries`);
  return (res.data ?? []).map(mapEnquiry);
}

export async function createDeskEnquiry(
  orgId: string,
  payload: { name: string; phone?: string; subject?: string; message?: string },
): Promise<Enquiry> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/enquiry-desk`, payload);
  return mapEnquiry(row);
}

export async function markEnquiryRead(orgId: string, enquiryId: string): Promise<Enquiry> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/enquiry-desk/${enquiryId}/read`, {});
  return mapEnquiry(row);
}

export async function convertEnquiryToBooking(
  orgId: string,
  enquiryId: string,
  payload: { booking_date: string; start_time: string; end_time: string; notes?: string },
): Promise<Enquiry> {
  const row = await api.post<Record<string, unknown>>(
    `/organizations/${orgId}/enquiry-desk/${enquiryId}/convert-to-booking`,
    payload,
  );
  return mapEnquiry(row);
}
