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
  daysWorked?: number;
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
    daysWorked: Number(pickRowField(row, "days_worked") ?? 0),
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

export async function uploadExpenseReceipt(orgId: string, id: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`/api/v1/organizations/${orgId}/finance/expenses/${id}/receipt`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!response.ok) {
    let detail = "Receipt upload failed";
    try {
      const body = (await response.json()) as { detail?: string; title?: string };
      detail = body.detail ?? body.title ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return mapExpense(await response.json());
}

export interface PnLPoint {
  month: string;
  revenueKes: number;
  expensesKes: number;
  commissionKes: number;
  netKes: number;
}

export async function fetchPnL(orgId: string, params?: Record<string, string>) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    `/organizations/${orgId}/analytics/pnl`,
    { params },
  );
  return (res.data ?? []).map(
    (row): PnLPoint => ({
      month: String(pickRowField(row, "month") ?? ""),
      revenueKes: Number(pickRowField(row, "revenue_kes") ?? 0),
      expensesKes: Number(pickRowField(row, "expenses_kes") ?? 0),
      commissionKes: Number(pickRowField(row, "commission_kes") ?? 0),
      netKes: Number(pickRowField(row, "net_kes") ?? 0),
    }),
  );
}

export function expensesExportCsvUrl(orgId: string, params?: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return `/api/v1/organizations/${orgId}/finance/expenses/export.csv${search ? `?${search}` : ""}`;
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

export interface CommissionLineRow {
  id: string;
  staffId: string;
  transactionId?: string;
  kind: string;
  baseKes: number;
  ratePct: number;
  amountKes: number;
  note?: string;
  createdAt: string;
}

function mapCommissionLine(row: Record<string, unknown>): CommissionLineRow {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    staffId: String(pickRowField(row, "staff_id") ?? ""),
    transactionId: pickRowField(row, "transaction_id")
      ? String(pickRowField(row, "transaction_id"))
      : undefined,
    kind: String(pickRowField(row, "kind") ?? "service"),
    baseKes: Number(pickRowField(row, "base_kes") ?? 0),
    ratePct: Number(pickRowField(row, "rate_pct") ?? 0),
    amountKes: Number(pickRowField(row, "amount_kes") ?? 0),
    note: pickRowField(row, "note") ? String(pickRowField(row, "note")) : undefined,
    createdAt: String(pickRowField(row, "created_at") ?? ""),
  };
}

export async function fetchCommissionLines(orgId: string, period: "month" | "quarter" = "month") {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    `/organizations/${orgId}/commissions/lines`,
    { params: { period } },
  );
  return (res.data ?? []).map(mapCommissionLine);
}

export async function reverseCommissionLine(orgId: string, lineId: string, reason: string) {
  const row = await api.post<Record<string, unknown>>(
    `/organizations/${orgId}/commissions/lines/${lineId}/reverse`,
    { reason },
  );
  return mapCommissionLine(row);
}

export async function confirmPayout(orgId: string, payoutId: string) {
  return api.post<Record<string, unknown>>(`/organizations/${orgId}/payouts/${payoutId}/confirm`);
}

export async function fetchPayslips(orgId: string) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/payroll/payslips`);
  return (res.data ?? []).map(mapPayslip);
}

export function payslipsExportCsvUrl(orgId: string) {
  return `/api/v1/organizations/${orgId}/payroll/payslips/export.csv`;
}

export async function chargeSeatRent(orgId: string, seatId: string, periodMonth?: string) {
  const body = periodMonth ? { period_month: periodMonth } : {};
  return api.post<Record<string, unknown>>(
    `/organizations/${orgId}/seat-rentals/${seatId}/charge`,
    body,
  );
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
    transaction_id?: string;
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

export interface ReconciliationRunRow {
  id: string;
  branchId?: string;
  runDate: string;
  expectedCashKes: number;
  expectedCardKes: number;
  countedCashKes?: number;
  countedCardKes?: number;
  varianceKes?: number;
  status: string;
  notes?: string;
  closedAt?: string;
}

function mapReconciliationRun(row: Record<string, unknown>): ReconciliationRunRow {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    branchId: pickRowField(row, "branch_id") ? String(pickRowField(row, "branch_id")) : undefined,
    runDate: String(pickRowField(row, "run_date") ?? ""),
    expectedCashKes: Number(pickRowField(row, "expected_cash_kes") ?? 0),
    expectedCardKes: Number(pickRowField(row, "expected_card_kes") ?? 0),
    countedCashKes:
      pickRowField(row, "counted_cash_kes") !== undefined
        ? Number(pickRowField(row, "counted_cash_kes"))
        : undefined,
    countedCardKes:
      pickRowField(row, "counted_card_kes") !== undefined
        ? Number(pickRowField(row, "counted_card_kes"))
        : undefined,
    varianceKes:
      pickRowField(row, "variance_kes") !== undefined && pickRowField(row, "variance_kes") !== null
        ? Number(pickRowField(row, "variance_kes"))
        : undefined,
    status: String(pickRowField(row, "status") ?? "open"),
    notes: pickRowField(row, "notes") ? String(pickRowField(row, "notes")) : undefined,
    closedAt: pickRowField(row, "closed_at") ? String(pickRowField(row, "closed_at")) : undefined,
  };
}

export async function fetchReconciliationToday(orgId: string, params?: Record<string, string>) {
  const row = await api.get<Record<string, unknown>>(`/organizations/${orgId}/reconciliation/today`, {
    params,
  });
  return mapReconciliationRun(row);
}

export async function fetchReconciliationRuns(orgId: string, params?: Record<string, string>) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    `/organizations/${orgId}/reconciliation`,
    { params },
  );
  return (res.data ?? []).map(mapReconciliationRun);
}

export async function closeReconciliation(
  orgId: string,
  id: string,
  body: { counted_cash_kes: number; counted_card_kes: number; notes?: string },
) {
  const row = await api.post<Record<string, unknown>>(
    `/organizations/${orgId}/reconciliation/${id}/close`,
    body,
  );
  return mapReconciliationRun(row);
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
