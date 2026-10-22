import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConciergeVoiceSession } from "./voice-session";
import { IDLE_LIMIT_MS, SESSION_LIMIT_MS } from "./config";

class TestSocket {
  readyState = 1;
  onopen: WebSocket["onopen"] = null;
  onmessage: WebSocket["onmessage"] = null;
  onerror: WebSocket["onerror"] = null;
  onclose: WebSocket["onclose"] = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
  });
  open() {
    this.onopen?.call(this as unknown as WebSocket, new Event("open"));
  }
  emit(event: unknown) {
    this.onmessage?.call(
      this as unknown as WebSocket,
      new MessageEvent("message", { data: JSON.stringify(event) }),
    );
  }
  events() {
    return this.send.mock.calls.map(([data]) => JSON.parse(data));
  }
}
function fixture() {
  const socket = new TestSocket();
  let capture: (chunk: string) => void = () => {};
  const audio = {
    prepare: vi.fn(async (callback: (chunk: string) => void) => {
      capture = callback;
    }),
    play: vi.fn(),
    interrupt: vi.fn(
      () => null as { itemId: string; audioEndMs: number } | null,
    ),
    mute: vi.fn(),
    close: vi.fn(),
  };
  const state = vi.fn(),
    caption = vi.fn(),
    error = vi.fn(),
    tool = vi.fn().mockResolvedValue({ matches: [] });
  const session = new ConciergeVoiceSession({
    onState: state,
    onCaption: caption,
    onError: error,
    tool,
    audioFactory: () => audio,
    socketFactory: () => socket,
    setup: async () => ({
      token: "ephemeral",
      model: "test-model",
      session: { instructions: "BumpIn prompt" },
    }),
  });
  async function ready() {
    await session.start("event");
    socket.open();
    socket.emit({
      type: "session.updated",
      session: { instructions: "BumpIn prompt" },
    });
  }
  return {
    session,
    socket,
    audio,
    state,
    caption,
    error,
    tool,
    ready,
    capture: () => capture,
  };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("live voice lifecycle", () => {
  it("waits for our session configuration before streaming microphone samples", async () => {
    const f = fixture();
    await f.session.start("event");
    f.socket.open();
    f.socket.emit({ type: "session.updated", session: { instructions: "" } });
    f.capture()("early-audio");
    expect(
      f.socket.events().some((e) => e.type === "input_audio_buffer.append"),
    ).toBe(false);
    f.socket.emit({
      type: "session.updated",
      session: { instructions: "BumpIn prompt" },
    });
    f.capture()("ready-audio");
    expect(f.socket.events()).toContainEqual({
      type: "input_audio_buffer.append",
      audio: "ready-audio",
    });
    f.session.stop();
  });
  it("replaces cumulative transcripts rather than duplicating them", async () => {
    const f = fixture();
    await f.ready();
    f.socket.emit({
      type: "conversation.item.input_audio_transcription.updated",
      item_id: "1",
      transcript: "Find",
    });
    f.socket.emit({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "1",
      transcript: "Find React developers",
    });
    expect(f.caption).toHaveBeenLastCalledWith({
      id: "user:1",
      role: "user",
      text: "Find React developers",
    });
    f.session.stop();
  });
  it("cancels playback and truncates the heard portion on interruption", async () => {
    const f = fixture();
    await f.ready();
    f.socket.emit({ type: "response.created" });
    f.audio.interrupt.mockReturnValue({ itemId: "spoken", audioEndMs: 250 });
    f.socket.emit({ type: "input_audio_buffer.speech_started" });
    expect(f.socket.events()).toContainEqual({ type: "response.cancel" });
    expect(f.socket.events()).toContainEqual({
      type: "conversation.item.truncate",
      item_id: "spoken",
      content_index: 0,
      audio_end_ms: 250,
    });
    f.socket.emit({
      type: "response.output_audio.delta",
      item_id: "spoken",
      delta: "stale-audio",
    });
    expect(f.audio.play).not.toHaveBeenCalled();
    f.session.stop();
  });
  it("submits all parallel tool outputs before asking for the next response", async () => {
    const f = fixture();
    await f.ready();
    const resolvers: ((value: unknown) => void)[] = [];
    f.tool.mockImplementation(
      () => new Promise((resolve) => resolvers.push(resolve)),
    );
    f.socket.emit({ type: "response.created" });
    for (const id of ["a", "b"])
      f.socket.emit({
        type: "response.function_call_arguments.done",
        call_id: id,
        name: "find_people",
        arguments: '{"query":"speech"}',
      });
    f.socket.emit({ type: "response.done", response: { status: "completed" } });
    await vi.advanceTimersByTimeAsync(0);
    const before = f.socket
      .events()
      .filter((e) => e.type === "response.create").length;
    resolvers[0]({ matches: [] });
    await vi.advanceTimersByTimeAsync(0);
    expect(
      f.socket.events().filter((e) => e.type === "response.create"),
    ).toHaveLength(before);
    resolvers[1]({ matches: [] });
    await vi.advanceTimersByTimeAsync(0);
    const events = f.socket.events();
    expect(events.filter((e) => e.type === "response.create")).toHaveLength(
      before + 1,
    );
    expect(
      events.filter((e) => e.item?.type === "function_call_output"),
    ).toHaveLength(2);
    f.session.stop();
  });
  it("does not emit late tool results after ending a call", async () => {
    const f = fixture();
    await f.ready();
    let resolve: (result: unknown) => void = () => {};
    f.tool.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    f.socket.emit({
      type: "response.function_call_arguments.done",
      call_id: "a",
      name: "find_people",
      arguments: '{"query":"speech"}',
    });
    await vi.advanceTimersByTimeAsync(0);
    f.session.stop();
    const count = f.socket.send.mock.calls.length;
    resolve({ matches: ["ada"] });
    await vi.advanceTimersByTimeAsync(0);
    expect(f.socket.send).toHaveBeenCalledTimes(count);
    expect(f.audio.close).toHaveBeenCalled();
    expect(f.socket.close).toHaveBeenCalled();
  });
  it("ignores late audio and completion events from an interrupted response", async () => {
    const f = fixture();
    await f.ready();
    f.socket.emit({ type: "response.created", response: { id: "old" } });
    f.socket.emit({ type: "input_audio_buffer.speech_started" });
    f.socket.emit({ type: "response.created", response: { id: "new" } });
    f.socket.emit({
      type: "response.output_audio.delta",
      response_id: "old",
      item_id: "old-item",
      delta: "stale",
    });
    f.socket.emit({
      type: "response.done",
      response: { id: "old", status: "cancelled" },
    });
    expect(f.audio.play).not.toHaveBeenCalled();
    f.socket.emit({
      type: "response.output_audio.delta",
      response_id: "new",
      item_id: "new-item",
      delta: "fresh",
    });
    expect(f.audio.play).toHaveBeenCalledWith("fresh", "new-item");
    f.session.stop();
  });
  it("ends idle sessions and exposes restart guidance", async () => {
    const f = fixture();
    await f.ready();
    await vi.advanceTimersByTimeAsync(IDLE_LIMIT_MS);
    expect(f.socket.close).toHaveBeenCalled();
    expect(f.error).toHaveBeenCalledWith(expect.stringContaining("paused"));
  });
  it("aborts an in-flight lookup when the attendee changes their request", async () => {
    const f = fixture();
    await f.ready();
    let signal: AbortSignal | undefined;
    f.tool.mockImplementation((_name, _args, s) => {
      signal = s;
      return new Promise(() => {});
    });
    f.socket.emit({
      type: "response.function_call_arguments.done",
      call_id: "old",
      name: "find_people",
      arguments: '{"query":"speech"}',
    });
    await vi.advanceTimersByTimeAsync(0);
    f.socket.emit({ type: "input_audio_buffer.speech_started" });
    expect(signal?.aborted).toBe(true);
    expect(
      f.socket
        .events()
        .some(
          (e) =>
            e.item?.call_id === "old" && e.item?.output.includes("interrupted"),
        ),
    ).toBe(true);
    f.session.stop();
  });
  it("ends active sessions at the client duration limit", async () => {
    const f = fixture();
    await f.ready();
    for (let elapsed = 0; elapsed < SESSION_LIMIT_MS; elapsed += 30_000) {
      f.socket.emit({ type: "input_audio_buffer.speech_started" });
      await vi.advanceTimersByTimeAsync(30_000);
    }
    expect(f.error).toHaveBeenCalledWith(
      expect.stringContaining("three minutes"),
    );
    expect(f.socket.close).toHaveBeenCalled();
  });
  it("cleans up on setup failure without exposing provider diagnostics", async () => {
    const f = fixture();
    f.audio.prepare.mockRejectedValue(new Error("Microphone unavailable"));
    await f.session.start("event");
    expect(f.audio.close).toHaveBeenCalled();
    expect(f.state).toHaveBeenLastCalledWith("error");
  });
});
