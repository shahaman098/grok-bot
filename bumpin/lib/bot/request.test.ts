import { afterEach, expect, it, vi } from "vitest";
import { requestBotJson } from "./request";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("preserves HTTP status so membership failures can show a recovery action", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Become visible first" }, { status: 403 })));
  await expect(requestBotJson("/api/bot-access")).rejects.toMatchObject({ status: 403, message: "Become visible first" });
});

it.each(["response", "body"])("times out a stalled %s and clears its timer", async (stage) => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => {
    const pending = () => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    });
    return stage === "response" ? pending() : Promise.resolve({ ok: true, json: pending });
  }));
  const result = requestBotJson("/api/bot-access");
  const assertion = expect(result).rejects.toThrow("taking too long");
  await vi.advanceTimersByTimeAsync(10_000);
  await assertion;
  expect(vi.getTimerCount()).toBe(0);
});

it("offers a retry message for a broken connection instead of a raw browser error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  await expect(requestBotJson("/api/me")).rejects.toThrow("Check your connection and try again");
});
