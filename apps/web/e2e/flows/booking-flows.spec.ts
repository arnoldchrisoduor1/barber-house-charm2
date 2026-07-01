import { expect, test } from "@playwright/test";

import { DEMO_ORG_SLUG } from "../fixtures";
import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Public client booking wizard", () => {
  test("walks through services, date, staff, and confirms a booking", async ({ page }) => {
    await page.goto(`/book/${DEMO_ORG_SLUG}`);
    await expect(page.getByRole("heading", { name: /book an appointment/i })).toBeVisible({
      timeout: 20_000,
    });

    // Step 1: services (branch step is skipped when org has a single branch)
    await expect(page.getByRole("heading", { name: /select services/i })).toBeVisible({ timeout: 20_000 });
    const serviceTile = page.getByRole("button").filter({ hasText: /classic haircut|beard trim/i }).first();
    await expect(serviceTile).toBeVisible({ timeout: 20_000 });
    await serviceTile.click();
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2: date & time
    await expect(page.getByLabel(/date/i)).toBeVisible();
    const future = new Date();
    future.setDate(future.getDate() + 3);
    await page.getByLabel(/date/i).fill(future.toISOString().slice(0, 10));
    await page.getByLabel(/time/i).fill("10:00");
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 3: choose professional (availability resolved server-side)
    await expect(page.getByRole("heading", { name: /choose your professional/i })).toBeVisible({ timeout: 20_000 });
    const staffTile = page.getByRole("button").filter({ hasText: /alex|stylist|barber/i }).first();
    await expect(staffTile).toBeVisible({ timeout: 20_000 });
    await staffTile.click();
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 4: confirm with prices + contact details
    await expect(page.getByRole("heading", { name: /confirm details/i })).toBeVisible();
    await expect(page.getByText(/total:/i)).toBeVisible();
    await page.getByLabel(/full name/i).fill("E2E Guest");
    await page.getByLabel(/phone/i).fill(`+25479${Date.now().toString().slice(-7)}`);
    await page.getByRole("button", { name: /confirm booking/i }).click();

    await expect(page.getByText(/booking confirmed/i)).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Authenticated portal + branch filter", () => {
  test.beforeEach(async ({ context }) => {
    await ensureAuthenticated(context);
  });

  test("CEO sees a branch switcher on the dashboard with metrics", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);

    await expect(page.getByRole("combobox").filter({ hasText: /all branches/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("dashboard-metrics")).toBeVisible({ timeout: 15_000 });
  });

  test("branch filter scopes the dashboard to a single branch", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);

    const branchSwitcher = page.getByRole("combobox").filter({ hasText: /all branches/i });
    await expect(branchSwitcher).toBeVisible({ timeout: 15_000 });
    await branchSwitcher.click();
    await page.getByRole("option", { name: /main branch/i }).click();

    await expect(page.getByText(/viewing data for/i)).toContainText(/main branch/i, {
      timeout: 15_000,
    });
  });

  test("client portal booking page is reachable via the portal switcher", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);

    await page.getByRole("tab", { name: /client/i }).click();
    await page.waitForURL("**/portal", { timeout: 15_000 });

    await page.goto("/portal/book");
    await expect(page.getByRole("heading", { name: /book your next visit/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: /select services/i })).toBeVisible({ timeout: 20_000 });
  });

  test("my bookings page renders the client's bookings list", async ({ page }) => {
    await page.goto("/portal/bookings");
    await expect(page.getByRole("heading", { name: /my bookings/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText("Application error");
  });
});
