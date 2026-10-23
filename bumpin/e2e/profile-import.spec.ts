import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { strToU8, zipSync } from "fflate";

// Use the user's required form skill; CI can supply the same script explicitly.
const formSkill = process.env.BUMPIN_FORM_FILL_MODULE ?? resolve(homedir(), ".codex/skills/react-form-fill/scripts/form-fill.mjs");
async function review(page: Page, values: Record<string, string>, info: TestInfo) {
  const { fillForm } = await import(pathToFileURL(formSkill).href);
  const entries = Object.entries(values);
  for (let i = 0; i < entries.length; i += 4) {
    const answers = Object.fromEntries(entries.slice(i, i + 4));
    const dry = await fillForm(page, answers, { dryRun: true });
    expect(dry.ok, JSON.stringify(dry.report)).toBe(true);
    const result = await fillForm(page, answers);
    await info.attach(`review-form-${i}`, { body: JSON.stringify(result), contentType: "application/json" });
    expect(result.ok, JSON.stringify(result.report)).toBe(true);
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("bumpin-demo-identity", "import-self");
    const key = "bumpin-demo-v2:grok-bot-london";
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([
      { membershipId: "import-self", displayName: "Alex", avatarSeed: "alex", visible: true,
        building: "Event tools", canHelpWith: "Design", lookingFor: "React", displayLat: 51.4934, displayLng: -0.2251 },
      { membershipId: "import-other", displayName: "Ada", avatarSeed: "ada", visible: true,
        displayLat: 51.4937, displayLng: -0.2260, professionalProfile: { headline: "Product designer", about: "Builds accessible products", skills: "UX, Research", experience: "Example Studio", education: "Example College" } },
    ]));
  });
  await page.route("**/api/concierge/config*", route => route.fulfill({ json: { voiceEnabled: false, access: "required" } }));
});

test("a real PDF is parsed locally into a private, editable review and can be discarded", async ({ page }, info) => {
  const writes: string[] = [];
  page.on("request", request => { if (request.method() === "PATCH" || request.method() === "POST") writes.push(request.url()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Open profile for Alex", exact: true }).click();
  await page.getByText("Import your LinkedIn profile", { exact: true }).click();
  await page.getByLabel("Your LinkedIn profile files").setInputFiles(resolve("e2e/fixtures/linkedin-profile.pdf"));
  await expect(page.getByRole("heading", { name: "Review before sharing" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue("Software engineer");
  await expect(page.getByLabel("Skills", { exact: true })).toHaveValue("React\nTypeScript");
  await expect(page.getByLabel("Experience", { exact: true })).toHaveValue("Acme\nSoftware Engineer\n2022 - 2025\nShipped useful APIs.");
  await expect(page.getByLabel("About", { exact: true })).toHaveValue("I build accessible event tools.");
  await expect(page.getByLabel("Education", { exact: true })).toHaveValue("Example University\nBSc Computer Science");
  await review(page, { Headline: "Software engineer · React", About: "I build accessible event tools.", Skills: "React\nTypeScript", Experience: "Acme\nSoftware Engineer\n2022 - 2025\nShipped useful APIs.", Education: "Example University\nBSc Computer Science" }, info);
  await expect(page.getByRole("button", { name: "Save reviewed profile", exact: true })).toBeEnabled();
  await page.getByRole("heading", { name: "Review before sharing" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/tmp/bumpin-profile-import-review-${info.project.name}.png` });
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("bumpin-demo-v2:grok-bot-london") ?? "[]")[0].professionalProfile)).toBeUndefined();
  await page.getByRole("button", { name: "Discard draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review before sharing" })).toHaveCount(0);
  await page.getByRole("button", { name: "Close profile", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open profile for Alex", exact: true })).not.toContainText("Software engineer");
  expect(writes).toEqual([]);
});

test("ZIP exports support review and malformed replacements preserve saved details", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/e/grok-bot-london");
  const zip = zipSync({ "Profile.csv": strToU8('Headline,Summary\nEngineer,"Tools, for people"'), "Skills.csv": strToU8("Name\nReact\nRust"), "Messages.csv": strToU8("Private correspondence") });
  await page.getByRole("button", { name: "Open profile for Alex", exact: true }).click();
  await page.getByText("Import your LinkedIn profile", { exact: true }).click();
  await page.getByLabel("Your LinkedIn profile files").setInputFiles({ name: "LinkedIn-export.zip", mimeType: "application/zip", buffer: Buffer.from(zip) });
  await expect(page.getByRole("heading", { name: "Review before sharing" })).toBeVisible();
  await review(page, { Headline: "Engineer", About: "Tools, for people", Skills: "React, Rust" }, info);
  await page.getByLabel("Your LinkedIn profile files").setInputFiles({ name: "invalid.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a pdf") });
  await expect(page.getByRole("alert")).toContainText("not a valid PDF");
  await expect(page.getByLabel("Headline", { exact: true })).toHaveValue("Engineer");
  await expect(page.getByLabel("About", { exact: true })).toHaveValue("Tools, for people");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Discard draft", exact: true }).click();
  await page.getByRole("button", { name: "Close profile", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Open profile for Alex", exact: true })).not.toContainText("Engineer");
});

test("saved imported details appear in People and profiles without exposing another attendee's editor", async ({ page }) => {
  await page.goto("/e/grok-bot-london");
  const other = page.getByRole("button", { name: "Open profile for Ada", exact: true });
  await expect(other).toContainText("Product designer");
  await expect(other).toContainText("Skills: UX, Research");
  await other.click();
  const profile = page.getByRole("dialog");
  for (const value of ["Product designer", "Builds accessible products", "UX, Research", "Example Studio", "Example College"]) await expect(profile.getByText(value, { exact: true })).toBeVisible();
  await expect(profile.getByText("Import your LinkedIn profile", { exact: true })).toHaveCount(0);
  await expect(profile.getByText("Manage imported profile", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close profile", exact: true }).click();
  await page.reload();
  await expect(other).toContainText("Product designer");
});
