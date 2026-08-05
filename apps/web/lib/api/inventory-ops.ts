import { api } from "@/lib/api-client";
import { pickRowField } from "@/lib/record-fields";

export interface StockTakeLine {
  id: string;
  inventoryId: string;
  itemName: string;
  expectedQty: number;
  countedQty: number;
}

export interface StockTake {
  id: string;
  label: string;
  status: string;
  lines: StockTakeLine[];
  finalizedAt?: string;
}

export interface PurchaseOrderLine {
  id: string;
  inventoryId?: string;
  name: string;
  quantity: number;
  unitCostKes: number;
}

export interface PurchaseOrder {
  id: string;
  supplierName: string;
  status: string;
  totalKes: number;
  lines: PurchaseOrderLine[];
}

function mapStockTakeLine(row: Record<string, unknown>): StockTakeLine {
  return {
    id: String(pickRowField(row, "id") ?? ""),
    inventoryId: String(pickRowField(row, "inventory_id") ?? ""),
    itemName: String(pickRowField(row, "item_name") ?? ""),
    expectedQty: Number(pickRowField(row, "expected_qty") ?? 0),
    countedQty: Number(pickRowField(row, "counted_qty") ?? 0),
  };
}

function mapStockTake(row: Record<string, unknown>): StockTake {
  const rawLines = row.Lines ?? row.lines;
  const lines = Array.isArray(rawLines) ? rawLines.map((l) => mapStockTakeLine(l as Record<string, unknown>)) : [];
  return {
    id: String(pickRowField(row, "id") ?? ""),
    label: String(pickRowField(row, "label") ?? ""),
    status: String(pickRowField(row, "status") ?? "draft"),
    lines,
    finalizedAt: pickRowField(row, "finalized_at") ? String(pickRowField(row, "finalized_at")) : undefined,
  };
}

function mapPOLine(row: Record<string, unknown>): PurchaseOrderLine {
  const invId = pickRowField(row, "inventory_id");
  return {
    id: String(pickRowField(row, "id") ?? ""),
    inventoryId: invId ? String(invId) : undefined,
    name: String(pickRowField(row, "name") ?? ""),
    quantity: Number(pickRowField(row, "quantity") ?? 1),
    unitCostKes: Number(pickRowField(row, "unit_cost_kes") ?? 0),
  };
}

function mapPO(row: Record<string, unknown>): PurchaseOrder {
  const rawLines = row.Lines ?? row.lines;
  const lines = Array.isArray(rawLines) ? rawLines.map((l) => mapPOLine(l as Record<string, unknown>)) : [];
  return {
    id: String(pickRowField(row, "id") ?? ""),
    supplierName: String(pickRowField(row, "supplier_name") ?? ""),
    status: String(pickRowField(row, "status") ?? "draft"),
    totalKes: Number(pickRowField(row, "total_kes") ?? 0),
    lines,
  };
}

export async function fetchStockTakes(orgId: string): Promise<StockTake[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/inventory/stock-takes`);
  return (res.data ?? []).map(mapStockTake);
}

export async function createStockTake(orgId: string, label?: string): Promise<StockTake> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/inventory/stock-takes`, { label });
  return mapStockTake(row);
}

export async function updateStockTakeLines(
  orgId: string,
  takeId: string,
  lines: { inventory_id: string; counted_qty: number }[],
): Promise<StockTake> {
  const row = await api.patch<Record<string, unknown>>(`/organizations/${orgId}/inventory/stock-takes/${takeId}/lines`, {
    lines,
  });
  return mapStockTake(row);
}

export async function finalizeStockTake(orgId: string, takeId: string): Promise<StockTake> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/inventory/stock-takes/${takeId}/finalize`, {});
  return mapStockTake(row);
}

export async function fetchPurchaseOrders(orgId: string): Promise<PurchaseOrder[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/purchase-orders`);
  return (res.data ?? []).map(mapPO);
}

export async function createPurchaseOrder(
  orgId: string,
  payload: {
    supplier_name: string;
    lines: { name: string; quantity: number; unit_cost_kes: number; inventory_id?: string }[];
  },
): Promise<PurchaseOrder> {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/purchase-orders`, payload);
  return mapPO(row);
}

export async function updatePurchaseOrderStatus(orgId: string, poId: string, status: string): Promise<PurchaseOrder> {
  const row = await api.patch<Record<string, unknown>>(`/organizations/${orgId}/purchase-orders/${poId}/status`, { status });
  return mapPO(row);
}
