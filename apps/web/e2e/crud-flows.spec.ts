import { test } from "@playwright/test";

import { CRUD_MANIFEST } from "./crud-manifest";
import { getDemoCustomerId } from "./helpers/demo-org";
import { ensureAuthenticated } from "./helpers/ensure-auth";
import { crudCreateEditDelete } from "./helpers/crud";
import { uniqueName } from "./helpers/unique";

const CUSTOMER_ID_PATHS = new Set(["/referrals", "/reviews"]);

test.beforeEach(async ({ context }) => {
  await ensureAuthenticated(context);
});

for (const entry of CRUD_MANIFEST) {
  test(`CRUD lifecycle: ${entry.path}`, async ({ page, context }) => {
    const unique = uniqueName(entry.prefix);
    let createFields = entry.createFields(unique);

    if (CUSTOMER_ID_PATHS.has(entry.path)) {
      const customerId = await getDemoCustomerId(context.request);
      createFields = createFields.map((field) =>
        /customer id/i.test(field.label) ? { ...field, value: customerId } : field,
      );
    }

    await crudCreateEditDelete(page, {
      path: entry.path,
      createFields,
      editFields: entry.editFields?.(unique),
      rowMatch: entry.rowMatch(unique),
      addButton: entry.addButton,
      supportsDelete: entry.supportsDelete,
    });
  });
}
