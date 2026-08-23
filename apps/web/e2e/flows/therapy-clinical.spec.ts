import { test, expect } from "@playwright/test";

import { openTherapyWorkspace } from "../helpers/therapy-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Therapy clinical parity (HT2)", () => {
  test("session notes edit and delete via API + page", async ({ page, context }) => {
    const org = await openTherapyWorkspace(page, context);
    const customers = await context.request.get(`/api/v1/organizations/${org.id}/customers`);
    expect(customers.ok()).toBeTruthy();
    const custBody = (await customers.json()) as { data?: Array<{ id?: string; ID?: string }> };
    const customerId = custBody.data?.[0]?.id ?? custBody.data?.[0]?.ID;
    expect(customerId).toBeTruthy();

    const created = await context.request.post(`/api/v1/organizations/${org.id}/session-notes`, {
      data: {
        customer_id: customerId,
        session_date: new Date().toISOString().slice(0, 10),
        title: "CBT intake note",
        content: "Initial assessment completed.",
        focus_area: "Anxiety",
        pressure_level: "Calm",
        oils_used: "CBT psychoeducation",
        next_visit_notes: "Homework: journal",
      },
    });
    expect(created.status()).toBe(201);
    const row = (await created.json()) as { id?: string; ID?: string };
    const id = String(row.id ?? row.ID);

    await page.goto("/session-notes");
    await waitForWorkspace(page);
    await expect(page.getByTestId("session-notes-page")).toBeVisible();
    await expect(page.getByTestId(`session-note-${id}`)).toBeVisible();

    const updated = await context.request.put(`/api/v1/organizations/${org.id}/session-notes/${id}`, {
      data: {
        customer_id: customerId,
        session_date: new Date().toISOString().slice(0, 10),
        title: "CBT intake note (edited)",
        content: "Updated assessment.",
        focus_area: "Anxiety",
      },
    });
    expect(updated.ok()).toBeTruthy();
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByText(/cbt intake note \(edited\)/i).first()).toBeVisible();

    const del = await context.request.delete(`/api/v1/organizations/${org.id}/session-notes/${id}`);
    expect(del.status()).toBe(204);
    await page.reload();
    await waitForWorkspace(page);
    await expect(page.getByTestId(`session-note-${id}`)).toHaveCount(0);
  });

  test("progress tracking CRUD via API + page", async ({ page, context }) => {
    const org = await openTherapyWorkspace(page, context);
    const customers = await context.request.get(`/api/v1/organizations/${org.id}/customers`);
    expect(customers.ok()).toBeTruthy();
    const custBody = (await customers.json()) as { data?: Array<{ id?: string; ID?: string }> };
    const customerId = custBody.data?.[0]?.id ?? custBody.data?.[0]?.ID;
    expect(customerId).toBeTruthy();

    const created = await context.request.post(`/api/v1/organizations/${org.id}/progress-tracking`, {
      data: {
        customer_id: customerId,
        metric_name: "PHQ-9",
        metric_value: "8",
        notes: "Mild improvement",
        recorded_at: new Date().toISOString().slice(0, 10),
      },
    });
    expect(created.status()).toBe(201);
    const row = (await created.json()) as { id?: string; ID?: string };
    const id = String(row.id ?? row.ID);

    await page.goto("/progress-tracking");
    await waitForWorkspace(page);
    await expect(page.getByTestId("progress-tracking-page")).toBeVisible();
    await expect(page.getByText(/client progress/i).first()).toBeVisible();
    await expect(page.getByTestId(`progress-${id}`)).toBeVisible();
    await expect(page.getByText(/phq-9/i).first()).toBeVisible();

    const del = await context.request.delete(`/api/v1/organizations/${org.id}/progress-tracking/${id}`);
    expect(del.status()).toBe(204);
  });

  test("therapy consent types", async ({ page, context }) => {
    const org = await openTherapyWorkspace(page, context);
    const created = await context.request.post(`/api/v1/organizations/${org.id}/consent-forms`, {
      data: {
        title: "Counselling agreement form",
        form_type: "counselling",
        content: "Client agrees to counselling terms.",
        is_signed: false,
      },
    });
    expect(created.ok()).toBeTruthy();

    await page.goto("/consent-forms");
    await waitForWorkspace(page);
    await expect(page.getByText(/intake & consent/i).first()).toBeVisible();
    await expect(page.getByText(/counselling agreement form/i).first()).toBeVisible();

    await page.getByRole("button", { name: /new form/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").nth(0).click();
    await expect(page.getByRole("option", { name: /counselling agreement/i })).toBeVisible({ timeout: 10_000 });
  });
});
