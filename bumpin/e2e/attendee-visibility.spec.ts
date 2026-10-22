import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("bumpin-demo-identity", "visibility-self");
    const key = "bumpin-demo-v2:grok-bot-london";
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([
      { membershipId: "visibility-self", displayName: "Alex", avatarSeed: "alex", visible: true,
        building: "Event tools", canHelpWith: "Design", lookingFor: "React",
        displayLat: 51.4934, displayLng: -0.2251 },
      { membershipId: "visibility-ada", displayName: "Ada", avatarSeed: "ada", visible: true,
        building: "Voice agents", canHelpWith: "React development", lookingFor: "Design partners",
        linkedinUrl: "https://www.linkedin.com/in/example", displayLat: 51.4937, displayLng: -0.2260 },
      { membershipId: "visibility-hidden", displayName: "Hidden member", avatarSeed: "hidden", visible: false,
        displayLat: 51.4936, displayLng: -0.2258 },
    ]));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 51.52272, longitude: -0.16489, accuracy: 25 } } as GeolocationPosition),
    } });
  });
  await page.route("**/api/concierge/config*", r => r.fulfill({ json: { voiceEnabled: false, access: "required" } }));
  await page.route("https://api.maptiler.com/**", r => r.fulfill({ json: {
    version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#210e16" } }],
  } }));
  await page.route("https://tile.openstreetmap.org/**", r => r.fulfill({ contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQklX+DwAB6QFSmw62xwAAAABJRU5ErkJggg==", "base64"),
  }));
});

test("shows your profile alongside others and reveals all supplied details", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/e/grok-bot-london");
  await expect(page).toHaveTitle(/BumpIn/);
  await expect(page.getByText("2 on map", { exact: true })).toBeVisible();
  const self = page.getByRole("button", { name: "Open profile for Alex", exact: true });
  const other = page.getByRole("button", { name: "Open profile for Ada", exact: true });
  await expect(self).toContainText("Alex · You");
  await expect(other).toContainText("Building: Voice agents");
  await expect(other).toContainText("Can help: React development");
  await expect(other).toContainText("Looking for: Design partners");
  const directLink = page.getByRole("link", { name: "Connect with Ada on LinkedIn", exact: true });
  await expect(directLink).toHaveAttribute("href", "https://www.linkedin.com/in/example");
  await expect(directLink).toHaveAttribute("target", "_blank");
  await expect(directLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByRole("button", { name: "Add your LinkedIn link", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Connect with Alex on LinkedIn" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open profile for Hidden member" })).toHaveCount(0);
  await other.click();
  const profile = page.getByRole("dialog");
  await expect(profile.getByText("Voice agents", { exact: true })).toBeVisible();
  await expect(profile.getByText("React development", { exact: true })).toBeVisible();
  await expect(profile.getByText("Design partners", { exact: true })).toBeVisible();
  await expect(profile.getByRole("link", { name: "Connect on LinkedIn", exact: true })).toHaveAttribute("href", "https://www.linkedin.com/in/example");
  await page.getByRole("button", { name: "Close profile" }).click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("button", { name: "Locate me", exact: true })).toBeEnabled();
  await expect(self).toBeInViewport();
  await expect(self).toContainText("Alex · You");
  await expect(other).toBeInViewport();
  await expect(other).toContainText("Ada");
  await self.click();
  await expect(page.getByRole("dialog").getByText("You · visible at this event", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close profile" }).click();
  await page.screenshot({ path: `/tmp/bumpin-attendees-together-${testInfo.project.name}.png` });
  await other.click();
  await expect(page.getByRole("heading", { name: "Ada", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close profile" }).click();
  await page.getByRole("button", { name: "Locate me", exact: true }).click();
  await expect(page.getByRole("img", { name: "Your approximate location, visible only to you" })).toBeInViewport();
  await page.getByRole("button", { name: "Back to event venue" }).click();
  await expect(self).toBeInViewport();
  await expect(other).toBeInViewport();
  await page.getByRole("button", { name: "View profiles · 2", exact: true }).click();
  await expect(other).toContainText("Can help: React development");
  expect(errors).toEqual([]);
});

test("hiding and showing removes and restores you on both attendees' screens", async ({ page, context }) => {
  await page.goto("/e/grok-bot-london");
  const observer = await context.newPage();
  await observer.addInitScript(() => sessionStorage.setItem("bumpin-demo-identity", "visibility-ada"));
  await observer.goto("/e/grok-bot-london");
  const ownCard = page.getByRole("button", { name: "Open profile for Alex", exact: true });
  const observedCard = observer.getByRole("button", { name: "Open profile for Alex", exact: true });
  await expect(ownCard).toBeVisible();
  await expect(observedCard).toBeVisible();
  await page.getByRole("button", { name: "Visible", exact: true }).click();
  await expect(ownCard).toHaveCount(0);
  await expect(observedCard).toHaveCount(0);
  await expect(page.getByText("1 on map", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Hidden", exact: true }).click();
  await expect(ownCard).toBeVisible();
  await expect(observedCard).toBeVisible();
  await observer.close();
});

test("offers-only profiles and empty profiles are explained on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/e/grok-bot-london");
  await page.evaluate(() => {
    const key = "bumpin-demo-v2:grok-bot-london";
    const members = JSON.parse(localStorage.getItem(key) ?? "[]");
    members[0].building = members[0].canHelpWith = members[0].lookingFor = null;
    members[1].building = members[1].lookingFor = null;
    localStorage.setItem(key, JSON.stringify(members));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
  await expect(page.getByRole("button", { name: "Open profile for Alex" })).toContainText("Add your project, offers and needs in Introductions.");
  const other = page.getByRole("button", { name: "Open profile for Ada", exact: true });
  await expect(other).toContainText("Can help: React development");
  await other.click();
  await expect(page.getByRole("dialog").getByText("React development", { exact: true })).toBeVisible();
  await expect(page.getByText(/No profile details shared yet/)).toHaveCount(0);
  await page.getByRole("button", { name: "Close profile" }).click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("button", { name: "Locate me", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "View profiles · 2", exact: true })).toBeInViewport();
  const profilesBox = await page.getByRole("button", { name: "View profiles · 2", exact: true }).boundingBox();
  expect(profilesBox!.x + profilesBox!.width).toBeLessThanOrEqual(320);
  await expect(page.getByRole("button", { name: "Back to event venue" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("full shared profile has a safe LinkedIn link and updates while open", async ({ page }, testInfo) => {
  if (testInfo.project.name === "mobile-chrome") await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Open profile for Ada", exact: true }).click();
  const profile = page.getByRole("dialog");
  await expect(profile.getByText("Full shared profile · visible to this event")).toBeVisible();
  await expect(profile.getByRole("heading", { name: "SKILLS & HELP OFFERED" })).toBeVisible();
  const link = profile.getByRole("link", { name: "Connect on LinkedIn", exact: true });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(profile.getByText(/Choose Connect on their LinkedIn profile to send a connection request/)).toBeVisible();
  await expect(profile.getByText(/Work history and skills are not automatically imported/)).toBeVisible();
  await expect(profile.getByText("Edit your LinkedIn link")).toHaveCount(0);
  await expect(profile).toBeInViewport({ ratio: 0.95 });
  await expect(link).toBeInViewport({ ratio: 1 });
  await expect.poll(() => profile.evaluate(el => getComputedStyle(el).transform))
    .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  await page.screenshot({ path: `/tmp/bumpin-full-profile-${testInfo.project.name}.png` });
  await page.evaluate(() => {
    const key = "bumpin-demo-v2:grok-bot-london";
    const members = JSON.parse(localStorage.getItem(key) ?? "[]");
    members[1].linkedinUrl = null;
    localStorage.setItem(key, JSON.stringify(members));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
  await expect(link).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Connect with Ada on LinkedIn", exact: true })).toHaveCount(0);
  await expect(profile.getByText("This attendee hasn’t shared a LinkedIn profile link yet.")).toBeVisible();
  await page.evaluate(() => {
    const key = "bumpin-demo-v2:grok-bot-london";
    const members = JSON.parse(localStorage.getItem(key) ?? "[]");
    members[1].visible = false;
    localStorage.setItem(key, JSON.stringify(members));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
  await expect(profile).toHaveCount(0);
});

test("direct LinkedIn action opens the shared profile and rejects unsafe links", async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await context.route("https://www.linkedin.com/**", route => route.fulfill({
    contentType: "text/html", body: "<title>LinkedIn profile fixture</title>",
  }));
  await page.goto("/e/grok-bot-london");
  const link = page.getByRole("link", { name: "Connect with Ada on LinkedIn", exact: true });
  await expect(link).toBeVisible();
  await page.screenshot({ path: `/tmp/bumpin-linkedin-people-${testInfo.project.name}.png` });
  const popupReady = page.waitForEvent("popup");
  await link.click();
  const popup = await popupReady;
  await expect(popup).toHaveURL("https://www.linkedin.com/in/example");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await popup.close();
  await page.evaluate(() => {
    const key = "bumpin-demo-v2:grok-bot-london";
    const members = JSON.parse(localStorage.getItem(key) ?? "[]");
    members[0].linkedinUrl = "linkedin.com/in/self?trk=event";
    members[1].linkedinUrl = "https://linkedin.com.evil.test/in/person";
    localStorage.setItem(key, JSON.stringify(members));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
  await expect(link).toHaveCount(0);
  await expect(page.getByText("LinkedIn link not shared yet", { exact: true })).toBeVisible();
  const ownLink = page.getByRole("link", { name: "View your LinkedIn profile", exact: true });
  await expect(ownLink).toHaveAttribute("href", "https://www.linkedin.com/in/self");
  await page.getByRole("button", { name: "Open profile for Ada", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("link")).toHaveCount(0);
  await page.getByRole("button", { name: "Close profile", exact: true }).click();
  await page.getByRole("button", { name: "Open profile for Alex", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "View your LinkedIn profile", exact: true })).toHaveAttribute("href", "https://www.linkedin.com/in/self");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("only your own profile offers optional LinkedIn link sharing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Open profile for Alex", exact: true }).click();
  const profile = page.getByRole("dialog");
  await profile.getByText("Add your LinkedIn link", { exact: true }).click();
  await expect(profile.getByRole("textbox", { name: "Your LinkedIn profile URL" })).toBeVisible();
  await expect(profile.getByRole("button", { name: "Save LinkedIn link" })).toBeVisible();
  await expect(profile.getByText(/Optional. Other attendees can open this link/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Close profile" }).click();
  await page.getByRole("button", { name: "Open profile for Ada", exact: true }).click();
  await expect(profile.getByRole("textbox")).toHaveCount(0);
});
