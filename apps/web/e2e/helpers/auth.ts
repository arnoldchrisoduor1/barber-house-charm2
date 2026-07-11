import { expect, type Page } from "@playwright/test";

import { DEMO_EMAIL, DEMO_PASSWORD } from "../fixtures";

export async function login(page: Page, email = DEMO_EMAIL, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
  await page.getByRole("button", { name: /sign in/i }).click();
}

export async function loginAndWait(page: Page, email = DEMO_EMAIL, password = DEMO_PASSWORD) {
  await login(page, email, password);
  await expect(page).toHaveURL(/\/(admin|dashboard|portal)/, { timeout: 30_000 });
  await expect(page.locator("body")).not.toContainText("Login failed");
}

export async function submitOtpStep(page: Page, otp: string) {
  await page.getByLabel(/verification code/i).fill(otp);
  await page.getByRole("button", { name: /verify/i }).click();
  await expect(page).toHaveURL(/\/(admin|dashboard|portal)/, { timeout: 30_000 });
}

export async function logout(page: Page) {
  await page.goto("/login");
  // Session cleared via API if settings has logout — navigate and clear cookies
  await page.context().clearCookies();
}

export async function fetchLatestOtpFromMailhog(
  mailhogUrl = "http://localhost:8025",
  afterMs?: number,
): Promise<string | null> {
  try {
    const res = await fetch(`${mailhogUrl}/api/v2/messages?limit=10`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: { Created?: string; Content?: { Body?: string } }[];
    };
    for (const item of data.items ?? []) {
      if (afterMs && item.Created) {
        const created = Date.parse(item.Created);
        if (!Number.isNaN(created) && created < afterMs) continue;
      }
      const body = item.Content?.Body ?? "";
      const match = body.match(/\b(\d{6})\b/);
      if (match?.[1]) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchLatestVerificationTokenFromMailhog(
  mailhogUrl = "http://localhost:8025",
  recipientEmail?: string,
): Promise<string | null> {
  try {
    const url = recipientEmail
      ? `${mailhogUrl}/api/v2/search?kind=to&query=${encodeURIComponent(recipientEmail)}`
      : `${mailhogUrl}/api/v2/messages?limit=5`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: { Content?: { Body?: string } }[] };
    for (const item of data.items ?? []) {
      const body = item.Content?.Body ?? "";
      const match = body.match(/verify-email\?token=([a-f0-9]+)/i);
      if (match?.[1]) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchLatestInviteTokenFromMailhog(
  mailhogUrl = "http://localhost:8025",
): Promise<string | null> {
  try {
    const res = await fetch(`${mailhogUrl}/api/v2/messages?limit=5`);
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: { Content?: { Body?: string } }[] };
    for (const item of data.items ?? []) {
      const body = item.Content?.Body ?? "";
      const match = body.match(/accept-invite\?token=([a-f0-9]+)/i);
      if (match?.[1]) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}
