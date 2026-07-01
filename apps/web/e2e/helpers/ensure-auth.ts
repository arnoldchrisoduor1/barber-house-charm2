import { expect, type BrowserContext } from "@playwright/test";

import { DEMO_EMAIL, DEMO_PASSWORD } from "../fixtures";

/** Refresh session cookies — use before authenticated tests in long suites. */
export async function ensureAuthenticated(context: BrowserContext) {
  const res = await context.request.post("/api/v1/auth/login", {
    data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
}
