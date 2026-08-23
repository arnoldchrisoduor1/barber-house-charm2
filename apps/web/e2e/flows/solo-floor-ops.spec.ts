import { test, expect } from "@playwright/test";

import { switchToSoloOrg } from "../helpers/solo-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Solo floor ops (HSolo1)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToSoloOrg(context);
  });

  test("solo workspace dashboard renders", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    await expect(page.getByTestId("solo-pro-dashboard")).toBeVisible();
    await expect(page.getByTestId("solo-today-strip")).toBeVisible();
    await expect(page.getByTestId("solo-quick-pos")).toBeVisible();
  });

  test("my earnings reachable", async ({ page }) => {
    await page.goto("/my-earnings");
    await waitForWorkspace(page);
    await expect(page.getByText(/My Earnings|earnings/i).first()).toBeVisible();
  });

  test("thin nav omits waitlist and queue", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForWorkspace(page);
    const sidebar = page.getByTestId("app-sidebar");
    await expect(sidebar.getByRole("link", { name: /Waitlist/i })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: /^Queue$/i })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: /Notifications/i })).toHaveCount(0);
  });
});
