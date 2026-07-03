import type { PosCartLine } from "@/lib/api/pos";

const STORAGE_KEY = "haus-held-sales";

export interface HeldSale {
  id: string;
  label: string;
  heldAt: string;
  items: PosCartLine[];
  customerId: string;
  activeBookingId?: string | null;
}

function readAll(orgId: string): HeldSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, HeldSale[]>;
    return parsed[orgId] ?? [];
  } catch {
    return [];
  }
}

function writeAll(orgId: string, sales: HeldSale[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, HeldSale[]>) : {};
    parsed[orgId] = sales;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore quota / parse errors */
  }
}

export function listHeldSales(orgId: string): HeldSale[] {
  return readAll(orgId);
}

export function saveHeldSale(orgId: string, sale: HeldSale) {
  const sales = readAll(orgId);
  writeAll(orgId, [sale, ...sales.filter((s) => s.id !== sale.id)]);
}

export function removeHeldSale(orgId: string, id: string) {
  writeAll(
    orgId,
    readAll(orgId).filter((s) => s.id !== id),
  );
}

export function createHeldSale(
  orgId: string,
  payload: Omit<HeldSale, "id" | "heldAt"> & { label?: string },
): HeldSale {
  const sale: HeldSale = {
    id: `held-${Date.now()}`,
    label: payload.label ?? `Sale ${new Date().toLocaleTimeString()}`,
    heldAt: new Date().toISOString(),
    items: payload.items,
    customerId: payload.customerId,
    activeBookingId: payload.activeBookingId,
  };
  saveHeldSale(orgId, sale);
  return sale;
}
