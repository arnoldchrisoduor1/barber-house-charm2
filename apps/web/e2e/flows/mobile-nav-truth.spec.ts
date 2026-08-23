import { test, expect } from "@playwright/test";

import { switchToMobileOrg } from "../helpers/mobile-auth";
import { waitForWorkspace } from "../helpers/crud";

const HIDDEN = ["Payments Demo"] as const;

test.describe("Mobile nav truth (HM0)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToMobileOrg(context);
  });

  test("mobile sidebar hides payments demo", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const sidebar = page.getByTestId("app-sidebar");
    for (const label of HIDDEN) {
      await expect(sidebar.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("mobile org shows Haus of Mobile brand", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.locator("html")).toHaveClass(/theme-mobile/);
    await expect(page.getByText(/Haus of Mobile/i).first()).toBeVisible();
  });

  test("coverage zones nav present for entitled org", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: /Coverage Zones/i }).first()).toBeVisible();
  });
});
