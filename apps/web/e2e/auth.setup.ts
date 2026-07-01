import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { DEMO_EMAIL, DEMO_PASSWORD } from "./fixtures";

const authFile = path.join(__dirname, ".auth", "user.json");

setup("authenticate demo user", async ({ page, context }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

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

  const meResponse = await context.request.get("/api/v1/me");
  expect(meResponse.ok()).toBeTruthy();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);

  await context.storageState({ path: authFile });
});
