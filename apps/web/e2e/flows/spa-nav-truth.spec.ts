import { test, expect } from "@playwright/test";

import { switchToSpaOrg } from "../helpers/spa-auth";
import { waitForWorkspace } from "../helpers/crud";

const HIDDEN = ["Payments Demo", "Field Operations"] as const;

test.describe("Spa nav truth (HS0)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToSpaOrg(context);
  });

  test("spa sidebar hides stub routes", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar).toBeVisible();
    for (const label of HIDDEN) {
      await expect(sidebar.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("spa org shows Haus of Spa brand", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.locator("html")).toHaveClass(/theme-spa/);
    await expect(page.getByText(/Haus of Spa/i).first()).toBeVisible();
  });

  test("walk-in queue nav present for entitled org", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const link = page.getByTestId("app-sidebar").getByRole("link", { name: /Walk-in Queue/i });
    await expect(link.first()).toBeVisible();
  });

  test("treatment rooms nav present", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const link = page.getByTestId("app-sidebar").getByRole("link", { name: /Treatment Rooms/i });
    await expect(link.first()).toBeVisible();
  });
});
