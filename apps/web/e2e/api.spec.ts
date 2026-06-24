import { test, expect } from "@playwright/test";

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
    expect(me.ok()).toBeTruthy();
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
