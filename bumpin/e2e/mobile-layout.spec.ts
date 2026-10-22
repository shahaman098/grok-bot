import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
  // Layout fixtures have no real account. Keep unrelated access polling local;
  // WebKit can report an in-flight network request as an error during reload.
  await page.route("**/api/concierge/config*", route => route.fulfill({
    json: { voiceEnabled: false, access: "required" },
  }));
  await page.addInitScript(() => {
    sessionStorage.setItem("bumpin-demo-identity", "phone-self");
    if (!localStorage.getItem("mobile-seeded")) {
      localStorage.setItem("mobile-seeded", "yes");
      localStorage.setItem(
        "bumpin-demo-v2:grok-bot-london",
        JSON.stringify([
          {
            membershipId: "phone-self",
            displayName: "You",
            avatarSeed: "you",
            visible: true,
            displayLat: 51.4935,
            displayLng: -0.2255,
          },
          {
            membershipId: "phone-ada",
            displayName: "Ada Lovelace",
            avatarSeed: "ada",
            building: "AI agents for better events",
            lookingFor: "Creative collaborators",
            linkedinUrl: "https://www.linkedin.com/in/example",
            visible: true,
            displayLat: 51.4936,
            displayLng: -0.2258,
          },
        ]),
      );
    }
  });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
]) {
  test(`people, profile and event controls fit ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/e/grok-bot-london");
    await expect(page).toHaveTitle(/BumpIn/);
    await expect(
      page.getByRole("heading", { name: "In good company." }),
    ).toBeVisible();
    await noOverflow(page);
    const nav = page.getByRole("navigation", { name: "Event navigation" });
    const bounds = await nav.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
    for (const button of await nav.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await page
      .getByRole("button", { name: "Open profile for Ada Lovelace" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Ada Lovelace", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Connect on LinkedIn", exact: true }),
    ).toBeInViewport();
    await noOverflow(page);
    await page.getByRole("button", { name: "Close profile" }).click();
    await page
      .getByRole("button", { name: "Event details", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "The event", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View event on Luma" }),
    ).toBeInViewport();
    await noOverflow(page);
    await page.getByRole("button", { name: "Close event details" }).click();
    await expect(nav).toBeVisible();
  });
}

test("minimal entry has no profile fields on a narrow phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.getByRole("button", { name: "Leave event", exact: true }).click();
  const guest = page.getByRole("button", { name: "Continue as guest" });
  await expect(guest).toBeEnabled();
  await expect(page.locator("input, textarea, select")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Join with LinkedIn" }),
  ).toBeVisible();
  await guest.scrollIntoViewIfNeeded();
  await expect(guest).toBeInViewport();
  await noOverflow(page);
});

test("long profiles wrap and the sheet body scrolls while actions stay reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/e/grok-bot-london");
  await page.evaluate(() => {
    const key = "bumpin-demo-v2:grok-bot-london";
    const pool = JSON.parse(localStorage.getItem(key) ?? "[]");
    pool[1].displayName = "A".repeat(80);
    pool[1].building = "B".repeat(200);
    pool[1].lookingFor = "C".repeat(200);
    localStorage.setItem(key, JSON.stringify(pool));
  });
  await page.reload();
  await page
    .getByRole("button", { name: `Open profile for ${"A".repeat(80)}` })
    .click();
  await expect(
    page.getByRole("button", { name: "Close profile" }),
  ).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "Connect on LinkedIn", exact: true }),
  ).toBeInViewport();
  expect(
    await page
      .locator(".sheet-body")
      .evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  await noOverflow(page);
});

test("matching works at keyboard-sized heights and reports an empty result", async ({
  page,
}) => {
  await page.goto("/e/grok-bot-london");
  // The query aliases now correctly match "event" to "events". Use unrelated
  // profile text so this scenario still exercises the actual empty state.
  await page.evaluate(() => {
    const key = "bumpin-demo-v2:grok-bot-london";
    const pool = JSON.parse(localStorage.getItem(key) ?? "[]");
    pool[1].building = "Mobile games";
    pool[1].lookingFor = "Designers";
    localStorage.setItem(key, JSON.stringify(pool));
  });
  await page.reload();
  await page.getByRole("button", { name: "Introductions – find people to meet", exact: true }).click();
  await page
    .getByText("Or search for a skill or project", { exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 400 });
  await page
    .getByRole("button", {
      name: "Who wants to collab on event tooling?",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "No matching attendees yet",
  );
  const input = page.getByRole("textbox", {
    name: "Who would you like to meet?",
  });
  await input.focus();
  await input.scrollIntoViewIfNeeded();
  await expect(input).toBeInViewport();
  await page
    .getByRole("button", { name: "Find a connection", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Find a connection", exact: true }),
  ).toBeInViewport();
  await noOverflow(page);
  await page.getByRole("button", { name: "Close matching" }).click();
});

test("home and QR pages fit a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Join the event" }),
  ).toBeVisible();
  await noOverflow(page);
  await page.goto("/qr");
  await expect(page.getByRole("link", { name: "Open event" })).toBeVisible();
  const eventUrl = `${new URL(page.url()).origin}/e/grok-bot-london`;
  await expect(
    page.getByRole("img", { name: "QR code for event join link" }),
  ).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(page.getByText(eventUrl, { exact: true })).toBeVisible();
  await noOverflow(page);
});
