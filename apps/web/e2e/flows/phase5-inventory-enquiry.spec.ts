import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../fixtures";

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

test.describe("B5-05 Inventory stock-take + PO", () => {
  test("stock take finalize adjusts inventory quantity", async ({ request }) => {
    const login = await request.post("/api/v1/auth/login", {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const orgId = activeOrg.id as string;
    const suffix = Date.now();

    const itemRes = await request.post(`/api/v1/organizations/${orgId}/inventory`, {
      data: { name: `E2E Stock ${suffix}`, quantity: 10, unit_cost_kes: 100 },
    });
    expect(itemRes.ok()).toBeTruthy();
    const item = await itemRes.json();
    const itemId = item.id as string;

    const takeRes = await request.post(`/api/v1/organizations/${orgId}/inventory/stock-takes`, {
      data: { label: `E2E take ${suffix}` },
    });
    expect(takeRes.ok()).toBeTruthy();
    const take = await takeRes.json();
    const takeId = take.id as string;

    const patchRes = await request.patch(`/api/v1/organizations/${orgId}/inventory/stock-takes/${takeId}/lines`, {
      data: { lines: [{ inventory_id: itemId, counted_qty: 7 }] },
    });
    expect(patchRes.ok()).toBeTruthy();

    const finalizeRes = await request.post(
      `/api/v1/organizations/${orgId}/inventory/stock-takes/${takeId}/finalize`,
      { data: {} },
    );
    expect(finalizeRes.ok()).toBeTruthy();

    const getItem = await request.get(`/api/v1/organizations/${orgId}/inventory/${itemId}`);
    expect(getItem.ok()).toBeTruthy();
    const updated = await getItem.json();
    expect(updated.quantity ?? updated.Quantity).toBe(7);
  });

  test("purchase order receive increments stock", async ({ request }) => {
    const login = await request.post("/api/v1/auth/login", {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const orgId = activeOrg.id as string;
    const suffix = Date.now();

    const itemRes = await request.post(`/api/v1/organizations/${orgId}/inventory`, {
      data: { name: `E2E PO ${suffix}`, quantity: 5, unit_cost_kes: 200 },
    });
    expect(itemRes.ok()).toBeTruthy();
    const item = await itemRes.json();
    const itemId = item.id as string;

    const poRes = await request.post(`/api/v1/organizations/${orgId}/purchase-orders`, {
      data: {
        supplier_name: "E2E Supplier",
        lines: [{ name: `E2E PO line ${suffix}`, quantity: 3, unit_cost_kes: 200, inventory_id: itemId }],
      },
    });
    expect(poRes.ok()).toBeTruthy();
    const po = await poRes.json();
    const poId = po.id as string;

    const sentRes = await request.patch(`/api/v1/organizations/${orgId}/purchase-orders/${poId}/status`, {
      data: { status: "sent" },
    });
    expect(sentRes.ok()).toBeTruthy();

    const recvRes = await request.patch(`/api/v1/organizations/${orgId}/purchase-orders/${poId}/status`, {
      data: { status: "received" },
    });
    expect(recvRes.ok()).toBeTruthy();

    const getItem = await request.get(`/api/v1/organizations/${orgId}/inventory/${itemId}`);
    expect(getItem.ok()).toBeTruthy();
    const updated = await getItem.json();
    expect(updated.quantity ?? updated.Quantity).toBe(8);
  });

  test("stock take and PO pages load", async ({ page }) => {
    await page.goto("/inventory/stock-take");
    await waitForWorkspace(page);
    await expect(page.getByTestId("stock-take-page")).toBeVisible({ timeout: 15_000 });

    await page.goto("/inventory/purchase-orders");
    await waitForWorkspace(page);
    await expect(page.getByTestId("purchase-orders-page")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("B5-07 Enquiry desk", () => {
  test("manual enquiry converts to booking", async ({ request }) => {
    const login = await request.post("/api/v1/auth/login", {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const orgId = activeOrg.id as string;
    const suffix = Date.now();

    const enqRes = await request.post(`/api/v1/organizations/${orgId}/enquiry-desk`, {
      data: {
        name: `E2E Enquiry ${suffix}`,
        phone: `+254702${String(suffix).slice(-6)}`,
        subject: "Haircut booking",
        message: "Wants a fade tomorrow",
      },
    });
    expect(enqRes.ok()).toBeTruthy();
    const enq = await enqRes.json();
    const enqId = enq.id as string;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const bookingDate = tomorrow.toISOString().slice(0, 10);

    const convertRes = await request.post(`/api/v1/organizations/${orgId}/enquiry-desk/${enqId}/convert-to-booking`, {
      data: { booking_date: bookingDate, start_time: "14:00", end_time: "14:30" },
    });
    expect(convertRes.ok()).toBeTruthy();
    const converted = await convertRes.json();
    const bookingId = converted.converted_booking_id ?? converted.ConvertedBookingID;
    expect(bookingId).toBeTruthy();

    const bookingRes = await request.get(`/api/v1/organizations/${orgId}/bookings/${bookingId}`);
    expect(bookingRes.ok()).toBeTruthy();
  });

  test("call centre enquiry desk UI loads", async ({ page }) => {
    await page.goto("/call-centre");
    await waitForWorkspace(page);
    await expect(page.getByTestId("enquiry-desk")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("enquiry-create")).toBeVisible();
  });
});
