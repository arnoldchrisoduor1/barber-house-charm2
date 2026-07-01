import { test } from "@playwright/test";

import { assertRouteLoads } from "../helpers/assert-route";
import { PUBLIC_ROUTES } from "../generated/nav-routes";

for (const route of PUBLIC_ROUTES) {
  test(`public route loads: ${route}`, async ({ page }) => {
    await assertRouteLoads(page, route);
  });
}
