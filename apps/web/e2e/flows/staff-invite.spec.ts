import { expect, test } from "@playwright/test";

import { ensureAuthenticated } from "../helpers/ensure-auth";
import { fetchLatestInviteTokenFromMailhog } from "../helpers/auth";
import { waitForWorkspace } from "../helpers/crud";
import { uniqueEmail, uniqueName } from "../helpers/unique";

test.describe("Staff invite flow", () => {
  test.beforeEach(async ({ context }) => {
    await ensureAuthenticated(context);
  });

  test("business owner invites staff and invitee accepts account", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const mailhogUrl = process.env.MAILHOG_URL ?? "http://localhost:8025";
    const inviteEmail = uniqueEmail("staff-invite");
    const inviteName = uniqueName("Invited Staff");

    await page.goto("/staff");
    await waitForWorkspace(page);
    await page.getByTestId("invite-staff-btn").click();
    await expect(page.getByTestId("staff-invite-form")).toBeVisible();
    await page.getByLabel(/^email$/i).fill(inviteEmail);
    await page.getByLabel(/display name/i).fill(inviteName);
    await page.getByTestId("staff-invite-role").click();
    await page.getByRole("option", { name: /staff/i }).click();
    await page.getByRole("button", { name: /save|invite|send/i }).click();
    await expect(page.getByText(/invite sent/i)).toBeVisible({ timeout: 15_000 });

    let token: string | null = null;
    await expect(async () => {
      token = await fetchLatestInviteTokenFromMailhog(mailhogUrl);
      expect(token).toBeTruthy();
    }).toPass({ timeout: 20_000 });

    const inviteContext = await browser.newContext();
    const invitePage = await inviteContext.newPage();
    await invitePage.goto(`/accept-invite?token=${token}`);
    await invitePage.getByLabel(/full name/i).fill(inviteName);
    await invitePage.getByLabel(/^password$/i).fill("StaffPass123!");
    await invitePage.getByRole("button", { name: /accept invite/i }).click();
    await expect(invitePage).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await inviteContext.close();
  });
});
