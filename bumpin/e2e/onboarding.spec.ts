import { expect, test } from "@playwright/test";
test("entry has one LinkedIn action, a guest fallback and no profile form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/e/grok-bot-london");
  const linkedin = page.getByRole("button", { name: "Join with LinkedIn" });
  await expect(linkedin).toBeDisabled();
  await expect(linkedin).toBeInViewport();
  await expect(
    page.getByText("LinkedIn is being set up. Guest entry is ready."),
  ).toBeVisible();
  const guest = page.getByRole("button", {
    name: "Continue as guest",
    exact: true,
  });
  await expect(guest).toBeEnabled();
  await expect(guest).toBeInViewport();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.locator("form")).toHaveCount(0);
  await expect(
    page.getByText("Your guest name appears on the map. No details needed."),
  ).toBeVisible();
  await expect(
    page.getByText(/Joining puts you on the attendee map automatically/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // Inspect entry only; no registration or authorization is submitted in browser QA.
  await page.screenshot({
    path: "/tmp/bumpin-minimal-entry.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("cancelled LinkedIn sign-in returns a useful message without provider details", async ({
  page,
}) => {
  await page.goto(
    "/auth/callback?error=access_denied&error_description=private-provider-detail&eventSlug=https://evil.test",
  );
  await expect(page).toHaveURL(/\/e\/grok-bot-london\?signin=cancelled$/);
  await expect(page.locator(".error-note[role=alert]")).toContainText(
    "LinkedIn sign-in was cancelled",
  );
  await expect(
    page.getByRole("button", { name: "Continue as guest", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("body")).not.toContainText(
    "private-provider-detail",
  );
});
