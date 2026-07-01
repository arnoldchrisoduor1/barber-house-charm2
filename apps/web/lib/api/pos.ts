import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

export type PosCatalogType = "service" | "product";

export interface PosCatalogItem {
  id: string;
  type: PosCatalogType;
  name: string;
  category: string;
  priceKes: number;
  quantity?: number;
}

export interface PosCartLine {
  id: string;
  type: PosCatalogType;
  name: string;
  unitPriceKes: number;
  quantity: number;
}

export interface PosTransactionItem {
  id: string;
  itemType: string;
  name: string;
  unitPriceKes: number;
  quantity: number;
  lineTotalKes: number;
}

export interface PosTransaction {
  id: string;
  amountKes: number;
  paymentMethod: string;
  paymentStatus: string;
  reference?: string;
  createdAt?: string;
  customerId?: string;
  items?: PosTransactionItem[];
}

export interface PosCustomer {
  id: string;
  fullName: string;
  phone?: string;
}

function mapCatalogRow(row: Record<string, unknown>, type: PosCatalogType): PosCatalogItem {
  const quantity = pickRowField(row, "quantity");
  return {
    id: String(pickRowField(row, "id") ?? ""),
    type,
    name: String(pickRowField(row, "name") ?? ""),
    category: String(pickRowField(row, "category") ?? ""),
    priceKes: Number(pickRowField(row, "price_kes") ?? 0),
    quantity: quantity === undefined ? undefined : Number(quantity),
  };
}

function mapCustomerRow(row: Record<string, unknown>): PosCustomer {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    fullName: String(pickRowField(row, "full_name") ?? ""),
    phone: pickRowField(row, "phone") ? String(pickRowField(row, "phone")) : undefined,
  };
}

function mapTransactionRow(row: Record<string, unknown>): PosTransaction {
  const rawItems = row.Items ?? row.items;
  const items = Array.isArray(rawItems)
    ? rawItems.map((item) => {
        const rowItem = item as Record<string, unknown>;
        return {
          id: String(pickRowField(rowItem, "id") ?? ""),
          itemType: String(pickRowField(rowItem, "item_type") ?? ""),
          name: String(pickRowField(rowItem, "name") ?? ""),
          unitPriceKes: Number(pickRowField(rowItem, "unit_price_kes") ?? 0),
          quantity: Number(pickRowField(rowItem, "quantity") ?? 0),
          lineTotalKes: Number(pickRowField(rowItem, "line_total_kes") ?? 0),
        };
      })
    : [];

  return {
    id: String(pickRowField(row, "id") ?? ""),
    amountKes: Number(pickRowField(row, "amount_kes") ?? 0),
    paymentMethod: String(pickRowField(row, "payment_method") ?? ""),
    paymentStatus: String(pickRowField(row, "payment_status") ?? ""),
    reference: pickRowField(row, "reference") ? String(pickRowField(row, "reference")) : undefined,
    createdAt: pickRowField(row, "created_at") ? String(pickRowField(row, "created_at")) : undefined,
    customerId: pickRowField(row, "customer_id") ? String(pickRowField(row, "customer_id")) : undefined,
    items,
  };
}

export async function fetchPosCatalog(orgId: string, params?: Record<string, string>) {
  const [servicesRes, productsRes] = await Promise.all([
    api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/services`, { params }),
    api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/retail-products`, { params }),
  ]);

  const services = (servicesRes.data ?? [])
    .filter((row) => pickRowField(row, "is_active") !== false)
    .map((row) => mapCatalogRow(row, "service"));

  const products = (productsRes.data ?? [])
    .filter((row) => pickRowField(row, "is_active") !== false)
    .map((row) => mapCatalogRow(row, "product"));

  return { services, products };
}

export async function fetchPosCustomers(orgId: string) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/customers`);
  return (res.data ?? []).map(mapCustomerRow);
}

export async function createPosCustomer(
  orgId: string,
  payload: { fullName: string; phone: string; email?: string },
) {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/customers`, {
    full_name: payload.fullName,
    phone: payload.phone,
    email: payload.email ?? "",
  });
  return mapCustomerRow(row);
}

export async function fetchPosTransactions(orgId: string, params?: Record<string, string>) {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/transactions`, {
    params,
  });
  return (res.data ?? []).map(mapTransactionRow);
}

export async function checkoutPos(
  orgId: string,
  payload: {
    customerId?: string;
    branchId?: string;
    bookingId?: string;
    paymentMethod: "cash" | "mpesa" | "card";
    reference?: string;
    cashTendered?: number;
    lines: Array<{ itemType: PosCatalogType; itemId: string; quantity: number }>;
  },
) {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/transactions/checkout`, payload);
  return mapTransactionRow(row);
}

export function cartTotal(lines: PosCartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPriceKes * line.quantity, 0);
}

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}
