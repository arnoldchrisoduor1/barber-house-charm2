import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { DEMO_EMAIL, DEMO_PASSWORD } from "./fixtures";

const authFile = path.join(__dirname, ".auth", "user.json");

setup("authenticate demo user", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/(admin|dashboard|portal)/, { timeout: 30_000 });
  await expect(page.locator("body")).not.toContainText("Login failed");

  await page.context().storageState({ path: authFile });
});
