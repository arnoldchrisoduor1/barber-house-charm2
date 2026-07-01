import { test } from "@playwright/test";

import { assertRouteLoads } from "../helpers/assert-route";
import { DASHBOARD_NAV_ROUTES } from "../generated/nav-routes";

for (const route of DASHBOARD_NAV_ROUTES) {
  test(`dashboard route loads: ${route}`, async ({ page }) => {
    await assertRouteLoads(page, route);
  });
}
