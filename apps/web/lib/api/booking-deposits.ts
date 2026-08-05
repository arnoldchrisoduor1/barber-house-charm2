import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

export interface BookingPolicy {
  deposits_enabled: boolean;
  deposit_type: "percent" | "fixed";
  deposit_amount: number;
  refund_window_hours: number;
  late_cancel_fee_kes: number;
  late_cancel_hours: number;
}

export interface BookingDepositRow {
  id: string;
  bookingId: string;
  customerId: string;
  amountKes: number;
  status: string;
  paymentRef?: string;
  createdAt?: string;
}

function mapPolicy(row: Record<string, unknown>): BookingPolicy {
  return {
    deposits_enabled: Boolean(pickRowField(row, "deposits_enabled") ?? pickRowField(row, "DepositsEnabled")),
    deposit_type: (pickRowField(row, "deposit_type") ?? pickRowField(row, "DepositType") ?? "percent") as
      | "percent"
      | "fixed",
    deposit_amount: Number(pickRowField(row, "deposit_amount") ?? pickRowField(row, "DepositAmount") ?? 25),
    refund_window_hours: Number(
      pickRowField(row, "refund_window_hours") ?? pickRowField(row, "RefundWindowHours") ?? 24,
    ),
    late_cancel_fee_kes: Number(
      pickRowField(row, "late_cancel_fee_kes") ?? pickRowField(row, "LateCancelFeeKES") ?? 0,
    ),
    late_cancel_hours: Number(pickRowField(row, "late_cancel_hours") ?? pickRowField(row, "LateCancelHours") ?? 24),
  };
}

function mapDeposit(row: Record<string, unknown>): BookingDepositRow {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    bookingId: String(pickRowField(row, "booking_id") ?? pickRowField(row, "BookingID") ?? ""),
    customerId: String(pickRowField(row, "customer_id") ?? pickRowField(row, "CustomerID") ?? ""),
    amountKes: Number(pickRowField(row, "amount_kes") ?? pickRowField(row, "AmountKES") ?? 0),
    status: String(pickRowField(row, "status") ?? "pending"),
    paymentRef: pickRowField(row, "payment_ref")
      ? String(pickRowField(row, "payment_ref"))
      : undefined,
    createdAt: pickRowField(row, "created_at") ? String(pickRowField(row, "created_at")) : undefined,
  };
}

export async function fetchBookingPolicy(orgId: string): Promise<BookingPolicy> {
  const res = await api.get<Record<string, unknown>>(`/organizations/${orgId}/booking-policy`);
  return mapPolicy(res);
}

export async function updateBookingPolicy(orgId: string, policy: BookingPolicy): Promise<BookingPolicy> {
  const res = await api.put<Record<string, unknown>>(`/organizations/${orgId}/booking-policy`, {
    ...policy,
  } as Record<string, unknown>);
  return mapPolicy(res);
}

export async function fetchBookingDeposits(orgId: string): Promise<BookingDepositRow[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/booking-deposits`);
  return (res.data ?? []).map(mapDeposit);
}

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}
