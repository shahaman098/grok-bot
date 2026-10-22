import { expect, test } from "@playwright/test";

test("Grok Bot connection page is readable on a narrow phone", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/me?*", (route) => route.fulfill({ json: { membership: { visible: true } } }));
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/connect/grok");
  await expect(
    page.getByRole("heading", { name: "Bring your Bot to the room." }),
  ).toBeVisible();
  await expect(page.getByText(/\/api\/mcp\. Call get_event/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Allow read-only access for one hour" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("link", { name: "Back to the event" }),
  ).toHaveAttribute("href", "/e/grok-bot-london");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("a browser without event membership gets a join link instead of a failing token button", async ({ page }) => {
  await page.route("**/api/me?*", (route) => route.fulfill({ status: 401, json: { error: "Unauthorized" } }));
  await page.goto("/connect/grok");
  await expect(page.getByRole("link", { name: "Join the event", exact: true })).toHaveAttribute("href", "/e/grok-bot-london");
  await expect(page.getByRole("button", { name: "Allow read-only access for one hour" })).toBeDisabled();
  await expect(page.getByText("Checking your event access…")).not.toBeVisible();
});

test("a hidden attendee can explicitly become visible and then create access", async ({ page }) => {
  let visible = false;
  let tokens = 0;
  await page.route("**/api/me?*", (route) => route.fulfill({ json: { membership: { visible } } }));
  await page.route("**/api/me", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ eventSlug: "grok-bot-london", visible: true });
    visible = true;
    await route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/bot-access", (route) => {
    tokens++;
    return route.fulfill({ json: { token: "test-credential", expiresAt: "2026-10-22T22:00:00Z" } });
  });
  await page.goto("/connect/grok");
  const allow = page.getByRole("button", { name: "Allow read-only access for one hour" });
  await expect(allow).toBeDisabled();
  await page.getByRole("button", { name: "Show my profile at this event" }).click();
  await expect(allow).toBeEnabled();
  expect(tokens).toBe(0);
  await allow.click();
  await expect(page.getByRole("status")).toContainText("connection is ready");
  await expect(page.getByRole("button", { name: "Copy Authorization value" })).toBeVisible();
  expect(tokens).toBe(1);
});

test("a visibility change during token creation shows the recovery action", async ({ page }) => {
  let visible = true;
  await page.route("**/api/me?*", (route) => route.fulfill({ json: { membership: { visible } } }));
  await page.route("**/api/bot-access", (route) => {
    visible = false;
    return route.fulfill({ status: 403, json: { error: "Become visible at this event first." } });
  });
  await page.goto("/connect/grok");
  await page.getByRole("button", { name: "Allow read-only access for one hour" }).click();
  await expect(page.getByRole("button", { name: "Show my profile at this event" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Updating…" })).not.toBeVisible();
});

test("a stalled token request times out and allows retry", async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/me?*", (route) => route.fulfill({ json: { membership: { visible: true } } }));
  await page.route("**/api/bot-access", () => {});
  await page.goto("/connect/grok");
  await page.getByRole("button", { name: "Allow read-only access for one hour" }).click();
  await expect(page.getByRole("button", { name: "Updating…" })).toBeDisabled();
  await page.clock.fastForward(10_001);
  await expect(page.getByRole("alert").filter({ hasText: "taking too long" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Allow read-only access for one hour" })).toBeEnabled();
});

test("an unavailable membership check can be retried without reloading", async ({ page }) => {
  let checks = 0;
  await page.route("**/api/me?*", (route) => {
    checks++;
    return checks === 1
      ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
      : route.fulfill({ json: { membership: { visible: true } } });
  });
  await page.goto("/connect/grok");
  const allow = page.getByRole("button", { name: "Allow read-only access for one hour" });
  await expect(allow).toBeDisabled();
  await page.getByRole("button", { name: "Check event access again" }).click();
  await expect(allow).toBeEnabled();
});
