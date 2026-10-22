import { describe, expect, it, vi, afterEach } from "vitest";
import {
  createJoinIntent,
  hasJoinIntent,
  JOIN_INTENT_COOKIE,
} from "@/lib/auth/linkedin-intent";
afterEach(() => vi.useRealTimers());
describe("LinkedIn event intent", () => {
  it("binds automatic entry to the event, nonce and ten-minute window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T20:00:00Z"));
    const intent = createJoinIntent("grok-bot-london");
    const request = (nonce: string = intent.nonce, cookie = intent.value) =>
      new Request(`https://bumpin.test/auth/callback?joinIntent=${nonce}`, {
        headers: { cookie: `${JOIN_INTENT_COOKIE}=${cookie}` },
      });
    expect(hasJoinIntent(request(), "grok-bot-london")).toBe(true);
    expect(hasJoinIntent(request("wrong"), "grok-bot-london")).toBe(false);
    expect(hasJoinIntent(request(), "other")).toBe(false);
    expect(
      hasJoinIntent(request(intent.nonce, "invalid"), "grok-bot-london"),
    ).toBe(false);
    vi.setSystemTime(new Date("2026-10-22T20:11:00Z"));
    expect(hasJoinIntent(request(), "grok-bot-london")).toBe(false);
  });
});
