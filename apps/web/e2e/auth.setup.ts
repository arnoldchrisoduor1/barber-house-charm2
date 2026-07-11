import { test as setup, expect, type BrowserContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { fetchLatestOtpFromMailhog } from "./helpers/auth";
import { DEMO_EMAIL, DEMO_PASSWORD } from "./fixtures";

const authFile = path.join(__dirname, ".auth", "user.json");
const mailhogUrl = process.env.MAILHOG_URL ?? "http://localhost:8025";

async function loginWithOptional2FA(context: BrowserContext) {
  const loginStarted = Date.now();
  let loginResponse = await context.request.post("/api/v1/auth/login", {
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  if (!loginResponse.ok()) {
    await expect(async () => {
      loginResponse = await context.request.post("/api/v1/auth/login", {
        data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
      });
      expect(loginResponse.ok()).toBeTruthy();
    }).toPass({ timeout: 120_000 });
  }

  const loginBody = (await loginResponse.json()) as {
    requires2FA?: boolean;
    challengeToken?: string;
  };

  if (loginBody.requires2FA && loginBody.challengeToken) {
    let otp: string | null = null;
    await expect(async () => {
      otp = await fetchLatestOtpFromMailhog(mailhogUrl, loginStarted);
      expect(otp).toBeTruthy();
    }).toPass({ timeout: 20_000 });

    const challenge = await context.request.post("/api/v1/auth/2fa/challenge", {
      data: { challengeToken: loginBody.challengeToken, otp },
    });
    expect(challenge.ok()).toBeTruthy();
  }
}

setup("authenticate demo user", async ({ page, context }) => {
  setup.setTimeout(120_000);
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await loginWithOptional2FA(context);

  let meResponse = await context.request.get("/api/v1/me");
  expect(meResponse.ok()).toBeTruthy();
  let me = await meResponse.json();
  const orgId = me.activeOrg?.id as string | undefined;
  expect(orgId).toBeTruthy();

  const upgrade = await context.request.patch(`/api/v1/organizations/${orgId}/subscription`, {
    data: { plan: "enterprise" },
  });
  expect(upgrade.ok()).toBeTruthy();
  meResponse = await context.request.get("/api/v1/me");
  expect(meResponse.ok()).toBeTruthy();
  me = await meResponse.json();
  expect(me.subscription?.plan).toBe("enterprise");
  expect(me.features).toContain("pos_payments");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/, { timeout: 30_000 });

  await context.storageState({ path: authFile });
});
