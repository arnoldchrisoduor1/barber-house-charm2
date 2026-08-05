import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

export interface PosTabItem {
  id: string;
  name: string;
  itemType: string;
  unitPriceKes: number;
  quantity: number;
}

export interface PosTab {
  id: string;
  label: string;
  status: string;
  customerId?: string;
  items: PosTabItem[];
  createdAt?: string;
}

function mapTabItem(row: Record<string, unknown>): PosTabItem {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    name: String(pickRowField(row, "name") ?? ""),
    itemType: String(pickRowField(row, "item_type") ?? "custom"),
    unitPriceKes: Number(pickRowField(row, "unit_price_kes") ?? 0),
    quantity: Number(pickRowField(row, "quantity") ?? 1),
  };
}

function mapTab(row: Record<string, unknown>): PosTab {
  const rawItems = row.Items ?? row.items;
  const items = Array.isArray(rawItems) ? rawItems.map((i) => mapTabItem(i as Record<string, unknown>)) : [];
  const customerId = pickRowField(row, "customer_id");
  return {
    id: String(pickRowField(row, "id") ?? ""),
    label: String(pickRowField(row, "label") ?? ""),
    status: String(pickRowField(row, "status") ?? "open"),
    customerId: customerId ? String(customerId) : undefined,
    items,
    createdAt: pickRowField(row, "created_at") ? String(pickRowField(row, "created_at")) : undefined,
  };
}

export async function verifyManagerPin(orgId: string, pin: string): Promise<boolean> {
  try {
    await api.post(`/organizations/${orgId}/pos/verify-pin`, { pin });
    return true;
  } catch {
    return false;
  }
}

export async function fetchPosTabs(orgId: string, status = "open"): Promise<PosTab[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/pos/tabs`, {
    params: { status },
  });
  return (res.data ?? []).map(mapTab);
}

export async function openPosTab(orgId: string, label: string, customerId?: string): Promise<PosTab> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/pos/tabs`, {
    label,
    customer_id: customerId ?? null,
  });
  return mapTab(row);
}

export async function addPosTabItem(
  orgId: string,
  tabId: string,
  payload: { name: string; unit_price_kes: number; quantity?: number },
): Promise<PosTabItem> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/pos/tabs/${tabId}/items`, {
    name: payload.name,
    unit_price_kes: payload.unit_price_kes,
    quantity: payload.quantity ?? 1,
    item_type: "custom",
  });
  return mapTabItem(row);
}

export async function closePosTab(orgId: string, tabId: string): Promise<PosTab> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/pos/tabs/${tabId}/close`, {});
  return mapTab(row);
}

export function tabTotal(tab: PosTab): number {
  return tab.items.reduce((sum, item) => sum + item.unitPriceKes * item.quantity, 0);
}
