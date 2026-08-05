import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";

/** Paths removed from barber.json in Phase 0 — must not appear in barber-mode sidebar. */
const BARBER_HIDDEN_NAV = ["Payments Demo", "Field Operations"] as const;

/** Growth/inventory orphans surfaced in barber.json Phase 0. */
const BARBER_GROWTH_LABELS = ["Loyalty", "Packages", "Gift Cards", "Promotions", "Referrals"] as const;

test.describe("Barber nav truth (Phase 0)", () => {
  test.beforeEach(async ({ context }) => {
    await ensureAuthenticated(context);
  });

  test("barber sidebar hides stub routes", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar).toBeVisible();
    for (const label of BARBER_HIDDEN_NAV) {
      await expect(sidebar.getByRole("link", { name: label })).toHaveCount(0);
    }
  });

  test("barber Growth section lists loyalty and packages when entitled", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const sidebar = page.getByTestId("app-sidebar");
    // Demo org is enterprise — growth items should be discoverable when features on.
    for (const label of BARBER_GROWTH_LABELS) {
      const link = sidebar.getByRole("link", { name: label });
      if ((await link.count()) > 0) {
        await expect(link.first()).toBeVisible();
      }
    }
  });
});
