import { test, expect } from "@playwright/test";

const DASHBOARD_ROUTES = [
  "/dashboard",
  "/bookings",
  "/queue",
  "/schedule",
  "/waitlist",
  "/clients",
  "/pos",
  "/wallet",
  "/finance",
  "/reconciliation",
  "/inventory",
  "/payroll",
  "/commissions",
  "/tips",
  "/loyalty",
  "/qr-attendance",
  "/qr-clock",
  "/branches",
  "/audit-log",
  "/coverage-zones",
  "/field-operations",
  "/patient-intake",
  "/aftercare",
  "/session-notes",
  "/progress-tracking",
  "/shop-orders",
] as const;

const ADMIN_ROUTES = [
  "/admin",
  "/admin/tenants",
  "/admin/subscriptions",
  "/admin/features",
  "/admin/payouts",
] as const;

async function assertRouteLoads(page: import("@playwright/test").Page, route: string) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `HTTP status for ${route}`).toBeLessThan(500);

  await expect(page.locator("body")).not.toContainText("Application error", { timeout: 15_000 });

  const loading = page.getByText(/loading (workspace|admin console|portal)/i);
  await expect(loading).toHaveCount(0, { timeout: 30_000 });

  expect(errors, `client errors on ${route}`).toEqual([]);
}

for (const route of DASHBOARD_ROUTES) {
  test(`dashboard route loads: ${route}`, async ({ page }) => {
    await assertRouteLoads(page, route);
  });
}

for (const route of ADMIN_ROUTES) {
  test(`admin route loads: ${route}`, async ({ page }) => {
    await assertRouteLoads(page, route);
  });
}

test("portal route loads", async ({ page }) => {
  await assertRouteLoads(page, "/portal");
});
