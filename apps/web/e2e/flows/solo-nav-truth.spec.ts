import { test, expect } from "@playwright/test";

import { switchToSoloOrg } from "../helpers/solo-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Solo nav truth (HSolo0)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToSoloOrg(context);
  });

  test("solo org shows Haus of Solo Pro brand", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.locator("html")).toHaveClass(/theme-solo/);
    await expect(page.getByText(/Haus of Solo Pro/i).first()).toBeVisible();
  });

  test("my earnings nav present on solo plan", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: /My Earnings/i }).first()).toBeVisible();
  });

  test("pos nav present on solo plan", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: /^POS$/i }).first()).toBeVisible();
  });
});
