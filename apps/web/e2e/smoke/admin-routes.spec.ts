import { test } from "@playwright/test";

import { assertRouteLoads } from "../helpers/assert-route";
import { ADMIN_ROUTES, EXTRA_AUTHENTICATED_ROUTES } from "../generated/nav-routes";

for (const route of ADMIN_ROUTES) {
  test(`admin route loads: ${route}`, async ({ page }) => {
    await assertRouteLoads(page, route);
  });
}

for (const route of EXTRA_AUTHENTICATED_ROUTES) {
  test(`authenticated route loads: ${route}`, async ({ page }) => {
    await assertRouteLoads(page, route);
  });
}
