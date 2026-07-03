import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

export function formatKes(amount: number): string {
  return `KES ${Number(amount ?? 0).toLocaleString()}`;
}

export interface RevenueChartPoint {
  date: string;
  revenueKes: number;
  expensesKes: number;
}

export interface ExpenseRow {
  id: string;
  amountKes: number;
  category: string;
  description: string;
  receiptUrl?: string;
  expenseDate: string;
  branchId?: string;
}

export interface CommissionRuleRow {
  id: string;
  staffId: string;
  serviceId?: string;
  ratePct: number;
}

export interface CommissionSummaryRow {
  staffId: string;
  displayName: string;
  revenueKes: number;
  commissionKes: number;
  ownerShareKes: number;
}

export interface PayslipRow {
  id: string;
  staffId: string;
  periodStart: string;
  periodEnd: string;
  grossKes: number;
  commissionKes: number;
  deductionsKes: number;
  netKes: number;
  status: string;
}

export interface TipRow {
  id: string;
  staffId: string;
  amountKes: number;
  status: string;
  paymentMethod: string;
  tipDate: string;
  notes: string;
}

export interface PosShiftRow {
  id: string;
  staffId: string;
  branchId?: string;
  openingFloatKes: number;
  closingCountKes?: number;
  varianceKes?: number;
  openedAt: string;
  closedAt?: string;
}

function mapExpense(row: Record<string, unknown>): ExpenseRow {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    amountKes: Number(pickRowField(row, "amount_kes") ?? 0),
    category: String(pickRowField(row, "category") ?? "general"),
    description: String(pickRowField(row, "description") ?? ""),
    receiptUrl: pickRowField(row, "receipt_url")
      ? String(pickRowField(row, "receipt_url"))
      : undefined,
    expenseDate: String(pickRowField(row, "expense_date") ?? ""),
    branchId: pickRowField(row, "branch_id") ? String(pickRowField(row, "branch_id")) : undefined,
  };
}

function mapCommissionRule(row: Record<string, unknown>): CommissionRuleRow {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    staffId: String(pickRowField(row, "staff_id") ?? ""),
    serviceId: pickRowField(row, "service_id") ? String(pickRowField(row, "service_id")) : undefined,
    ratePct: Number(pickRowField(row, "rate_pct") ?? 0),
  };
}

function mapCommissionSummary(row: Record<string, unknown>): CommissionSummaryRow {
  return {
    staffId: String(pickRowField(row, "staff_id") ?? ""),
    displayName: String(pickRowField(row, "display_name") ?? "Staff"),
    revenueKes: Number(pickRowField(row, "revenue_kes") ?? 0),
    commissionKes: Number(pickRowField(row, "commission_kes") ?? 0),
    ownerShareKes: Number(pickRowField(row, "owner_share_kes") ?? 0),
  };
}

function mapPayslip(row: Record<string, unknown>): PayslipRow {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    staffId: String(pickRowField(row, "staff_id") ?? ""),
    periodStart: String(pickRowField(row, "period_start") ?? ""),
    periodEnd: String(pickRowField(row, "period_end") ?? ""),
    grossKes: Number(pickRowField(row, "gross_kes") ?? 0),
    commissionKes: Number(pickRowField(row, "commission_kes") ?? 0),
    deductionsKes: Number(pickRowField(row, "deductions_kes") ?? 0),
    netKes: Number(pickRowField(row, "net_kes") ?? 0),
    status: String(pickRowField(row, "status") ?? "draft"),
  };
}

function mapTip(row: Record<string, unknown>): TipRow {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    staffId: String(pickRowField(row, "staff_id") ?? ""),
    amountKes: Number(pickRowField(row, "amount_kes") ?? 0),
    status: String(pickRowField(row, "status") ?? "pending"),
    paymentMethod: String(pickRowField(row, "payment_method") ?? ""),
    tipDate: String(pickRowField(row, "tip_date") ?? ""),
    notes: String(pickRowField(row, "notes") ?? ""),
  };
}

function mapShift(row: Record<string, unknown>): PosShiftRow {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    staffId: String(pickRowField(row, "staff_id") ?? ""),
    branchId: pickRowField(row, "branch_id") ? String(pickRowField(row, "branch_id")) : undefined,
    openingFloatKes: Number(pickRowField(row, "opening_float_kes") ?? 0),
    closingCountKes:
      pickRowField(row, "closing_count_kes") !== undefined
        ? Number(pickRowField(row, "closing_count_kes"))
        : undefined,
    varianceKes:
      pickRowField(row, "variance_kes") !== undefined
        ? Number(pickRowField(row, "variance_kes"))
        : undefined,
    openedAt: String(pickRowField(row, "opened_at") ?? ""),
    closedAt: pickRowField(row, "closed_at") ? String(pickRowField(row, "closed_at")) : undefined,
  };
}

export async function fetchExpenses(orgId: string, params?: Record<string, string>) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    `/organizations/${orgId}/finance/expenses`,
    { params },
  );
  return (res.data ?? []).map(mapExpense);
}

export async function createExpense(
  orgId: string,
  body: {
    amount_kes: number;
    category: string;
    description?: string;
    receipt_url?: string;
    expense_date: string;
    branch_id?: string;
  },
) {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/finance/expenses`, body);
  return mapExpense(row);
}

export async function updateExpense(
  orgId: string,
  id: string,
  body: {
    amount_kes: number;
    category: string;
    description?: string;
    receipt_url?: string;
    expense_date: string;
    branch_id?: string;
  },
) {
  const row = await api.put<Record<string, unknown>>(`/organizations/${orgId}/finance/expenses/${id}`, body);
  return mapExpense(row);
}

export async function deleteExpense(orgId: string, id: string) {
  await api.delete(`/organizations/${orgId}/finance/expenses/${id}`);
}

export async function fetchRevenueChart(orgId: string, params?: Record<string, string>) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    `/organizations/${orgId}/analytics/revenue-chart`,
    { params },
  );
  return (res.data ?? []).map(
    (row): RevenueChartPoint => ({
      date: String(pickRowField(row, "date") ?? ""),
      revenueKes: Number(pickRowField(row, "revenue_kes") ?? 0),
      expensesKes: Number(pickRowField(row, "expenses_kes") ?? 0),
    }),
  );
}

export async function fetchCommissionRules(orgId: string) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    `/organizations/${orgId}/commissions/rules`,
  );
  return (res.data ?? []).map(mapCommissionRule);
}

export async function fetchCommissionSummary(orgId: string, period: "month" | "quarter" = "month") {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    `/organizations/${orgId}/commissions/summary`,
    { params: { period } },
  );
  return (res.data ?? []).map(mapCommissionSummary);
}

export async function fetchPayslips(orgId: string) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/payroll/payslips`);
  return (res.data ?? []).map(mapPayslip);
}

export async function createPayslip(
  orgId: string,
  body: {
    staff_id: string;
    period_start: string;
    period_end: string;
    gross_kes: number;
    commission_kes: number;
    deductions_kes: number;
  },
) {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/payroll/payslips`, body);
  return mapPayslip(row);
}

export async function fetchTips(orgId: string, params?: Record<string, string>) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/tips`, { params });
  return (res.data ?? []).map(mapTip);
}

export async function createTip(
  orgId: string,
  body: {
    staff_id: string;
    amount_kes: number;
    status?: string;
    payment_method?: string;
    tip_date?: string;
    notes?: string;
  },
) {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/tips`, body);
  return mapTip(row);
}

export async function updateTip(
  orgId: string,
  id: string,
  body: { staff_id: string; amount_kes: number; status?: string; notes?: string },
) {
  const row = await api.put<Record<string, unknown>>(`/organizations/${orgId}/tips/${id}`, body);
  return mapTip(row);
}

export async function deleteTip(orgId: string, id: string) {
  await api.delete(`/organizations/${orgId}/tips/${id}`);
}

export async function fetchActiveShift(orgId: string, staffId: string) {
  const res = await api.get<Record<string, unknown> | { data: null }>(
    `/organizations/${orgId}/pos/shifts/active`,
    { params: { staff_id: staffId } },
  );
  if ("data" in res && res.data === null) return null;
  if (pickRowField(res as Record<string, unknown>, "id")) {
    return mapShift(res as Record<string, unknown>);
  }
  return null;
}

export async function openShift(
  orgId: string,
  body: { staff_id: string; opening_float_kes: number; branch_id?: string },
) {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/pos/shifts/open`, body);
  return mapShift(row);
}

export async function closeShift(orgId: string, shiftId: string, closingCountKes: number) {
  const row = await api.post<Record<string, unknown>>(
    `/organizations/${orgId}/pos/shifts/${shiftId}/close`,
    { closing_count_kes: closingCountKes },
  );
  return mapShift(row);
}
