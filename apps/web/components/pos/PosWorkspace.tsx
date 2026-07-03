"use client";

import {
  Minus,
  Pause,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
  CalendarClock,
  LockKeyhole,
  Percent,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerDialog } from "@/components/pos/CustomerDialog";
import { HeldSalesDialog } from "@/components/pos/HeldSalesDialog";
import { ManagerPinDialog } from "@/components/pos/ManagerPinDialog";
import { PaymentDialog, type PayMethod } from "@/components/pos/PaymentDialog";
import { ReceiptDialog } from "@/components/pos/ReceiptDialog";
import { ShiftDialog } from "@/components/pos/ShiftDialog";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useEntityList } from "@/lib/api/crud";
import {
  closeShift,
  fetchActiveShift,
  openShift,
  type PosShiftRow,
} from "@/lib/api/finance";
import {
  cartTotal,
  checkoutPos,
  createPosCustomer,
  fetchPosCatalog,
  fetchPosCustomers,
  fetchPosTransactions,
  formatKes,
  type PosCartLine,
  type PosCatalogItem,
  type PosCustomer,
  type PosTransaction,
} from "@/lib/api/pos";
import { fetchBookings, fetchBookingServices } from "@/lib/api/booking";
import {
  createHeldSale,
  listHeldSales,
  removeHeldSale,
  type HeldSale,
} from "@/lib/held-sales";
import { pickRowField } from "@/lib/record-fields";

type CatalogTab = "services" | "products" | "packages";

function resolveStaffId(me: { staffId?: string | null } | undefined, staffRows: Record<string, unknown>[]) {
  if (me?.staffId) return me.staffId;
  const first = staffRows[0];
  return first ? String(pickRowField(first, "id") ?? "") : "";
}

export function PosWorkspace() {
  const { me, activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const { apiParams, activeBranchId } = useBranchFilter();
  const queryClient = useQueryClient();
  const { data: staffRows = [], isLoading: staffLoading } = useEntityList<Record<string, unknown>>(orgId, "staff");

  const posStaffId = resolveStaffId(me as { staffId?: string | null }, staffRows);

  const [tab, setTab] = useState<CatalogTab>("services");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<PosTransaction | null>(null);
  const [lastPayment, setLastPayment] = useState<{
    method: PayMethod;
    reference?: string;
    cashTendered?: number;
    change?: number;
  } | null>(null);
  const [receiptCart, setReceiptCart] = useState<PosCartLine[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [shiftDialogMode, setShiftDialogMode] = useState<"open" | "close" | null>(null);
  const [heldSalesOpen, setHeldSalesOpen] = useState(false);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const shiftQuery = useQuery({
    queryKey: ["pos-active-shift", orgId, posStaffId],
    queryFn: () => fetchActiveShift(orgId, posStaffId),
    enabled: !!orgId && !!posStaffId,
  });

  const activeShift = shiftQuery.data ?? null;
  const shiftRequired = !!posStaffId && !shiftQuery.isLoading && !activeShift;

  const catalogQuery = useQuery({
    queryKey: ["pos-catalog", orgId, apiParams],
    queryFn: () => fetchPosCatalog(orgId, apiParams),
    enabled: !!orgId && !!activeShift,
  });

  const customersQuery = useQuery({
    queryKey: ["pos-customers", orgId],
    queryFn: () => fetchPosCustomers(orgId),
    enabled: !!orgId && !!activeShift,
  });

  const transactionsQuery = useQuery({
    queryKey: ["pos-transactions", orgId, apiParams],
    queryFn: () => fetchPosTransactions(orgId, apiParams),
    enabled: !!orgId && !!activeShift,
  });

  const scheduledBookingsQuery = useQuery({
    queryKey: ["pos-scheduled-bookings", orgId, apiParams],
    queryFn: () =>
      fetchBookings(orgId, { status: "scheduled", branchId: apiParams.branch_id }),
    enabled: !!orgId && !!activeShift,
  });

  useEffect(() => {
    if (!orgId) return;
    setHeldSales(listHeldSales(orgId));
  }, [orgId, heldSalesOpen]);

  const customers = customersQuery.data ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const catalogItems = useMemo(() => {
    const data = catalogQuery.data;
    const items =
      tab === "services"
        ? (data?.services ?? [])
        : tab === "products"
          ? (data?.products ?? [])
          : (data?.packages ?? []);
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
    );
  }, [catalogQuery.data, search, tab]);

  const subtotal = cartTotal(cart);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const total = subtotal - discountAmount;

  const expectedCashInTill = useMemo(() => {
    if (!activeShift) return 0;
    const cashSales = (transactionsQuery.data ?? [])
      .filter((tx) => tx.paymentMethod === "cash" && tx.paymentStatus === "completed")
      .reduce((sum, tx) => sum + tx.amountKes, 0);
    return activeShift.openingFloatKes + cashSales;
  }, [activeShift, transactionsQuery.data]);

  const addToCart = useCallback((item: PosCatalogItem) => {
    if (item.type === "product" && (item.quantity ?? 0) <= 0) return;
    setCart((prev) => {
      const existing = prev.find((line) => line.id === item.id && line.type === item.type);
      if (existing) {
        return prev.map((line) =>
          line.id === item.id && line.type === item.type
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          type: item.type,
          name: item.name,
          unitPriceKes: item.priceKes,
          quantity: 1,
        },
      ];
    });
    setDiscountPercent(0);
  }, []);

  const updateQty = (line: PosCartLine, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === line.id && item.type === line.type
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeLine = (line: PosCartLine) => {
    setCart((prev) => prev.filter((item) => !(item.id === line.id && item.type === line.type)));
    setDiscountPercent(0);
  };

  const handleCreateCustomer = async (payload: { fullName: string; phone: string }) => {
    const created = await createPosCustomer(orgId, payload);
    await queryClient.refetchQueries({ queryKey: ["pos-customers", orgId] });
    setCustomerId(created.id);
  };

  const loadBookingToCart = async (bookingId: string, customerIdForBooking: string) => {
    setCheckoutError(null);
    const [serviceLines, catalog] = await Promise.all([
      fetchBookingServices(orgId, bookingId),
      catalogQuery.data ? Promise.resolve(catalogQuery.data) : fetchPosCatalog(orgId, apiParams),
    ]);
    const cartLines: PosCartLine[] = [];
    for (const line of serviceLines) {
      const match = catalog.services.find(
        (svc) => svc.name.toLowerCase() === line.serviceName.toLowerCase(),
      );
      if (!match) {
        setCheckoutError(`Service "${line.serviceName}" is not in the active catalog.`);
        return;
      }
      cartLines.push({
        id: match.id,
        type: "service",
        name: match.name,
        unitPriceKes: match.priceKes,
        quantity: 1,
      });
    }
    if (cartLines.length === 0) {
      setCheckoutError("This booking has no billable services.");
      return;
    }
    setCart(cartLines);
    setCustomerId(customerIdForBooking);
    setActiveBookingId(bookingId);
    setTab("services");
  };

  const holdCurrentSale = () => {
    if (cart.length === 0) return;
    const label =
      selectedCustomer && selectedCustomer.id !== "walk-in"
        ? selectedCustomer.fullName
        : `Walk-in · ${cart.length} items`;
    createHeldSale(orgId, {
      label,
      items: cart,
      customerId,
      activeBookingId,
    });
    setCart([]);
    setActiveBookingId(null);
    setCustomerId("walk-in");
    setDiscountPercent(0);
    setHeldSales(listHeldSales(orgId));
    toast.success("Sale held");
  };

  const resumeHeldSale = (id: string) => {
    const sale = heldSales.find((s) => s.id === id);
    if (!sale) return;
    setCart(sale.items);
    setCustomerId(sale.customerId);
    setActiveBookingId(sale.activeBookingId ?? null);
    removeHeldSale(orgId, id);
    setHeldSales(listHeldSales(orgId));
    toast.success("Sale resumed");
  };

  const handleOpenShift = async (floatKes: number) => {
    await openShift(orgId, {
      staff_id: posStaffId,
      opening_float_kes: floatKes,
      branch_id: activeBranchId ?? undefined,
    });
    setShiftDialogMode(null);
    await queryClient.invalidateQueries({ queryKey: ["pos-active-shift", orgId, posStaffId] });
    toast.success("Shift opened");
  };

  const handleCloseShift = async (countedKes: number) => {
    if (!activeShift) return;
    await closeShift(orgId, activeShift.id, countedKes);
    setShiftDialogMode(null);
    await queryClient.invalidateQueries({ queryKey: ["pos-active-shift", orgId, posStaffId] });
    toast.success("Shift closed");
  };

  const handleCheckout = async (payment: {
    method: PayMethod;
    reference?: string;
    cashTendered?: number;
    change?: number;
  }) => {
    setCheckoutError(null);
    if (cart.some((line) => line.type === "package")) {
      setCheckoutError("Package checkout is not supported yet — remove package items first.");
      throw new Error("Package checkout not supported");
    }
    try {
      const tx = await checkoutPos(orgId, {
        customerId: customerId === "walk-in" ? undefined : customerId,
        branchId: activeBranchId ?? undefined,
        bookingId: activeBookingId ?? undefined,
        paymentMethod: payment.method,
        reference: payment.reference,
        cashTendered: payment.cashTendered,
        lines: cart.map((line) => ({
          itemType: line.type as "service" | "product",
          itemId: line.id,
          quantity: line.quantity,
        })),
      });
      setReceiptCart([...cart]);
      setLastReceipt(tx);
      setLastPayment(payment);
      setCart([]);
      setDiscountPercent(0);
      setPaymentOpen(false);
      setReceiptOpen(true);
      setActiveBookingId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pos-transactions", orgId] }),
        queryClient.invalidateQueries({ queryKey: ["pos-catalog", orgId] }),
        queryClient.invalidateQueries({ queryKey: ["pos-customers", orgId] }),
        queryClient.invalidateQueries({ queryKey: ["pos-scheduled-bookings", orgId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-reports", orgId] }),
        queryClient.invalidateQueries({ queryKey: ["pos-active-shift", orgId, posStaffId] }),
      ]);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed");
      throw err;
    }
  };

  if (!orgId) {
    return <p className="text-sm text-muted-foreground">Select an organization to use POS.</p>;
  }

  if (staffLoading && !(me as { staffId?: string | null })?.staffId) {
    return <p className="text-sm text-muted-foreground">Loading POS…</p>;
  }

  if (!posStaffId) {
    return (
      <p className="text-sm text-muted-foreground">
        Link your user to a staff profile before using POS shifts.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass" data-testid="pos-shift-bar">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {activeShift ? (
                <>
                  Shift open since{" "}
                  {activeShift.openedAt
                    ? new Date(activeShift.openedAt).toLocaleString()
                    : "—"}
                </>
              ) : (
                "No active shift"
              )}
            </p>
            {activeShift ? (
              <p className="text-xs text-muted-foreground">
                Opening float {formatKes(activeShift.openingFloatKes)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {!activeShift ? (
              <Button
                size="sm"
                data-testid="pos-open-shift"
                onClick={() => setShiftDialogMode("open")}
              >
                Open shift
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setHeldSalesOpen(true)}>
                  Held sales ({heldSales.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="pos-close-shift"
                  onClick={() => setShiftDialogMode("close")}
                >
                  <LockKeyhole className="mr-1 h-4 w-4" /> Close shift
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {shiftRequired ? (
        <Card className="glass border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Open a shift to start selling.</p>
            <Button className="mt-4" onClick={() => setShiftDialogMode("open")}>
              Open shift
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="glass" data-testid="pos-scheduled-bookings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5" />
                Scheduled appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scheduledBookingsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading appointments…</p>
              ) : (scheduledBookingsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No scheduled appointments to bill.</p>
              ) : (
                <div className="space-y-2">
                  {(scheduledBookingsQuery.data ?? []).slice(0, 25).map((booking) => (
                    <div
                      key={booking.id}
                      data-testid={`pos-booking-${booking.id}`}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {booking.bookingDate.slice(0, 10)} {booking.startTime}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          Status: {booking.status}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={activeBookingId === booking.id ? "default" : "outline"}
                        onClick={() => loadBookingToCart(booking.id, booking.customerId)}
                      >
                        Bill appointment
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {(["services", "products", "packages"] as const).map((catalogTab) => (
                    <Button
                      key={catalogTab}
                      variant={tab === catalogTab ? "default" : "outline"}
                      onClick={() => setTab(catalogTab)}
                    >
                      {catalogTab.charAt(0).toUpperCase() + catalogTab.slice(1)}
                    </Button>
                  ))}
                </div>
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder={`Search ${tab}…`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {catalogQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading catalog…</p>
              ) : catalogQuery.isError ? (
                <p className="text-sm text-destructive">Failed to load catalog.</p>
              ) : catalogItems.length === 0 ? (
                <Card className="glass">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No {tab} found.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {catalogItems.map((item) => {
                    const outOfStock = item.type === "product" && (item.quantity ?? 0) <= 0;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => addToCart(item)}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          outOfStock
                            ? "cursor-not-allowed border-border/50 opacity-50"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {item.category || item.type}
                        </p>
                        <p className="mt-1 font-medium">{item.name}</p>
                        <p className="mt-2 font-heading text-lg text-primary">
                          {formatKes(item.priceKes)}
                        </p>
                        {item.type === "product" ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {outOfStock ? "Out of stock" : `${item.quantity} in stock`}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Card className="glass flex h-full flex-col">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.length})
                </CardTitle>
                <div className="flex items-center gap-2 pt-2">
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger aria-label="POS customer">
                      <SelectValue placeholder="Customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">Walk-in customer</SelectItem>
                      {customers.map((customer: PosCustomer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.fullName}
                          {customer.phone ? ` · ${customer.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Add customer"
                    onClick={() => setCustomerDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 p-4">
                {cart.length === 0 ? (
                  <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    Tap a catalog item to add it
                  </p>
                ) : (
                  <div className="max-h-[320px] space-y-3 overflow-y-auto">
                    {cart.map((line) => (
                      <div
                        key={`${line.type}-${line.id}`}
                        className="rounded-lg border border-border/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{line.name}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">{line.type}</p>
                          </div>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeLine(line)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQty(line, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{line.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQty(line, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm font-semibold">
                            {formatKes(line.unitPriceKes * line.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-auto space-y-3 border-t border-border/60 pt-4">
                  {discountPercent > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatKes(subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Manager discount ({discountPercent}%)
                        </span>
                        <span>−{formatKes(discountAmount)}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-heading text-2xl">{formatKes(total)}</span>
                  </div>
                  {checkoutError ? <p className="text-sm text-destructive">{checkoutError}</p> : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={cart.length === 0 || discountPercent > 0}
                    onClick={() => setPinDialogOpen(true)}
                    data-testid="pos-apply-discount"
                  >
                    <Percent className="mr-1 h-4 w-4" />
                    {discountPercent > 0 ? "Discount applied" : "Apply discount"}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={cart.length === 0}
                      onClick={holdCurrentSale}
                    >
                      <Pause className="mr-1 h-4 w-4" /> Hold
                    </Button>
                    <Button
                      className="bg-gradient-gold text-primary-foreground font-semibold"
                      disabled={cart.length === 0}
                      onClick={() => setPaymentOpen(true)}
                    >
                      Checkout
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Recent sales</CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading transactions…</p>
              ) : (transactionsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No sales yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-muted-foreground">
                        <th className="py-2 pr-4">When</th>
                        <th className="py-2 pr-4">Items</th>
                        <th className="py-2 pr-4">Payment</th>
                        <th className="py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(transactionsQuery.data ?? []).slice(0, 10).map((tx) => (
                        <tr key={tx.id} className="border-b border-border/40">
                          <td className="py-3 pr-4 align-top">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="py-3 pr-4 align-top">
                            {(tx.items ?? []).length === 0
                              ? "—"
                              : (tx.items ?? [])
                                  .map((item) => `${item.name} ×${item.quantity}`)
                                  .join(", ")}
                          </td>
                          <td className="py-3 pr-4 align-top capitalize">{tx.paymentMethod}</td>
                          <td className="py-3 align-top font-medium">{formatKes(tx.amountKes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ShiftDialog
        open={shiftDialogMode !== null}
        onClose={() => setShiftDialogMode(null)}
        mode={shiftDialogMode ?? "open"}
        shift={activeShift as PosShiftRow | null}
        expectedCash={expectedCashInTill}
        onOpen={handleOpenShift}
        onCloseShift={handleCloseShift}
      />

      <HeldSalesDialog
        open={heldSalesOpen}
        onClose={() => setHeldSalesOpen(false)}
        sales={heldSales}
        onResume={resumeHeldSale}
        onRemove={(id) => {
          removeHeldSale(orgId, id);
          setHeldSales(listHeldSales(orgId));
        }}
      />

      <PaymentDialog
        open={paymentOpen}
        total={total}
        defaultPhone={selectedCustomer?.phone}
        onClose={() => setPaymentOpen(false)}
        onConfirm={handleCheckout}
      />

      <CustomerDialog
        open={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
        onCreate={handleCreateCustomer}
      />

      <ManagerPinDialog
        open={pinDialogOpen}
        onClose={() => setPinDialogOpen(false)}
        reason="Apply a 10% manager discount to this sale"
        onApprove={() => {
          setDiscountPercent(10);
          toast.success("10% discount applied");
        }}
      />

      <ReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        txId={lastReceipt?.id ?? ""}
        items={receiptCart}
        payment={lastPayment}
        total={lastReceipt?.amountKes ?? 0}
        customerName={
          selectedCustomer?.fullName ??
          (customerId === "walk-in" ? undefined : customers.find((c) => c.id === customerId)?.fullName)
        }
        customerPhone={selectedCustomer?.phone}
        businessName={activeOrg?.name}
      />
    </div>
  );
}
