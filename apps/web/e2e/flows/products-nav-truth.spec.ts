import { test, expect } from "@playwright/test";

import { switchToProductsOrg } from "../helpers/products-auth";
import { waitForWorkspace } from "../helpers/crud";

const HIDDEN = ["Payments Demo"] as const;

test.describe("Products nav truth (HP0)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToProductsOrg(context);
  });

  test("products sidebar hides payments demo", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const sidebar = page.getByTestId("app-sidebar");
    for (const label of HIDDEN) {
      await expect(sidebar.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("products org shows Haus of Products brand", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.locator("html")).toHaveClass(/theme-products/);
    await expect(page.getByText(/Haus of Products/i).first()).toBeVisible();
  });

  test("product catalogue nav present", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: /Product Catalogue|Retail Products/i }).first()).toBeVisible();
  });
});
