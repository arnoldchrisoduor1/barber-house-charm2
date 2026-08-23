import { test, expect } from "@playwright/test";

import { switchToClinicOrg } from "../helpers/clinic-auth";
import { waitForWorkspace } from "../helpers/crud";

const HIDDEN = ["Payments Demo", "Field Operations"] as const;

test.describe("Clinic nav truth (HA0)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToClinicOrg(context);
  });

  test("clinic sidebar hides stub routes", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const sidebar = page.getByTestId("app-sidebar");
    for (const label of HIDDEN) {
      await expect(sidebar.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("clinic org shows Haus of Aesthetics brand", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.locator("html")).toHaveClass(/theme-clinic/);
    await expect(page.getByText(/Haus of Aesthetics/i).first()).toBeVisible();
  });
});
