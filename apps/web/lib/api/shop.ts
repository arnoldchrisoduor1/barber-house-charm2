import { api } from "@/lib/api-client";

export type ShopOrderItem = {
  id: string;
  product_id?: string;
  product_name: string;
  sku: string;
  unit_price_kes: number;
  quantity: number;
  line_total_kes: number;
};

export type ShopOrder = {
  id: string;
  order_number: string;
  status: string;
  fulfillment_type: string;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address: string;
  notes: string;
  subtotal_kes: number;
  total_kes: number;
  stock_decremented: boolean;
  items?: ShopOrderItem[];
};

export type ShopProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  price_kes: number;
  quantity: number;
  image_url?: string;
};

function pick(raw: Record<string, unknown>, snake: string, pascal: string) {
  return raw[snake] ?? raw[pascal];
}

function mapItem(raw: Record<string, unknown>): ShopOrderItem {
  const pid = pick(raw, "product_id", "ProductID");
  return {
    id: String(pick(raw, "id", "ID") ?? ""),
    product_id: pid ? String(pid) : undefined,
    product_name: String(pick(raw, "product_name", "ProductName") ?? ""),
    sku: String(pick(raw, "sku", "SKU") ?? ""),
    unit_price_kes: Number(pick(raw, "unit_price_kes", "UnitPriceKES") ?? 0),
    quantity: Number(pick(raw, "quantity", "Quantity") ?? 0),
    line_total_kes: Number(pick(raw, "line_total_kes", "LineTotalKES") ?? 0),
  };
}

function mapOrder(raw: Record<string, unknown>): ShopOrder {
  const itemsRaw = (pick(raw, "items", "Items") as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: String(pick(raw, "id", "ID") ?? ""),
    order_number: String(pick(raw, "order_number", "OrderNumber") ?? ""),
    status: String(pick(raw, "status", "Status") ?? "pending"),
    fulfillment_type: String(pick(raw, "fulfillment_type", "FulfillmentType") ?? "pickup"),
    payment_method: String(pick(raw, "payment_method", "PaymentMethod") ?? "pay_on_pickup"),
    customer_name: String(pick(raw, "customer_name", "CustomerName") ?? ""),
    customer_phone: String(pick(raw, "customer_phone", "CustomerPhone") ?? ""),
    customer_email: String(pick(raw, "customer_email", "CustomerEmail") ?? ""),
    delivery_address: String(pick(raw, "delivery_address", "DeliveryAddress") ?? ""),
    notes: String(pick(raw, "notes", "Notes") ?? ""),
    subtotal_kes: Number(pick(raw, "subtotal_kes", "SubtotalKES") ?? 0),
    total_kes: Number(pick(raw, "total_kes", "TotalKES") ?? 0),
    stock_decremented: Boolean(pick(raw, "stock_decremented", "StockDecremented") ?? false),
    items: itemsRaw.map(mapItem),
  };
}

function mapProduct(raw: Record<string, unknown>): ShopProduct {
  return {
    id: String(pick(raw, "id", "ID") ?? ""),
    sku: String(pick(raw, "sku", "SKU") ?? ""),
    name: String(pick(raw, "name", "Name") ?? ""),
    category: String(pick(raw, "category", "Category") ?? ""),
    description: String(pick(raw, "description", "Description") ?? ""),
    price_kes: Number(pick(raw, "price_kes", "PriceKES") ?? pick(raw, "price_kes", "price_kes") ?? 0),
    quantity: Number(pick(raw, "quantity", "Quantity") ?? 0),
    image_url: pick(raw, "image_url", "ImageURL") ? String(pick(raw, "image_url", "ImageURL")) : undefined,
  };
}

export async function fetchShopOrders(orgId: string, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await api.get<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/shop-orders${qs}`);
  return (res.data ?? []).map(mapOrder);
}

export async function createShopOrder(
  orgId: string,
  body: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    fulfillment_type?: string;
    payment_method?: string;
    delivery_address?: string;
    notes?: string;
    lines: Array<{ product_id: string; quantity: number }>;
  },
) {
  const row = await api.post<Record<string, unknown>>(`/organizations/${orgId}/shop-orders`, body);
  return mapOrder(row);
}

export async function advanceShopOrder(orgId: string, id: string, status?: string) {
  const row = await api.post<Record<string, unknown>>(
    `/organizations/${orgId}/shop-orders/${id}/advance`,
    status ? { status } : {},
  );
  return mapOrder(row);
}

export async function fetchShopDashboard(orgId: string) {
  return api.get<{
    sales_today_kes: number;
    avg_basket_kes: number;
    pending_orders: number;
    low_stock_count: number;
    stock_value_kes: number;
    fulfilled_today: number;
    top_sellers: Array<{ product_name: string; qty: number }>;
  }>(`/organizations/${orgId}/shop-orders/dashboard`);
}

export async function fetchPublicShopCatalog(orgSlug: string, category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await api.get<{
    org: { id: string; name: string; slug: string; businessType: string };
    data: Record<string, unknown>[];
  }>(`/organizations/public/${orgSlug}/shop/catalog${qs}`);
  return {
    org: res.org,
    products: (res.data ?? []).map(mapProduct),
  };
}

export async function fetchPublicShopProduct(orgSlug: string, id: string) {
  const row = await api.get<Record<string, unknown>>(`/organizations/public/${orgSlug}/shop/products/${id}`);
  return mapProduct(row);
}

export async function publicShopCheckout(
  orgSlug: string,
  body: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    fulfillment_type: string;
    payment_method?: string;
    delivery_address?: string;
    notes?: string;
    lines: Array<{ product_id: string; quantity: number }>;
  },
) {
  const row = await api.post<Record<string, unknown>>(`/organizations/public/${orgSlug}/shop/checkout`, body);
  return mapOrder(row);
}

export async function fetchRetailProductQty(orgId: string, productId: string) {
  const res = await api.get<{ data?: Record<string, unknown>[]; quantity?: number } | Record<string, unknown>>(
    `/organizations/${orgId}/retail-products`,
  );
  const list = Array.isArray((res as { data?: unknown[] }).data)
    ? ((res as { data: Record<string, unknown>[] }).data ?? [])
    : [];
  const row = list.find((p) => String(p.id ?? p.ID) === productId);
  return row ? Number(row.quantity ?? row.Quantity ?? 0) : null;
}
