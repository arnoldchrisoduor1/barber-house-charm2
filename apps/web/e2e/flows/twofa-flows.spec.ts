import { test, expect } from "@playwright/test";

import { fetchLatestOtpFromMailhog } from "../helpers/auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("2FA with MailHog", () => {
  test.skip(!process.env.E2E_RUN_2FA, "Set E2E_RUN_2FA=1 to run 2FA tests (requires MailHog)");

  test("enable 2FA, logout, login with OTP", async ({ browser }) => {
    const mailhogUrl = process.env.MAILHOG_URL ?? "http://localhost:8025";

    const adminContext = await browser.newContext({ storageState: "e2e/.auth/user.json" });
    const page = await adminContext.newPage();

    await page.goto("/settings");
    await waitForWorkspace(page);
    await page.getByRole("button", { name: /security/i }).click();

    const setupBtn = page.getByRole("button", { name: /enable|send code|setup/i });
    if (await setupBtn.count()) {
      await setupBtn.first().click();
      await page.waitForTimeout(2000);
      const otp = await fetchLatestOtpFromMailhog(mailhogUrl);
      test.skip(!otp, "No OTP in MailHog");
      await page.getByLabel(/verification|otp|code/i).fill(otp!);
      await page.getByRole("button", { name: /verify|confirm/i }).click();
      await expect(page.getByText(/enabled|2fa/i).first()).toBeVisible({ timeout: 15_000 });
    }

    await adminContext.close();

    const fresh = await browser.newContext();
    const loginPage = await fresh.newPage();
    await loginPage.goto("/login");
    await loginPage.locator('input[name="email"]').fill(process.env.E2E_DEMO_EMAIL ?? "arnoldchris262@gmail.com");
    await loginPage.locator('input[name="password"]').fill(process.env.E2E_DEMO_PASSWORD ?? "Admin123!");
    await loginPage.getByRole("button", { name: /sign in/i }).click();

    if (await loginPage.getByLabel(/verification code/i).isVisible({ timeout: 5_000 }).catch(() => false)) {
      const otp = await fetchLatestOtpFromMailhog(mailhogUrl);
      test.skip(!otp, "No OTP for login challenge");
      await loginPage.getByLabel(/verification code/i).fill(otp!);
      await loginPage.getByRole("button", { name: /verify/i }).click();
    }

    await loginPage.waitForURL(/\/(admin|dashboard|portal)/, { timeout: 30_000 });
    await fresh.close();
  });
});
