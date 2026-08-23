import { test, expect } from "@playwright/test";

import { switchToBeautyOrg } from "../helpers/beauty-auth";
import { waitForWorkspace } from "../helpers/crud";

const HIDDEN = ["Payments Demo", "Field Operations"] as const;

test.describe("Beauty nav truth (HB0)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToBeautyOrg(context);
  });

  test("beauty sidebar hides stub routes", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar).toBeVisible();
    for (const label of HIDDEN) {
      await expect(sidebar.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("beauty org shows Haus of Beauty brand", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.locator("html")).toHaveClass(/theme-beauty/);
    await expect(page.getByText(/Haus of Beauty/i).first()).toBeVisible();
  });

  test("walk-in queue nav present for entitled org", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    // Queue is branch_manager in beauty nav — switch to manager preview.
    await page.evaluate(() => {
      localStorage.setItem(
        "haus-portal-view",
        JSON.stringify({ state: { activePortal: "manager" }, version: 0 }),
      );
    });
    await page.reload();
    await waitForWorkspace(page);
    const link = page.getByTestId("app-sidebar").getByRole("link", { name: /Walk-in Queue|Queue Manager/i });
    await expect(link.first()).toBeVisible();
  });
});
