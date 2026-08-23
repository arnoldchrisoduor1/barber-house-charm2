import { test, expect } from "@playwright/test";

import { switchToNailsOrg } from "../helpers/nails-auth";
import { waitForWorkspace } from "../helpers/crud";
import { setPortal, stripMeFeatures } from "../helpers/nav-features";

const HIDDEN = ["Payments Demo", "Field Operations"] as const;

test.describe("Nails nav truth (HN0)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToNailsOrg(context);
  });

  test("nail sidebar hides stub routes", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const sidebar = page.getByTestId("app-sidebar");
    for (const label of HIDDEN) {
      await expect(sidebar.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("nail org shows Haus of Nails brand", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.locator("html")).toHaveClass(/theme-nail/);
    await expect(page.getByText(/Haus of Nails/i).first()).toBeVisible();
  });

  test("walk-in queue nav present for entitled org", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await setPortal(page, "manager");
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: /Walk-in Queue/i }).first()).toBeVisible();
  });

  test("waitlist and gallery show when bookings/marketing on", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await setPortal(page, "manager");
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: /^Waitlist$/i }).first()).toBeVisible();
    await setPortal(page, "executive");
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: /Nail Art Gallery/i }).first()).toBeVisible();
  });

  test("waitlist and gallery hide when bookings/marketing off", async ({ page }) => {
    await stripMeFeatures(page, ["bookings", "marketing"]);
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await setPortal(page, "manager");
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: /^Waitlist$/i })).toHaveCount(0);
    await setPortal(page, "executive");
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: /Nail Art Gallery/i })).toHaveCount(0);
  });
});
