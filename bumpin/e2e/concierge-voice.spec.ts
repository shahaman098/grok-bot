import { expect, test, type Page, type WebSocketRoute } from "@playwright/test";
import { voiceSessionConfig } from "../lib/concierge/config";

// Run against a local server with Supabase public configuration; every auth,
// directory, token, model and audio operation below is simulated, not live.
test.skip(
  process.env.BUMPIN_VOICE_BROWSER_QA !== "1",
  "Requires the configured local QA server; no provider credentials are used.",
);

declare global {
  interface Window {
    conciergeQA: { stopped: number; closed: number };
  }
}
const attendees = [
  {
    membershipId: "self",
    displayName: "You",
    avatarSeed: "you",
    isSelf: true,
    building: "Events",
    canHelpWith: "Design",
    lookingFor: "Speech",
    displayLat: 51.4935,
    displayLng: -0.2255,
  },
  {
    membershipId: "ada",
    displayName: "Ada",
    avatarSeed: "ada",
    isSelf: false,
    building: "Audio agents",
    canHelpWith: "Speech recognition",
    lookingFor: "Design",
    displayLat: 51.4936,
    displayLng: -0.2258,
  },
  {
    membershipId: "bob",
    displayName: "Bob",
    avatarSeed: "bob",
    isSelf: false,
    building: "Voice tools",
    canHelpWith: "Audio engineering",
    lookingFor: "Design",
    displayLat: 51.4934,
    displayLng: -0.2257,
  },
];
const matches = attendees.slice(1).map((a, i) => ({
  membershipId: a.membershipId,
  displayName: a.displayName,
  reason: `Relevant offer of help: “${a.canHelpWith}”.`,
  score: 90 - i,
  source: "grok",
  category: "search",
  evidence: [
    {
      direction: "search",
      terms: [],
      yourExcerpt: "speech models",
      theirExcerpt: a.canHelpWith,
    },
  ],
  conversationStarter: "Tell me about your project",
  suggestedTask: "Compare goals",
}));

async function mockApp(page: Page, denyMic = false) {
  const now = Math.floor(Date.now() / 1000);
  const jwt =
    [
      { alg: "HS256", typ: "JWT" },
      {
        sub: "00000000-0000-4000-8000-000000000001",
        aud: "authenticated",
        role: "authenticated",
        iat: now,
        exp: now + 3600,
      },
    ]
      .map((v) => Buffer.from(JSON.stringify(v)).toString("base64url"))
      .join(".") + ".test-signature";
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "qa@example.invalid",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  await page.route("**/auth/v1/**", (r) => r.fulfill({ json: user }));
  await page.route("**/api/session", (r) =>
    r.fulfill({
      json: {
        access_token: jwt,
        refresh_token: "test-refresh",
        expires_in: 3600,
      },
    }),
  );
  await page.route("**/api/auth/linkedin", (r) =>
    r.fulfill({ json: { enabled: false } }),
  );
  await page.route("**/api/me?**", (r) =>
    r.fulfill({
      json: {
        membership: { visible: true },
        profile: attendees[0],
        identity: null,
      },
    }),
  );
  await page.route("**/api/events/*/attendees", (r) =>
    r.fulfill({ json: { attendees } }),
  );
  await page.route("**/api/connections?**", (r) =>
    r.fulfill({ json: { connections: [] } }),
  );
  await page.route("**/api/concierge/config*", (r) =>
    r.fulfill({ json: { voiceEnabled: true, access: "approved" } }),
  );
  await page.route("**/api/concierge/session", (r) =>
    r.fulfill({
      json: {
        token: "simulated-ephemeral",
        expiresAt: now + 60,
        model: "test-voice",
        session: voiceSessionConfig(),
      },
    }),
  );
  await page.route("**/api/concierge/search", (r) =>
    r.fulfill({ json: { matches, source: "grok" } }),
  );
  await page.route("https://api.maptiler.com/**", (r) =>
    r.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#17232b" },
          },
        ],
      },
    }),
  );
  await page.route("https://tile.openstreetmap.org/**", (r) =>
    r.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQklX+DwAB6QFSmw62xwAAAABJRU5ErkJggg==",
        "base64",
      ),
    }),
  );
  await page.routeWebSocket(/\/realtime\/v1\//, (socket) => socket.close());
  await page.addInitScript(
    ({ denyMic }) => {
      window.conciergeQA = { stopped: 0, closed: 0 };
      const track = {
        enabled: true,
        stop: () => {
          window.conciergeQA.stopped++;
        },
      };
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: async () => {
            if (denyMic)
              throw new DOMException("Permission denied", "NotAllowedError");
            return { getTracks: () => [track], getAudioTracks: () => [track] };
          },
        },
        configurable: true,
      });
      const node = () => ({ connect: () => {}, disconnect: () => {} });
      Object.defineProperty(window, "AudioContext", {
        value: class {
          sampleRate = 48000;
          audioWorklet = { addModule: async () => {} };
          destination = {};
          get currentTime() {
            return performance.now() / 1000;
          }
          resume() {
            return Promise.resolve();
          }
          close() {
            window.conciergeQA.closed++;
            return Promise.resolve();
          }
          createMediaStreamSource() {
            return node();
          }
          createGain() {
            return { ...node(), gain: { value: 0 } };
          }
          createBuffer(_channels: number, length: number, rate: number) {
            const data = new Float32Array(length);
            return { duration: length / rate, getChannelData: () => data };
          }
          createBufferSource() {
            const n = {
              ...node(),
              buffer: null,
              onended: null as (() => void) | null,
              start: () => setTimeout(() => n.onended?.(), 15),
              stop: () => {},
            };
            return n;
          }
        },
        configurable: true,
      });
      Object.defineProperty(window, "AudioWorkletNode", {
        value: class {
          port = { onmessage: null };
          connect() {}
          disconnect() {}
        },
        configurable: true,
      });
    },
    { denyMic },
  );
}

test("paid features show request access and keep a submitted request locked", async ({ page }, testInfo) => {
  await mockApp(page);
  let status = "required";
  let requests = 0;
  let tokens = 0;
  await page.route("**/api/concierge/config*", (r) => r.fulfill({ json: { voiceEnabled: false, access: status } }));
  await page.route("**/api/concierge/access", (r) => {
    requests++;
    expect(r.request().postDataJSON()).toEqual({ eventSlug: "grok-bot-london" });
    status = "pending";
    return r.fulfill({ json: { access: status } });
  });
  await page.route("**/api/concierge/session", (r) => { tokens++; return r.abort(); });
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Open voice concierge" }).click();
  await expect(page.getByRole("button", { name: "Request access", exact: true })).toBeEnabled();
  await page.screenshot({ path: `/tmp/bumpin-request-access-${testInfo.project.name}.png` });
  await page.getByRole("button", { name: "Request access", exact: true }).click();
  await expect(page.getByRole("button", { name: "Access requested", exact: true })).toBeDisabled();
  await expect(page.getByText(/Your request is pending approval/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start talking" })).toHaveCount(0);
  expect(requests).toBe(1);
  expect(tokens).toBe(0);
});

test("simulated live conversation produces map matches, supports a follow-up and releases the microphone", async ({
  page,
}) => {
  await mockApp(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let provider: WebSocketRoute | null = null;
  let responseCount = 0;
  const outputs: string[] = [];
  await page.routeWebSocket("wss://api.x.ai/**", (socket) => {
    provider = socket;
    socket.onMessage((message) => {
      const event = JSON.parse(String(message));
      if (event.type === "session.update")
        socket.send(
          JSON.stringify({ type: "session.updated", session: event.session }),
        );
      if (event.item?.type === "function_call_output")
        outputs.push(event.item.output);
      if (event.type === "response.create") {
        responseCount++;
        socket.send(JSON.stringify({ type: "response.created" }));
        socket.send(
          JSON.stringify({
            type: "response.output_audio_transcript.delta",
            item_id: `reply-${responseCount}`,
            delta:
              responseCount === 1
                ? "Who would you like to meet?"
                : "Ada offers help with speech recognition.",
          }),
        );
        socket.send(
          JSON.stringify({
            type: "response.output_audio.delta",
            item_id: `reply-${responseCount}`,
            delta: "AAAAAA==",
          }),
        );
        socket.send(
          JSON.stringify({
            type: "response.done",
            response: { status: "completed" },
          }),
        );
      }
    });
  });
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Open voice concierge" }).click();
  await page.getByRole("button", { name: "Start talking" }).click();
  await expect(
    page.getByRole("log", { name: "Conversation captions" }),
  ).toContainText("Who would you like to meet?");
  const emit = (event: unknown) =>
    (provider as unknown as WebSocketRoute).send(JSON.stringify(event));
  emit({ type: "input_audio_buffer.speech_started" });
  emit({ type: "input_audio_buffer.speech_stopped" });
  emit({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "request",
    transcript: "Find someone who understands speech models",
  });
  emit({ type: "response.created" });
  emit({
    type: "response.function_call_arguments.done",
    call_id: "find-1",
    name: "find_people",
    arguments: '{"query":"Find someone who understands speech models"}',
  });
  emit({ type: "response.done", response: { status: "completed" } });
  await expect(
    page.getByRole("region", { name: "Concierge matches" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Active voice concierge" }),
  ).toBeVisible();
  await expect
    .poll(() => outputs.some((value) => value.includes("Speech recognition")))
    .toBe(true);
  emit({ type: "input_audio_buffer.speech_started" });
  emit({ type: "response.created" });
  emit({
    type: "response.function_call_arguments.done",
    call_id: "focus-2",
    name: "focus_match",
    arguments: '{"membershipId":"bob"}',
  });
  emit({ type: "response.done", response: { status: "completed" } });
  await expect(
    page.getByRole("button", { name: "Highlight Bob on map" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-concierge-match="true"]')).toHaveCount(2);
  await expect(
    page.locator('[data-concierge-match="true"][aria-pressed="true"]'),
  ).toHaveAttribute("aria-label", "Open profile for Bob");
  await page.screenshot({
    path: `/tmp/bumpin-concierge-voice-${test.info().project.name}.png`,
    fullPage: true,
  });
  await expect(
    page.getByRole("region", { name: "Active voice concierge" }),
  ).toHaveCSS("position", "fixed");
  const callbar = await page.getByRole("region", { name:"Active voice concierge" }).boundingBox();
  const disclaimer = await page.locator(".map-disclaimer").boundingBox();
  expect(disclaimer!.y + disclaimer!.height).toBeLessThan(callbar!.y);
  await page.getByRole("button", { name: "Mute concierge microphone" }).click();
  await expect(
    page.getByRole("button", { name: "Unmute concierge microphone" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "End voice conversation" }).click();
  await expect(
    page.getByRole("region", { name: "Active voice concierge" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.conciergeQA.stopped)).toBe(1);
  expect(errors).toEqual([]);
});

test("microphone denial leaves typed search usable", async ({ page }) => {
  await mockApp(page, true);
  await page.goto("/e/grok-bot-london");
  await page.getByRole("button", { name: "Open voice concierge" }).click();
  await page.getByRole("button", { name: "Start talking" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Microphone permission was denied",
  );
  await page
    .getByRole("button", { name: "Who can help with React?", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Concierge matches" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.conciergeQA.closed)).toBeGreaterThan(
    0,
  );
});
