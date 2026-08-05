import { expect, type BrowserContext } from "@playwright/test";

import { ensureAuthenticated } from "./ensure-auth";

export const SPA_ORG_SLUG = process.env.E2E_SPA_ORG_SLUG ?? "spa-demo-wellness";

/** Switch demo CEO session to spa org (requires spa seed). */
export async function switchToSpaOrg(context: BrowserContext) {
  await ensureAuthenticated(context);
  const res = await context.request.get("/api/v1/public/orgs?category=spa");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: Array<{ id?: string; slug?: string }> };
  const org = body.data?.find((o) => o.slug === SPA_ORG_SLUG);
  expect(org?.id).toBeTruthy();
  const select = await context.request.post("/api/v1/auth/select-org", { data: { orgId: org!.id } });
  expect(select.ok()).toBeTruthy();
}
