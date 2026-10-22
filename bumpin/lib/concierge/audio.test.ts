import { describe, expect, it } from "vitest";
import { pcm16, encodePcm } from "./audio";

describe("voice audio framing", () => {
  it("clips PCM and uses explicit little-endian bytes", () => {
    const samples = pcm16(new Float32Array([-2, -1, 0, 1, 2]), 24000);
    expect([...samples]).toEqual([-32768, -32768, 0, 32767, 32767]);
    expect([
      ...Uint8Array.from(atob(encodePcm(new Int16Array([0x1234, -1]))), (c) =>
        c.charCodeAt(0),
      ),
    ]).toEqual([0x34, 0x12, 0xff, 0xff]);
  });
  it("resamples mobile capture rates into 100ms 24kHz frames", () => {
    for (const rate of [44100, 48000]) {
      const input = new Float32Array(rate / 10).fill(0.5);
      const output = pcm16(input, rate);
      expect(output).toHaveLength(2400);
      expect(output[1200]).toBe(16384);
    }
  });
});
