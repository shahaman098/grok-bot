import { expect, test } from "@playwright/test";

// Seed membership to exercise the map lifecycle without submitting a signup.
// These tests run against a dedicated local build with Supabase env vars empty.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const slug = "grok-bot-london";
    const key = `bumpin-demo-v2:${slug}`;
    sessionStorage.setItem("bumpin-demo-identity", "demo-test-self");
    if (!localStorage.getItem("bumpin-test-seeded")) {
      localStorage.setItem("bumpin-test-seeded", "yes");
      localStorage.setItem(
        key,
        JSON.stringify([
          {
            membershipId: "demo-test-self",
            displayName: "Judge Demo",
            linkedinUrl: null,
            avatarSeed: "judge",
            building: "AI agents",
            lookingFor: "Designers",
            visible: true,
            displayLat: 51.4935,
            displayLng: -0.2255,
          },
          {
            membershipId: "demo-test-other",
            displayName: "Ada",
            linkedinUrl: null,
            avatarSeed: "ada",
            building: "AI agents",
            lookingFor: "Designers",
            visible: true,
            displayLat: 51.4936,
            displayLng: -0.2258,
          },
        ]),
      );
    }
  });
});

test("restores membership, preserves hidden profile, and removes the leaver", async ({
  page,
}) => {
  await page.goto("/e/grok-bot-london");
  await expect(
    page.getByRole("button", { name: "Visible", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("2 on map", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Visible", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hidden", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Hidden", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hidden", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const members = JSON.parse(
          localStorage.getItem("bumpin-demo-v2:grok-bot-london") ?? "[]",
        );
        return members.find(
          (m: { membershipId: string }) => m.membershipId === "demo-test-self",
        );
      }),
    )
    .toMatchObject({
      displayName: "Judge Demo",
      building: "AI agents",
      visible: true,
    });
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.getByRole("button", { name: "Leave event", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue as guest" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const members = JSON.parse(
          localStorage.getItem("bumpin-demo-v2:grok-bot-london") ?? "[]",
        );
        return members.map((m: { displayName: string }) => m.displayName);
      }),
    )
    .toEqual(["Ada"]);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Continue as guest" }),
  ).toBeEnabled();
});

test("offers rules-based matching and excludes your own profile", async ({
  page,
}) => {
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Introductions – find people to meet", exact: true }).click();
  await page
    .getByText("Or search for a skill or project", { exact: true })
    .click();
  await expect(page.getByText("Source: Rules-based matching")).toBeVisible();
  await page
    .getByRole("button", { name: "Who is building AI agents?", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Open profile for Ada", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Judge Demo", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Open profile for Ada", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ada", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close profile" }).click();
  await expect(
    page.getByRole("navigation", { name: "Event navigation" }),
  ).toBeVisible();
});

test("serves the map worker and keeps profiles usable when tiles fail", async ({
  page,
}) => {
  await page.route("https://demotiles.maplibre.org/**", (route) =>
    route.abort(),
  );
  await page.route("https://api.maptiler.com/**", (route) => route.abort());
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  const worker = await page.request.get("/maplibre/maplibre-gl-worker.mjs");
  expect(worker.ok()).toBe(true);
  expect(await worker.text()).toContain("MapLibre GL JS");
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByText(/Map unavailable/)).toBeVisible();
  await page
    .getByRole("button", { name: "Open profile for Ada", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ada", exact: true }),
  ).toBeVisible();
});
