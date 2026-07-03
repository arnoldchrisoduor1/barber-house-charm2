import { test, expect } from "@playwright/test";

import { createPublicBooking } from "./helpers/booking";

import { DEMO_EMAIL, DEMO_PASSWORD } from "./fixtures";

const apiBase = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:18432";

test.describe("backend API (direct)", () => {
  test("health endpoint is ok", async ({ request }) => {
    const res = await request.get(`${apiBase}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("up");
  });
});

test.describe("backend API (via web proxy + session)", () => {
  test.beforeEach(async ({ request }) => {
    const login = await request.post("/api/v1/auth/login", {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
  });

  test("GET /me returns demo user and org", async ({ request }) => {
    const res = await request.get("/api/v1/me");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.user.email).toBe(DEMO_EMAIL);
    expect(body.activeOrg.slug).toBe("demo-salon");
    expect(body.roles).toContain("ceo");
    expect(body.features).toBeInstanceOf(Array);
  });

  test("list bookings for demo org", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const res = await request.get(`/api/v1/organizations/${activeOrg.id}/bookings`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  test("list customers for demo org", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const res = await request.get(`/api/v1/organizations/${activeOrg.id}/customers`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  test("list staff for demo org", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const res = await request.get(`/api/v1/organizations/${activeOrg.id}/staff`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  test("list services for demo org", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const res = await request.get(`/api/v1/organizations/${activeOrg.id}/services`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  test("analytics reports endpoint", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const res = await request.get(`/api/v1/organizations/${activeOrg.id}/analytics/reports`);
    expect(res.ok()).toBeTruthy();
  });

  test("analytics reports endpoint accepts a branch filter", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const branchesRes = await request.get(`/api/v1/organizations/${activeOrg.id}/branches`);
    const branchesBody = await branchesRes.json();
    const branches = Array.isArray(branchesBody) ? branchesBody : branchesBody.data;
    const branchId = branches[0]?.ID ?? branches[0]?.id;
    expect(branchId).toBeTruthy();

    const res = await request.get(
      `/api/v1/organizations/${activeOrg.id}/analytics/reports?branch_id=${branchId}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("total_revenue_kes");
    expect(body).toHaveProperty("total_bookings");
  });

  test("booking catalog returns branches, services, and staff", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const res = await request.get(`/api/v1/organizations/${activeOrg.id}/bookings/catalog`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.branches).toBeInstanceOf(Array);
    expect(body.services).toBeInstanceOf(Array);
    expect(body.staff).toBeInstanceOf(Array);
  });

  test("public catalog and staff availability are reachable", async ({ request }) => {
    const catalog = await request.get(`/api/v1/organizations/public/demo-salon/catalog`);
    expect(catalog.ok()).toBeTruthy();
    const catalogBody = await catalog.json();
    expect(catalogBody.staff).toBeInstanceOf(Array);

    const staffId = (catalogBody.staff[0]?.ID ?? catalogBody.staff[0]?.id) as string | undefined;
    if (staffId) {
      const future = new Date();
      future.setDate(future.getDate() + 4);
      const dateStr = future.toISOString().slice(0, 10);
      const avail = await request.get(
        `/api/v1/organizations/public/demo-salon/staff-availability?booking_date=${dateStr}&start_time=11:00&duration_minutes=30&staff_ids=${staffId}`,
      );
      expect(avail.ok()).toBeTruthy();
      const availBody = await avail.json();
      expect(availBody.availability).toHaveProperty(staffId);
    }
  });

  test("public booking with service + staff creates a scheduled booking", async ({ request }) => {
    const { res } = await createPublicBooking(request);
    expect(res.ok()).toBeTruthy();
    const booking = await res.json();
    expect(booking.Status ?? booking.status).toMatch(/scheduled/i);
  });

  test("POS checkout records the active branch", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();

    const branchesRes = await request.get(`/api/v1/organizations/${activeOrg.id}/branches`);
    const branchesBody = await branchesRes.json();
    const branches = Array.isArray(branchesBody) ? branchesBody : branchesBody.data;
    const branchId = branches[0]?.ID ?? branches[0]?.id;

    const servicesRes = await request.get(`/api/v1/organizations/${activeOrg.id}/services`);
    const servicesBody = await servicesRes.json();
    const serviceId = servicesBody.data?.[0]?.ID ?? servicesBody.data?.[0]?.id;

    const checkout = await request.post(`/api/v1/organizations/${activeOrg.id}/transactions/checkout`, {
      data: {
        branchId,
        paymentMethod: "cash",
        cashTendered: 5000,
        lines: [{ itemType: "service", itemId: serviceId, quantity: 1 }],
      },
    });
    expect(checkout.ok()).toBeTruthy();
    const tx = await checkout.json();
    expect(tx.BranchID ?? tx.branchId ?? tx.branch_id).toBe(branchId);

    const scoped = await request.get(
      `/api/v1/organizations/${activeOrg.id}/transactions?branch_id=${branchId}`,
    );
    expect(scoped.ok()).toBeTruthy();
    const scopedBody = await scoped.json();
    expect(scopedBody.data).toBeInstanceOf(Array);
    expect(scopedBody.data.length).toBeGreaterThan(0);
  });

  test("notification settings endpoint", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const res = await request.get(`/api/v1/organizations/${activeOrg.id}/notification-settings`);
    expect(res.ok()).toBeTruthy();
  });

  test("branding endpoint", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const res = await request.get(`/api/v1/organizations/${activeOrg.id}/branding`);
    expect(res.ok()).toBeTruthy();
  });

  test("list branches for demo org", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const res = await request.get(`/api/v1/organizations/${activeOrg.id}/branches`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const branches = Array.isArray(body) ? body : body.data;
    expect(branches).toBeInstanceOf(Array);
    expect(branches.length).toBeGreaterThan(0);
  });

  test("POS checkout creates a completed sale with line items", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();

    const servicesRes = await request.get(`/api/v1/organizations/${activeOrg.id}/services`);
    expect(servicesRes.ok()).toBeTruthy();
    const servicesBody = await servicesRes.json();
    const service = servicesBody.data?.[0];
    expect(service).toBeTruthy();

    const serviceId = service.ID ?? service.id;
    const checkout = await request.post(`/api/v1/organizations/${activeOrg.id}/transactions/checkout`, {
      data: {
        paymentMethod: "cash",
        cashTendered: 5000,
        lines: [{ itemType: "service", itemId: serviceId, quantity: 1 }],
      },
    });
    expect(checkout.ok()).toBeTruthy();
    const tx = await checkout.json();
    expect(tx.PaymentStatus ?? tx.paymentStatus ?? tx.payment_status).toMatch(/completed/i);
    expect(tx.AmountKES ?? tx.amountKes ?? tx.amount_kes).toBeGreaterThan(0);

    const list = await request.get(`/api/v1/organizations/${activeOrg.id}/transactions`);
    expect(list.ok()).toBeTruthy();
    const listBody = await list.json();
    expect(listBody.data).toBeInstanceOf(Array);
    expect(listBody.data.length).toBeGreaterThan(0);
  });
});

test.describe("auth API", () => {
  test("login with demo credentials sets session", async ({ browser }) => {
    const context = await browser.newContext();
    const request = context.request;
    const res = await request.post("/api/v1/auth/login", {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(res.ok()).toBeTruthy();
    const me = await request.get("/api/v1/me");
    expect(me.ok()).toBeTruthy();
    const body = await me.json();
    expect(body.user.email).toBe(DEMO_EMAIL);
    await context.close();
  });
});
