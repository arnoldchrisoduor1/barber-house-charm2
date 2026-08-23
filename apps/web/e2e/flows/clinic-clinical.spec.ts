import { test, expect } from "@playwright/test";

import { openClinicWorkspace } from "../helpers/clinic-auth";
import { waitForWorkspace } from "../helpers/crud";

test.describe("Clinic clinical parity (HA2)", () => {
  test("patient intake CRUD via API + page", async ({ page, context }) => {
    const org = await openClinicWorkspace(page, context);
    const customers = await context.request.get(`/api/v1/organizations/${org.id}/customers`);
    expect(customers.ok()).toBeTruthy();
    const custBody = (await customers.json()) as { data?: Array<{ id?: string; ID?: string }> };
    const customerId = custBody.data?.[0]?.id ?? custBody.data?.[0]?.ID;
    expect(customerId).toBeTruthy();

    const created = await context.request.post(`/api/v1/organizations/${org.id}/patient-intake`, {
      data: {
        customer_id: customerId,
        medical_history: "No prior surgeries",
        allergies: "Lidocaine",
        medications: "None",
        emergency_contact_name: "Jane Doe",
        emergency_contact_phone: "+254700000001",
        consent_given: true,
        notes: "E2E intake",
      },
    });
    expect(created.status()).toBe(201);
    const row = (await created.json()) as { id?: string; ID?: string };
    const id = String(row.id ?? row.ID);
    expect(id).toBeTruthy();

    await page.goto("/patient-intake");
    await waitForWorkspace(page);
    await expect(page.getByTestId("patient-intake-page")).toBeVisible();
    await expect(page.getByTestId(`patient-intake-${id}`)).toBeVisible();
    await expect(page.getByText(/lidocaine/i).first()).toBeVisible();

    const del = await context.request.delete(`/api/v1/organizations/${org.id}/patient-intake/${id}`);
    expect(del.status()).toBe(204);
  });

  test("aftercare template CRUD via API + page", async ({ page, context }) => {
    const org = await openClinicWorkspace(page, context);
    const created = await context.request.post(`/api/v1/organizations/${org.id}/aftercare-instructions`, {
      data: {
        title: "Post-Botox Care",
        body: "Avoid rubbing treated area for 24h.",
        procedure_name: "Botox",
        is_template: true,
      },
    });
    expect(created.status()).toBe(201);
    const row = (await created.json()) as { id?: string; ID?: string };
    const id = String(row.id ?? row.ID);

    await page.goto("/aftercare");
    await waitForWorkspace(page);
    await expect(page.getByTestId("aftercare-page")).toBeVisible();
    await expect(page.getByTestId(`aftercare-${id}`)).toBeVisible();
    await expect(page.getByText(/post-botox care/i).first()).toBeVisible();

    const del = await context.request.delete(`/api/v1/organizations/${org.id}/aftercare-instructions/${id}`);
    expect(del.status()).toBe(204);
  });

  test("consent liability types and signed state", async ({ page, context }) => {
    const org = await openClinicWorkspace(page, context);
    const created = await context.request.post(`/api/v1/organizations/${org.id}/consent-forms`, {
      data: {
        title: "Botox liability form",
        form_type: "botox_liability",
        content: "Patient acknowledges botox risks.",
        is_signed: true,
      },
    });
    expect(created.ok()).toBeTruthy();
    const pending = await context.request.post(`/api/v1/organizations/${org.id}/consent-forms`, {
      data: {
        title: "Laser liability draft",
        form_type: "laser_liability",
        content: "Pending laser consent.",
        is_signed: false,
      },
    });
    expect(pending.ok()).toBeTruthy();

    await page.goto("/consent-forms");
    await waitForWorkspace(page);
    await expect(page.getByTestId("consent-forms-page")).toBeVisible();
    await expect(page.getByText(/consent & liability/i).first()).toBeVisible();
    await expect(page.getByText(/botox liability form/i).first()).toBeVisible();
    await expect(page.getByText(/laser liability draft/i).first()).toBeVisible();
    await expect(page.getByTestId("consent-signed-count")).toContainText(/signed/i);
    await expect(page.getByTestId("consent-pending-count")).toContainText(/pending/i);

    await page.getByRole("button", { name: /new form/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").nth(0).click();
    for (const label of [/botox liability/i, /fillers liability/i, /laser liability/i, /chemical peel liability/i]) {
      await expect(page.getByRole("option", { name: label })).toBeVisible();
    }
  });

  test("clinic nav exposes consultations patch tests photos resources", async ({ page, context }) => {
    await openClinicWorkspace(page, context);
    await expect(page.getByRole("link", { name: /consultation notes/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /patch tests/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /before & after photos/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /treatment rooms/i })).toBeVisible();
  });
});
