import { expect, type BrowserContext, type Page } from "@playwright/test";

import { ensureAuthenticated } from "./ensure-auth";
import { waitForWorkspace } from "./crud";

export const THERAPY_ORG_SLUG = process.env.E2E_THERAPY_ORG_SLUG ?? "therapy-demo-practice";

export async function switchToTherapyOrg(context: BrowserContext) {
  await ensureAuthenticated(context);
  const res = await context.request.get("/api/v1/public/orgs?category=therapy");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: Array<{ id?: string; slug?: string }> };
  const org = body.data?.find((o) => o.slug === THERAPY_ORG_SLUG);
  expect(org?.id).toBeTruthy();
  const select = await context.request.post("/api/v1/auth/select-org", { data: { orgId: org!.id } });
  expect(select.ok()).toBeTruthy();
  const me = await context.request.get("/api/v1/me");
  expect(me.ok()).toBeTruthy();
  const meBody = (await me.json()) as {
    activeOrg?: { id?: string; slug?: string; businessType?: string };
    features?: string[];
  };
  expect(meBody.activeOrg?.slug).toBe(THERAPY_ORG_SLUG);
  expect(meBody.activeOrg?.businessType).toBe("therapy");
  expect(meBody.features ?? []).toContain("therapy_notes");
  return meBody.activeOrg!;
}

export async function openTherapyWorkspace(page: Page, context: BrowserContext) {
  const org = await switchToTherapyOrg(context);
  await page.goto("/dashboard");
  await waitForWorkspace(page);
  await expect(page.getByText(/Haus of Therapy/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("html")).toHaveClass(/theme-therapy/);
  return org;
}
