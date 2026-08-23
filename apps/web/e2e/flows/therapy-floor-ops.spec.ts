import { test, expect } from "@playwright/test";

import { switchToTherapyOrg } from "../helpers/therapy-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Therapy floor ops (HT1)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToTherapyOrg(context);
  });

  test("session billing title on POS", async ({ page }) => {
    await page.goto("/pos");
    await waitForWorkspace(page);
    await expect(page.getByRole("heading", { name: /Session Billing/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("client retention title on loyalty", async ({ page }) => {
    await page.goto("/loyalty");
    await waitForWorkspace(page);
    await expect(page.getByRole("heading", { name: /Client Retention/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("session packages title", async ({ page }) => {
    await page.goto("/packages");
    await waitForWorkspace(page);
    await expect(page.getByRole("heading", { name: /Session Packages/i }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("session notes page loads", async ({ page }) => {
    await page.goto("/session-notes");
    await waitForWorkspace(page);
    await expect(page.locator("body")).toContainText(/session|notes/i);
  });
});
