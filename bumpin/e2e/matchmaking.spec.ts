import { expect, test, type Page } from "@playwright/test";
const slug = "grok-bot-london";
async function seed(page: Page, identity: string) {
  await page.addInitScript((id) => {
    sessionStorage.setItem("bumpin-demo-identity", id);
    if (!localStorage.getItem("love-seeded")) {
      localStorage.setItem("love-seeded", "yes");
      localStorage.setItem(
        "bumpin-demo-v2:grok-bot-london",
        JSON.stringify([
          {
            membershipId: "alice",
            displayName: "Alice",
            avatarSeed: "alice",
            canHelpWith: "React development",
            lookingFor: "Product design",
            building: "AI agents for events",
            visible: true,
            displayLat: 51.4935,
            displayLng: -0.2255,
            linkedinUrl: null,
          },
          {
            membershipId: "bob",
            displayName: "Bob",
            avatarSeed: "bob",
            canHelpWith: "Product design",
            lookingFor: "React developers",
            building: "AI event tools",
            visible: true,
            displayLat: 51.4936,
            displayLng: -0.2258,
            linkedinUrl: null,
          },
        ]),
      );
    }
  }, identity);
  await page.goto(`/e/${slug}`);
  await page.getByRole("button", { name: "Find people to meet" }).click();
}
async function request(page: Page) {
  await page
    .getByRole("button", { name: "Find my collaborator", exact: true })
    .click();
  await expect(
    page.getByText("You can help each other", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Matched terms: design, product", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Request introduction", exact: true })
    .click();
  await expect(page.locator(".connection-state")).toHaveText("Waiting for reply");
}
test("two attendees mutually accept, approve a joke and reveal; revocation clears stage", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page, "alice");
  const other = await context.newPage();
  other.on("pageerror", (e) => errors.push(e.message));
  await seed(other, "bob");
  await request(page);
  await expect(
    other.getByRole("button", { name: "Let’s connect", exact: true }),
  ).toBeVisible();
  await other
    .getByRole("button", { name: "Let’s connect", exact: true })
    .click();
  await expect(page.getByText("It’s a match. Go say hello.")).toBeVisible();
  await expect(other.getByText("It’s a match. Go say hello.")).toBeVisible();
  await expect(page.locator(".conversation-starter")).toContainText(
    "Our profiles connect around",
  );
  await expect(other.locator(".connection-card > .first-date")).toContainText(
    "ten minutes",
  );
  await page
    .getByText("Take this match to the big screen", { exact: true })
    .click();
  await other
    .getByText("Take this match to the big screen", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "My superpower? Turning one good idea into 47 open tabs.",
      exact: true,
    })
    .click();
  await expect(other.locator(".stage-preview blockquote")).toContainText(
    "47 open tabs",
  );
  await page
    .getByRole("button", { name: "Approve this exact stage preview" })
    .click();
  await expect(
    other.getByRole("link", { name: /Open big-screen reveal/ }),
  ).toHaveCount(0);
  await other
    .getByRole("button", { name: "Approve this exact stage preview" })
    .click();
  const stagePath = await page
    .getByRole("link", { name: /Open big-screen reveal/ })
    .getAttribute("href");
  const stage = await context.newPage();
  stage.on("pageerror", (e) => errors.push(e.message));
  await stage.setViewportSize({ width: 1440, height: 1100 });
  await stage.goto(stagePath!);
  await expect(stage).toHaveTitle(/Love at First Bot/);
  await expect(
    stage.getByRole("button", { name: "Reveal the match" }),
  ).toBeVisible();
  await expect(
    stage.getByRole("heading", { name: "Alice", exact: true }),
  ).toHaveCount(0);
  await stage.getByRole("button", { name: "Reveal the match" }).click();
  await expect(
    stage.getByRole("heading", { name: "Alice", exact: true }),
  ).toBeVisible();
  await expect(
    stage.getByRole("heading", { name: "Bob", exact: true }),
  ).toBeVisible();
  await expect(stage.getByText("IT’S A MATCH!", { exact: true })).toBeVisible();
  await expect(stage.getByRole("link", { name: /LinkedIn/ })).toHaveCount(0);
  await expect
    .poll(() =>
      stage
        .locator(".reveal-content")
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe("1");
  await stage.screenshot({
    path: `/tmp/bumpin-love-stage-${info.project.name}.png`,
    fullPage: true,
  });
  await page.screenshot({
    path: `/tmp/bumpin-love-phone-${info.project.name}.png`,
    fullPage: false,
  });
  await other.getByRole("button", { name: "Revoke stage permission" }).click();
  await expect(
    stage.getByRole("heading", { name: "The stage is waiting." }),
  ).toBeVisible({ timeout: 7000 });
  await expect(
    stage.getByRole("heading", { name: "Alice", exact: true }),
  ).toHaveCount(0);
  await page.bringToFront();
  await expect(
    page.getByRole("link", { name: /Open big-screen reveal/ }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("failed acceptance preserves pending state; refresh restores the request", async ({
  page,
  context,
}) => {
  await seed(page, "alice");
  await request(page);
  const other = await context.newPage();
  await seed(other, "bob");
  await other.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("bumpin-connections"))
        throw new Error("Storage unavailable (test)");
      return original.call(this, key, value);
    };
  });
  await other
    .getByRole("button", { name: "Let’s connect", exact: true })
    .click();
  await expect(other.getByRole("alert")).toContainText("Storage unavailable");
  await expect(page.locator(".connection-state")).toHaveText("Waiting for reply");
  await expect(other.getByText("It’s a match. Go say hello.")).toHaveCount(0);
  await other.reload();
  await other.getByRole("button", { name: "Find people to meet" }).click();
  await other
    .getByRole("button", { name: "Let’s connect", exact: true })
    .click();
  await expect(page.getByText("It’s a match. Go say hello.")).toBeVisible();
});
test("stage stays private without mutual approval and supports reduced motion", async ({
  page,
}) => {
  await seed(page, "alice");
  await request(page);
  const id = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("bumpin-connections-v1:grok-bot-london") ?? "[]",
      )[0].id as string,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/e/${slug}/show/${id}`);
  await expect(
    page.getByRole("heading", { name: "The stage is waiting." }),
  ).toBeVisible();
  await expect(page.getByText("Alice", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Bob", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
