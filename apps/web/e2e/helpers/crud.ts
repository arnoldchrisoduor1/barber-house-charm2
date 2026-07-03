import { expect, type Page } from "@playwright/test";

import type { CrudFieldInput } from "../crud-manifest";

const DEFAULT_ADD_BUTTON = /^(add new|add staff|add client|add service|add product|add review|new campaign|add seat)/i;
const DEFAULT_SUCCESS = /created|added|updated|deleted|recorded|submitted/i;

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

async function clickCreate(page: Page, addButton?: RegExp) {
  const pattern = addButton ?? DEFAULT_ADD_BUTTON;
  await page.getByRole("button", { name: pattern }).first().click();
}

async function saveForm(page: Page) {
  await page.getByRole("button", { name: /^save$/i }).click();
}

async function expectSuccess(page: Page, successPattern?: RegExp) {
  const pattern = successPattern ?? DEFAULT_SUCCESS;
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: pattern });
  await expect(toast.or(page.getByText(pattern)).first()).toBeVisible({ timeout: 15_000 });
  const dialog = page.getByRole("dialog");
  if ((await dialog.count()) > 0) {
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0, { timeout: 10_000 });
  }
}

async function locateItem(page: Page, rowMatch: string | RegExp) {
  const row = page.getByRole("row").filter({ hasText: rowMatch });
  if ((await row.count()) > 0) {
    return { kind: "row" as const, locator: row.first() };
  }
  const card = page.locator(".glass").filter({ hasText: rowMatch });
  await expect(card.first()).toBeVisible({ timeout: 15_000 });
  return { kind: "card" as const, locator: card.first() };
}

async function editItem(
  page: Page,
  item: { kind: "row" | "card"; locator: ReturnType<Page["getByRole"]> },
  editFields: CrudFieldInput[],
) {
  if (item.kind === "row") {
    await item.locator.getByRole("button", { name: /^edit$/i }).click();
  } else {
    const editButton = item.locator.getByRole("button", { name: /^edit$/i });
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
    } else {
      await item.locator.click();
    }
  }

  for (const field of editFields) {
    await fillField(page, field);
  }
  await saveForm(page);
  await expectSuccess(page);
}

async function deleteItem(page: Page, item: { kind: "row" | "card"; locator: ReturnType<Page["getByRole"]> }) {
  page.once("dialog", (dialog) => dialog.accept());

  if (item.kind === "row") {
    await item.locator.getByRole("button", { name: /^delete$/i }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: /^confirm$/i }).click();
  } else {
    await item.locator.getByRole("button", { name: /^delete$/i }).click();
  }

  await expectSuccess(page);
}

export async function crudCreateEditDelete(
  page: Page,
  opts: {
    path: string;
    createFields: CrudFieldInput[];
    editFields?: CrudFieldInput[];
    rowMatch: string | RegExp;
    addButton?: RegExp;
    supportsDelete?: boolean;
    successPattern?: RegExp;
  },
) {
  await page.goto(opts.path);
  await waitForWorkspace(page);

  await clickCreate(page, opts.addButton);
  for (const field of opts.createFields) {
    await fillField(page, field);
  }
  await saveForm(page);
  await expectSuccess(page, opts.successPattern);

  const item = await locateItem(page, opts.rowMatch);

  if (opts.editFields?.length) {
    await editItem(page, item, opts.editFields);
  }

  if (opts.supportsDelete !== false) {
    const refreshed = await locateItem(page, opts.rowMatch);
    await deleteItem(page, refreshed);
  }
}
