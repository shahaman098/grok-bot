import { expect, test, type Page } from "@playwright/test";

const latitude = 51.52272, longitude = -0.16489;
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("bumpin-demo-identity", "private-self");
    localStorage.setItem("bumpin-demo-v2:grok-bot-london", JSON.stringify([
      { membershipId: "private-self", displayName: "You", avatarSeed: "you", visible: true,
        displayLat: 51.4935, displayLng: -0.2255 },
      { membershipId: "private-ada", displayName: "Ada", avatarSeed: "ada", visible: true,
        displayLat: 51.4936, displayLng: -0.2258 },
    ]));
  });
  await page.route("https://api.maptiler.com/**", (r) => r.fulfill({ json: {
    version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#17232b" } }],
  } }));
  await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({
    contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQklX+DwAB6QFSmw62xwAAAABJRU5ErkJggg==", "base64"),
  }));
});

async function location(page: Page, mode: "success" | "denied" | "unavailable" | "timeout" | "unsupported" | "late") {
  await page.addInitScript(({ mode, latitude, longitude }) => {
    const qa = { calls: 0, finish: () => {} };
    Object.assign(window, { privateLocationQA: qa });
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: mode === "unsupported" ? undefined : {
      getCurrentPosition: (success: PositionCallback, fail: PositionErrorCallback, options: PositionOptions) => {
        qa.calls++;
        if (options.timeout !== 10000 || options.maximumAge !== 0) throw new Error("Unbounded or cached location request");
        qa.finish = () => success({ coords: { latitude, longitude, accuracy: 35 } } as GeolocationPosition);
        if (mode === "success") queueMicrotask(qa.finish);
        else if (mode !== "late") queueMicrotask(() => fail({ code: mode === "denied" ? 1 : mode === "timeout" ? 3 : 2 } as GeolocationPositionError));
      },
    } });
  }, { mode, latitude, longitude });
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("button", { name: "Locate me", exact: true })).toBeEnabled({ timeout: 15_000 });
}

test("locates only after a tap, keeps the dot private, and can return to the venue or clear it", async ({ page }, testInfo) => {
  const mutations: string[] = [];
  page.on("request", (r) => { if (["POST", "PATCH", "PUT"].includes(r.method()) || new URL(r.url()).pathname.startsWith("/api/")) mutations.push(r.url() + (r.postData() ?? "")); });
  await location(page, "success");
  const calls = () => page.evaluate(() => (window as unknown as { privateLocationQA: { calls: number } }).privateLocationQA.calls);
  expect(await calls()).toBe(0);
  const marker = page.getByRole("img", { name: "Your approximate location, visible only to you" });
  await expect(marker).toHaveCount(0);
  await page.getByRole("button", { name: "Locate me", exact: true }).click();
  await expect(marker).toBeInViewport();
  await expect(page.getByText(/accuracy ±35 m/)).toBeVisible();
  expect(await calls()).toBe(1);
  const storage = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]));
  for (const value of [String(latitude), String(longitude)]) {
    expect(storage).not.toContain(value);
    expect(mutations.join("\n")).not.toContain(value);
  }
  await page.screenshot({ path: `/tmp/bumpin-private-location-${testInfo.project.name}.png` });
  await page.getByRole("button", { name: "Back to event venue" }).click();
  await expect(page.getByRole("button", { name: "Event venue", exact: true })).toBeInViewport();
  await page.getByRole("button", { name: "Hide my location" }).click();
  await expect(marker).toHaveCount(0);
  await expect(page.getByText("Your location is hidden.", { exact: true })).toHaveText("Your location is hidden.");
  await page.getByRole("button", { name: "Locate me", exact: true }).click();
  await expect(marker).toBeInViewport();
  await page.getByRole("button", { name: "People", exact: true }).click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(marker).toHaveCount(0);
  expect(await calls()).toBe(2);
});

for (const [mode, message] of [
  ["denied", /Location permission is blocked/],
  ["unavailable", /Your phone could not find a location/],
  ["timeout", /Location timed out/],
  ["unsupported", /Location is unavailable in this browser/],
] as const) {
  test(`location ${mode} explains recovery and preserves the venue map`, async ({ page }) => {
    await location(page, mode);
    await page.getByRole("button", { name: "Locate me", exact: true }).click();
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByRole("button", { name: "Locate me", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Event venue", exact: true })).toBeInViewport();
    await expect(page.getByRole("img", { name: "Your approximate location, visible only to you" })).toHaveCount(0);
  });
}

test("ignores a location callback after cancellation", async ({ page }) => {
  await location(page, "late");
  await page.getByRole("button", { name: "Locate me", exact: true }).click();
  await page.getByRole("button", { name: "Hide my location" }).click();
  await page.evaluate(() => (window as unknown as { privateLocationQA: { finish: () => void } }).privateLocationQA.finish());
  await expect(page.getByRole("img", { name: "Your approximate location, visible only to you" })).toHaveCount(0);
  await expect(page.getByText("Your location is hidden.", { exact: true })).toHaveText("Your location is hidden.");
});

test("private location fits a narrow phone and clears when the page backgrounds", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await location(page, "success");
  await page.getByRole("button", { name: "Locate me", exact: true }).click();
  const marker = page.getByRole("img", { name: "Your approximate location, visible only to you" });
  await expect(marker).toBeInViewport();
  for (const button of await page.getByRole("region", { name: "Your private map location" }).getByRole("button").all()) {
    await expect(button).toBeInViewport();
    const size = await button.boundingBox();
    expect(size!.width).toBeGreaterThanOrEqual(44);
    expect(size!.height).toBeGreaterThanOrEqual(44);
  }
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(marker).toHaveCount(0);
  await expect(page.getByText("Only you can see your location.", { exact: true })).toHaveText("Only you can see your location.");
});
