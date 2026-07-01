import { expect, type Page } from "@playwright/test";

import type { CrudFieldInput } from "../crud-manifest";

async function fillField(page: Page, field: CrudFieldInput) {
  const label = page.getByLabel(field.label, { exact: false });
  if (field.type === "select" && field.selectOption) {
    await label.click();
    await page.getByRole("option", { name: field.selectOption }).click();
    return;
  }
  await label.fill(field.value);
}

export async function waitForWorkspace(page: Page) {
  await expect(page.getByText(/loading workspace/i)).toHaveCount(0, { timeout: 60_000 });
  await expect(page.getByText(/loading admin console/i)).toHaveCount(0, { timeout: 60_000 });
}

export async function crudCreateEditDelete(
  page: Page,
  opts: {
    path: string;
    createFields: CrudFieldInput[];
    editFields?: CrudFieldInput[];
    rowMatch: string | RegExp;
  },
) {
  await page.goto(opts.path);
  await waitForWorkspace(page);

  await page.getByRole("button", { name: /add new/i }).click();
  for (const field of opts.createFields) {
    await fillField(page, field);
  }
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText(/created/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 10_000 });

  const row = page.getByRole("row").filter({ hasText: opts.rowMatch });
  await expect(row.first()).toBeVisible({ timeout: 15_000 });

  if (opts.editFields?.length) {
    await row.first().getByRole("button", { name: /^edit$/i }).click();
    for (const field of opts.editFields) {
      await fillField(page, field);
    }
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/updated/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 10_000 });
  }

  await row.first().getByRole("button", { name: /^delete$/i }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: /^confirm$/i }).click();
  await expect(page.getByText(/deleted/i)).toBeVisible({ timeout: 15_000 });
}
