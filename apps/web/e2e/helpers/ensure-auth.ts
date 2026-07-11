import { expect, type BrowserContext } from "@playwright/test";

import { fetchLatestOtpFromMailhog } from "./auth";
import { DEMO_EMAIL, DEMO_PASSWORD, STAFF_DEMO_EMAIL, STAFF_DEMO_PASSWORD } from "../fixtures";

const mailhogUrl = process.env.MAILHOG_URL ?? "http://localhost:8025";

/** Refresh session cookies — use before authenticated tests in long suites. */
export async function ensureAuthenticated(context: BrowserContext) {
  const loginStarted = Date.now();
  const res = await context.request.post("/api/v1/auth/login", {
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();

  const body = (await res.json()) as { requires2FA?: boolean; challengeToken?: string };
  if (body.requires2FA && body.challengeToken) {
    let otp: string | null = null;
    await expect(async () => {
      otp = await fetchLatestOtpFromMailhog(mailhogUrl, loginStarted);
      expect(otp).toBeTruthy();
    }).toPass({ timeout: 20_000 });

    const challenge = await context.request.post("/api/v1/auth/2fa/challenge", {
      data: { challengeToken: body.challengeToken, otp },
    });
    expect(challenge.ok()).toBeTruthy();
  }
}

/** Staff demo user session (linked Alex Barber profile). */
export async function ensureStaffAuthenticated(context: BrowserContext) {
  const res = await context.request.post("/api/v1/auth/login", {
    data: { email: STAFF_DEMO_EMAIL, password: STAFF_DEMO_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
}
