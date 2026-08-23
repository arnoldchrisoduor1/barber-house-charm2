import { test, expect } from "@playwright/test";

import { switchToSpaOrg } from "../helpers/spa-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Spa advanced (HS3)", () => {
  test.beforeEach(async ({ context }) => {
    await switchToSpaOrg(context);
  });

  test("resources page loads and shows seeded rooms", async ({ page }) => {
    await page.goto("/resources");
    await waitForWorkspace(page);
    await expect(page.getByTestId("resources-page")).toBeVisible();
    await expect(page.getByText(/Treatment Room/i).first()).toBeVisible();
  });

  test("session notes page loads", async ({ page }) => {
    await page.goto("/session-notes");
    await waitForWorkspace(page);
    await expect(page.getByTestId("session-notes-page")).toBeVisible();
  });

  test("progress tracking page loads", async ({ page }) => {
    await page.goto("/progress-tracking");
    await waitForWorkspace(page);
    await expect(page.getByTestId("progress-tracking-page")).toBeVisible();
  });

  test("aftercare page loads CRUD workspace", async ({ page }) => {
    await page.goto("/aftercare");
    await waitForWorkspace(page);
    await expect(page.getByTestId("aftercare-page")).toBeVisible();
    await expect(page.getByRole("button", { name: /new template/i })).toBeVisible();
  });

  test("public book page spa theme", async ({ page }) => {
    await page.goto("/book/spa-demo-wellness");
    await expect(page.getByTestId("public-book-page")).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/theme-spa/);
  });
});
