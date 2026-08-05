import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../fixtures";

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

test.describe("B5-03 POS PIN + tabs", () => {
  test("manager PIN verify rejects bad pin", async ({ request }) => {
    const login = await request.post("/api/v1/auth/login", {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();

    const bad = await request.post(`/api/v1/organizations/${activeOrg.id}/pos/verify-pin`, {
      data: { pin: "0000" },
    });
    expect(bad.status()).toBe(403);

    const ok = await request.post(`/api/v1/organizations/${activeOrg.id}/pos/verify-pin`, {
      data: { pin: "1234" },
    });
    expect(ok.ok()).toBeTruthy();
  });

  test("open tab holds items until settled", async ({ page, request }) => {
    const login = await request.post("/api/v1/auth/login", {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const orgId = activeOrg.id as string;

    const label = `E2E Tab ${Date.now()}`;
    const openRes = await request.post(`/api/v1/organizations/${orgId}/pos/tabs`, {
      data: { label },
    });
    expect(openRes.ok()).toBeTruthy();
    const tab = await openRes.json();
    const tabId = tab.id as string;

    const itemRes = await request.post(`/api/v1/organizations/${orgId}/pos/tabs/${tabId}/items`, {
      data: { name: "Beard trim", unit_price_kes: 500, quantity: 1, item_type: "custom" },
    });
    expect(itemRes.ok()).toBeTruthy();

    await page.goto("/pos/tabs");
    await waitForWorkspace(page);
    await expect(page.getByTestId("pos-tabs-page")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(label)).toBeVisible();
    await expect(page.getByText("Beard trim")).toBeVisible();

    const closeRes = await request.post(`/api/v1/organizations/${orgId}/pos/tabs/${tabId}/close`, { data: {} });
    expect(closeRes.ok()).toBeTruthy();
  });
});

test.describe("B5-04 CRM merge / tags / photos", () => {
  test("merge keeps history on primary", async ({ request }) => {
    const login = await request.post("/api/v1/auth/login", {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    const me = await request.get("/api/v1/me");
    const { activeOrg } = await me.json();
    const orgId = activeOrg.id as string;
    const suffix = Date.now();

    const a = await request.post(`/api/v1/organizations/${orgId}/customers`, {
      data: { full_name: `Merge A ${suffix}`, phone: `+254700${String(suffix).slice(-6)}` },
    });
    const b = await request.post(`/api/v1/organizations/${orgId}/customers`, {
      data: { full_name: `Merge B ${suffix}`, phone: `+254701${String(suffix).slice(-6)}` },
    });
    expect(a.ok()).toBeTruthy();
    expect(b.ok()).toBeTruthy();
    const primary = await a.json();
    const secondary = await b.json();

    const mergeRes = await request.post(`/api/v1/organizations/${orgId}/customers/merge`, {
      data: { primary_id: primary.id, merge_ids: [secondary.id] },
    });
    expect(mergeRes.ok()).toBeTruthy();

    const ghost = await request.get(`/api/v1/organizations/${orgId}/customers/${secondary.id}`);
    expect(ghost.ok()).toBeTruthy();
    const ghostBody = await ghost.json();
    expect(ghostBody.merged_into_id ?? ghostBody.MergedIntoID).toBe(primary.id);
  });

  test("client tags and photos pages load", async ({ page }) => {
    await page.goto("/client-tags");
    await waitForWorkspace(page);
    await expect(page.getByTestId("client-tags-page")).toBeVisible({ timeout: 15_000 });

    await page.goto("/clients/merge");
    await waitForWorkspace(page);
    await expect(page.getByTestId("client-merge-page")).toBeVisible({ timeout: 15_000 });

    await page.goto("/client-photos");
    await waitForWorkspace(page);
    await expect(page.getByTestId("client-photos-page")).toBeVisible({ timeout: 15_000 });
  });
});
