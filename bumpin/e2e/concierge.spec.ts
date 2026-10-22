import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/concierge/config*", (r) =>
    r.fulfill({ json: { voiceEnabled: false, access: "required" } }),
  );
  await page.addInitScript(() => {
    sessionStorage.setItem("bumpin-demo-identity", "concierge-self");
    localStorage.setItem(
      "bumpin-demo-v2:grok-bot-london",
      JSON.stringify([
        {
          membershipId: "concierge-self",
          displayName: "You",
          avatarSeed: "you",
          visible: true,
          canHelpWith: "Design",
          lookingFor: "React",
          building: "Events",
          displayLat: 51.4935,
          displayLng: -0.2255,
        },
        {
          membershipId: "concierge-ada",
          displayName: "Ada",
          avatarSeed: "ada",
          visible: true,
          canHelpWith: "React development",
          lookingFor: "Design",
          building: "Voice agents",
          displayLat: 51.4936,
          displayLng: -0.2258,
        },
      ]),
    );
  });
});

test("typed concierge finds people, explains the match and opens their map card", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Open voice concierge" }).click();
  await expect(
    page.getByRole("heading", { name: "Your networking concierge" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Request access", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Who can help with React?", exact: true })
    .click();
  const matches = page.getByRole("region", { name: "Concierge matches" });
  await expect(matches).toBeVisible();
  await expect(matches.getByText("Ada", { exact: true })).toBeVisible();
  await expect(matches.getByText(/Matched profile terms/)).toBeVisible();
  await matches
    .getByRole("button", { name: "Open matched profile for Ada" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ada", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close profile" }).click();
  await page.getByRole("button", { name: "Clear match highlights" }).click();
  await expect(matches).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("match cards remain usable after tile failure and disappear when an attendee hides", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
  await page.route("https://api.maptiler.com/**", (r) => r.abort());
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Open voice concierge" }).click();
  await page
    .getByRole("button", { name: "Who can help with React?", exact: true })
    .click();
  await expect(page.getByText(/Map unavailable/)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Concierge matches" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const key = "bumpin-demo-v2:grok-bot-london";
    const people = JSON.parse(localStorage.getItem(key) ?? "[]");
    people[1].visible = false;
    localStorage.setItem(key, JSON.stringify(people));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
  await expect(
    page.getByRole("region", { name: "Concierge matches" }),
  ).toHaveCount(0);
});

test("concierge fits narrow screens and keeps the existing introductions accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/e/grok-bot-london");
  const nav = page.getByRole("navigation", { name: "Event navigation" });
  for (const button of await nav.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Open voice concierge" }).click();
  await expect(
    page.getByRole("button", { name: "Close concierge" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close concierge" }).click();
  await page.getByRole("button", { name: "Find people to meet" }).click();
  await expect(
    page.getByRole("heading", { name: "Love at First Bot" }),
  ).toBeVisible();
});
