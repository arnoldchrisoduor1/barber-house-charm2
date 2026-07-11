import { test, expect } from "@playwright/test";

import { fetchLatestOtpFromMailhog } from "../helpers/auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("2FA with MailHog", () => {
  test("enable 2FA sends email OTP, logout, login with OTP", async ({ browser }) => {
    test.setTimeout(120_000);
    const mailhogUrl = process.env.MAILHOG_URL ?? "http://localhost:8025";
    const demoEmail = process.env.E2E_DEMO_EMAIL ?? "arnoldchris262@gmail.com";

    const adminContext = await browser.newContext({ storageState: "e2e/.auth/user.json" });
    const page = await adminContext.newPage();

    await page.goto("/settings");
    await waitForWorkspace(page);
    await page.getByRole("button", { name: /security/i }).click();

    const alreadyEnabled = await page
      .getByText(/two-factor authentication is enabled/i)
      .isVisible()
      .catch(() => false);

    const setupBtn = page.getByTestId("enable-2fa-btn");
    if (!alreadyEnabled && (await setupBtn.count())) {
      const setupStarted = Date.now();
      await setupBtn.click();
      await expect(page.getByText(/verification code sent/i)).toBeVisible({ timeout: 15_000 });

      let otp: string | null = null;
      await expect(async () => {
        otp = await fetchLatestOtpFromMailhog(mailhogUrl, setupStarted);
        expect(otp).toBeTruthy();
      }).toPass({ timeout: 20_000 });

      await page.getByLabel(/verification code/i).fill(otp!);
      await page.getByRole("button", { name: /verify and enable/i }).click();
      await expect(page.getByText(/two-factor authentication enabled/i)).toBeVisible({ timeout: 15_000 });
    }

    await adminContext.close();

    const fresh = await browser.newContext();
    const loginPage = await fresh.newPage();
    await loginPage.goto("/login");
    await loginPage.locator('input[name="email"]').fill(demoEmail);
    await loginPage.locator('input[name="password"]').fill(process.env.E2E_DEMO_PASSWORD ?? "Admin123!");
    const loginStarted = Date.now();
    await loginPage.getByRole("button", { name: /sign in/i }).click();

    await expect(loginPage.getByLabel(/verification code/i)).toBeVisible({ timeout: 15_000 });

    let loginOtp: string | null = null;
    await expect(async () => {
      loginOtp = await fetchLatestOtpFromMailhog(mailhogUrl, loginStarted);
      expect(loginOtp).toBeTruthy();
    }).toPass({ timeout: 20_000 });

    await loginPage.getByLabel(/verification code/i).fill(loginOtp!);
    await loginPage.getByRole("button", { name: /verify/i }).click();

    await loginPage.waitForURL(/\/(admin|dashboard|portal|home)/, { timeout: 30_000 });
    await fresh.close();
  });
});
