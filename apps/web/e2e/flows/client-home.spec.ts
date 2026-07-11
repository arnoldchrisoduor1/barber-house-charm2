import { expect, test } from "@playwright/test";

import { fetchLatestVerificationTokenFromMailhog } from "../helpers/auth";
import { uniqueEmail, uniqueName } from "../helpers/unique";

test.describe("Client home marketplace", () => {
  test("client registers, verifies, picks org from home, and opens booking", async ({ page }) => {
    test.setTimeout(180_000);
    const mailhogUrl = process.env.MAILHOG_URL ?? "http://localhost:8025";
    const email = uniqueEmail("client-home");
    const name = uniqueName("Client User");

    await page.goto("/register?portal=client");
    await page.locator('input[name="fullName"]').fill(name);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("TestPass123!");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByTestId("register-verification-sent")).toBeVisible({ timeout: 15_000 });

    let token: string | null = null;
    await expect(async () => {
      token = await fetchLatestVerificationTokenFromMailhog(mailhogUrl, email);
      expect(token).toBeTruthy();
    }).toPass({ timeout: 20_000 });

    await page.goto(`/verify-email?token=${token}`);
    await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });

    await expect(page.getByTestId("haus-filter")).toBeVisible();
    await expect(page.getByTestId("org-grid")).toBeVisible({ timeout: 20_000 });
    const firstOrg = page.getByTestId(/org-card-/).first();
    await expect(firstOrg).toBeVisible({ timeout: 20_000 });
    await firstOrg.getByRole("button", { name: /book here/i }).click();
    await expect(page).toHaveURL(/\/portal\/book/, { timeout: 30_000 });
  });
});
