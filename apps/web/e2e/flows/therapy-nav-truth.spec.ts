import { test, expect } from "@playwright/test";

import { switchToTherapyOrg } from "../helpers/therapy-auth";
import { waitForWorkspace } from "../helpers/crud";

const HIDDEN = ["Payments Demo", "Field Operations"] as const;

test.describe("Therapy nav truth (HT0)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToTherapyOrg(context);
  });

  test("therapy sidebar hides stub routes", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const sidebar = page.getByTestId("app-sidebar");
    for (const label of HIDDEN) {
      await expect(sidebar.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("therapy org shows Haus of Therapy brand", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.locator("html")).toHaveClass(/theme-therapy/);
    await expect(page.getByText(/Haus of Therapy/i).first()).toBeVisible();
  });

  test("session notes nav present for entitled org", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: /Session Notes/i }).first()).toBeVisible();
  });
});
