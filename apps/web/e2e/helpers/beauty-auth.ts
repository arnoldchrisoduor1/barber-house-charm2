import { expect, type BrowserContext } from "@playwright/test";

import { ensureAuthenticated } from "./ensure-auth";

export const BEAUTY_ORG_SLUG = process.env.E2E_BEAUTY_ORG_SLUG ?? "beauty-demo-salon";

/** Switch demo CEO session to beauty org (requires beauty seed). */
export async function switchToBeautyOrg(context: BrowserContext) {
  await ensureAuthenticated(context);
  const res = await context.request.get("/api/v1/public/orgs?category=beauty");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: Array<{ id?: string; slug?: string }> };
  const org = body.data?.find((o) => o.slug === BEAUTY_ORG_SLUG);
  expect(org?.id).toBeTruthy();
  const select = await context.request.post("/api/v1/auth/select-org", { data: { orgId: org!.id } });
  expect(select.ok()).toBeTruthy();
}
