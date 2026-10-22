import { describe, expect, it, vi, afterEach } from "vitest";
import { semanticMatches, validateSemanticMatches } from "./matching";
import { parseVoiceTool } from "./tools";
import { availableMatches } from "./available-matches";
import type { PublicAttendee } from "@/lib/types";

const ada: PublicAttendee = {
  membershipId: "ada",
  displayName: "Ada",
  avatarSeed: "ada",
  linkedinUrl: "https://www.linkedin.com/in/ada",
  displayLat: 51.5,
  displayLng: -0.2,
  building: "Audio agents",
  canHelpWith: "Speech recognition and React",
  lookingFor: "A designer",
};
const result = {
  intent: "expertise",
  matches: [
    {
      membershipId: "ada",
      field: "canHelpWith",
      quote: "Speech recognition",
      relevance: 90,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("evidence-grounded semantic matching", () => {
  it("drops stale evidence when an offer is removed or moved into a need", () => {
    const matches = validateSemanticMatches(result, [ada], "speech models");
    expect(availableMatches(matches, [ada])).toHaveLength(1);
    expect(
      availableMatches(matches, [
        { ...ada, canHelpWith: null, lookingFor: "Speech recognition" },
      ]),
    ).toEqual([]);
    expect(availableMatches(matches, [])).toEqual([]);
  });
  it("keeps the real identity and quotes for a paraphrased skill", () => {
    expect(
      validateSemanticMatches(
        result,
        [ada],
        "Someone who understands speech models",
      )[0],
    ).toMatchObject({
      membershipId: "ada",
      displayName: "Ada",
      source: "grok",
      category: "search",
      evidence: [{ theirExcerpt: "Speech recognition" }],
    });
  });
  it("rejects invented/hidden IDs, self matches, duplicate IDs and invented quotes", () => {
    expect(() => validateSemanticMatches(result, [], "speech")).toThrow();
    expect(() =>
      validateSemanticMatches(result, [{ ...ada, isSelf: true }], "speech"),
    ).toThrow();
    expect(() =>
      validateSemanticMatches(
        { ...result, matches: [result.matches[0], result.matches[0]] },
        [ada],
        "speech",
      ),
    ).toThrow();
    expect(() =>
      validateSemanticMatches(
        {
          ...result,
          matches: [{ ...result.matches[0], quote: "I built Whisper" }],
        },
        [ada],
        "speech",
      ),
    ).toThrow();
  });
  it("does not turn a person's need into expertise", () => {
    const request = {
      ...result,
      matches: [
        { ...result.matches[0], field: "lookingFor", quote: "A designer" },
      ],
    };
    expect(() =>
      validateSemanticMatches(request, [ada], "Find a designer"),
    ).toThrow("need is not expertise");
    expect(
      validateSemanticMatches(
        { ...request, intent: "shared-interest" },
        [ada],
        "Others looking for designers",
      )[0].reason,
    ).toContain("rather than expertise");
  });
  it("preserves genuine no-match responses", () => {
    expect(
      validateSemanticMatches(
        { intent: "expertise", matches: [] },
        [ada],
        "quantum optics",
      ),
    ).toEqual([]);
  });
  it("sends only profile fields and validates structured provider responses", async () => {
    vi.stubEnv("XAI_API_KEY", "test-provider-key");
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(result) }],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const matches = await semanticMatches([ada], "speech models");
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    const data = JSON.parse(body.input[1].content);
    expect(data.profiles[0]).toEqual({
      membershipId: "ada",
      building: "Audio agents",
      canHelpWith: "Speech recognition and React",
      lookingFor: "A designer",
    });
    expect(body.store).toBe(false);
    expect(matches[0].evidence[0].theirExcerpt).toBe("Speech recognition");
  });
  it("rejects provider failures without exposing their response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("sensitive provider response", { status: 401 }),
        ),
    );
    await expect(semanticMatches([ada], "speech")).rejects.toThrow(
      "Semantic provider unavailable",
    );
  });
});
describe("voice tool boundary", () => {
  it("only permits bounded search and focus inputs", () => {
    expect(
      parseVoiceTool("find_people", { query: "  voice models  " }),
    ).toEqual({ name: "find_people", query: "voice models" });
    expect(() => parseVoiceTool("send_message", { target: "ada" })).toThrow();
    expect(() =>
      parseVoiceTool("find_people", {
        query: "speech",
        eventSlug: "another-event",
      }),
    ).toThrow();
    expect(() => parseVoiceTool("find_people", { query: " " })).toThrow();
    expect(() =>
      parseVoiceTool("find_people", { query: "a".repeat(301) }),
    ).toThrow();
  });
});
