import { test, expect } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { waitForWorkspace } from "../helpers/crud";

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

test("whatsapp delivery log page loads", async ({ page }) => {
  await page.goto("/whatsapp");
  await waitForWorkspace(page);
  await expect(page.getByText(/whatsapp delivery log/i)).toBeVisible({ timeout: 15_000 });
});

test("gallery upload controls visible", async ({ page }) => {
  await page.goto("/gallery");
  await waitForWorkspace(page);
  await expect(page.getByTestId("gallery-upload-btn")).toBeVisible({ timeout: 15_000 });
});

test("marketing campaigns table loads", async ({ page }) => {
  await page.goto("/marketing");
  await waitForWorkspace(page);
  await expect(page.getByRole("button", { name: /new campaign/i })).toBeVisible({ timeout: 15_000 });
});
