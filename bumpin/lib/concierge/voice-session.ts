import { BrowserVoiceAudio, type VoiceAudio } from "./audio";
import { IDLE_LIMIT_MS, SESSION_LIMIT_MS } from "./config";

export type VoiceState =
  "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
export type Caption = { id: string; role: "user" | "assistant"; text: string };
export type VoiceSessionSetup = {
  token: string;
  model: string;
  session: Record<string, unknown>;
};
type Socket = Pick<
  WebSocket,
  | "send"
  | "close"
  | "readyState"
  | "onopen"
  | "onmessage"
  | "onerror"
  | "onclose"
>;
type Options = {
  onState: (state: VoiceState) => void;
  onCaption: (caption: Caption) => void;
  onError: (message: string) => void;
  tool: (name: string, args: unknown, signal: AbortSignal) => Promise<unknown>;
  audioFactory?: () => VoiceAudio;
  socketFactory?: (url: string, protocols: string[]) => Socket;
  setup?: (slug: string, signal: AbortSignal) => Promise<VoiceSessionSetup>;
};

export class ConciergeVoiceSession {
  private audio: VoiceAudio | null = null;
  private socket: Socket | null = null;
  private abort: AbortController | null = null;
  private generation = 0;
  private ready = false;
  private configured = false;
  private responding = false;
  private currentResponseId: string | null = null;
  private cancelledResponses = new Set<string>();
  private playing = false;
  private ignoringAudio = false;
  private disposed = false;
  private callIds = new Set<string>();
  private pendingCallIds = new Set<string>();
  private toolAbort = new AbortController();
  private toolGeneration = 0;
  private pendingTools = 0;
  private toolResponseDone = false;
  private instructions = "";
  private captions = new Map<string, string>();
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private lifetime: ReturnType<typeof setTimeout> | undefined;
  private idle: ReturnType<typeof setTimeout> | undefined;
  constructor(private options: Options) {}

  private send(event: unknown) {
    if (this.socket?.readyState === 1) this.socket.send(JSON.stringify(event));
  }

  private state(state: VoiceState) {
    if (!this.disposed) this.options.onState(state);
  }

  private touch() {
    clearTimeout(this.idle);
    this.idle = setTimeout(
      () =>
        this.finish("Conversation paused. Start again whenever you’re ready."),
      IDLE_LIMIT_MS,
    );
  }

  async start(slug: string) {
    this.stop();
    const generation = this.generation;
    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.state("connecting");
    this.timeout = setTimeout(
      () =>
        this.fail(
          "Voice connection timed out. You can type your request instead.",
        ),
      20_000,
    );
    try {
      if (
        !this.options.audioFactory &&
        (typeof AudioContext === "undefined" ||
          typeof AudioWorkletNode === "undefined" ||
          !navigator.mediaDevices?.getUserMedia)
      ) {
        throw new Error(
          "This browser can’t use live voice. Type your request instead.",
        );
      }
      this.audio = (
        this.options.audioFactory ?? (() => new BrowserVoiceAudio())
      )();
      const audioReady = this.audio.prepare(
        (chunk) => {
          if (this.ready && generation === this.generation)
            this.send({ type: "input_audio_buffer.append", audio: chunk });
        },
        () => {
          this.playing = false;
          if (this.ready && !this.responding) this.state("listening");
        },
      );
      const setup =
        this.options.setup ??
        (async (eventSlug: string, signal: AbortSignal) => {
          const response = await fetch("/api/concierge/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventSlug }),
            signal,
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Could not start voice.");
          return data as VoiceSessionSetup;
        });
      const [session] = await Promise.all([setup(slug, signal), audioReady]);
      if (generation !== this.generation || signal.aborted) return;
      this.instructions = String(session.session.instructions ?? "");
      const socket = (
        this.options.socketFactory ??
        ((url, protocols) => new WebSocket(url, protocols))
      )(
        `wss://api.x.ai/v1/realtime?model=${encodeURIComponent(session.model)}`,
        [`xai-client-secret.${session.token}`],
      );
      this.socket = socket;
      socket.onopen = () => {
        if (generation !== this.generation) return;
        this.send({ type: "session.update", session: session.session });
        this.configured = true;
      };
      socket.onmessage = (message) => {
        if (generation !== this.generation) return;
        try {
          this.receive(JSON.parse(String(message.data)));
        } catch {
          this.fail(
            "Voice returned an unreadable response. Please restart or type instead.",
          );
        }
      };
      socket.onerror = () => {
        if (generation === this.generation)
          this.fail(
            "Voice connection failed. You can still type your request.",
          );
      };
      socket.onclose = () => {
        if (generation === this.generation)
          this.fail("Voice disconnected. Your matches are still available.");
      };
    } catch (error) {
      if (generation !== this.generation || signal.aborted) return;
      const message =
        error instanceof Error
          ? error.message
          : "Microphone unavailable. Type your request instead.";
      this.fail(
        message === "Permission denied" ||
          (error instanceof DOMException && error.name === "NotAllowedError")
          ? "Microphone permission was denied. Type your request or enable microphone access."
          : message,
      );
    }
  }

  private caption(
    id: string,
    role: Caption["role"],
    text: string,
    append = false,
  ) {
    const value = append ? (this.captions.get(id) ?? "") + text : text;
    this.captions.set(id, value);
    this.options.onCaption({ id, role, text: value.slice(0, 4000) });
  }

  private receive(event: Record<string, unknown>) {
    const type = event.type;
    const responseId =
      typeof event.response_id === "string"
        ? event.response_id
        : (event.response as { id?: string } | undefined)?.id;
    if (responseId && this.cancelledResponses.has(responseId)) return;
    const id = typeof event.item_id === "string" ? event.item_id : "current";
    const updatedSession = event.session as
      { instructions?: string } | undefined;
    if (
      type === "session.updated" &&
      this.configured &&
      !this.ready &&
      updatedSession?.instructions === this.instructions
    ) {
      this.ready = true;
      clearTimeout(this.timeout);
      this.state("listening");
      this.touch();
      this.lifetime = setTimeout(
        () =>
          this.finish(
            "Voice session ended after three minutes. Start a new conversation to continue.",
          ),
        SESSION_LIMIT_MS,
      );
      this.send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Please greet me briefly and ask who I would like to meet at this event.",
            },
          ],
        },
      });
      this.send({ type: "response.create" });
    } else if (type === "input_audio_buffer.speech_started") {
      this.touch();
      this.interrupt();
      this.state("listening");
    } else if (type === "input_audio_buffer.speech_stopped") {
      this.touch();
      this.state("thinking");
    } else if (
      type === "conversation.item.input_audio_transcription.updated" ||
      type === "conversation.item.input_audio_transcription.completed"
    ) {
      if (typeof event.transcript === "string")
        this.caption(`user:${id}`, "user", event.transcript);
    } else if (type === "response.created") {
      this.currentResponseId = responseId ?? null;
      this.responding = true;
      this.ignoringAudio = false;
      this.toolResponseDone = false;
      this.state("thinking");
    } else if (
      type === "response.output_audio.delta" ||
      type === "response.audio.delta"
    ) {
      if (!this.ignoringAudio && typeof event.delta === "string") {
        this.playing = true;
        this.audio?.play(event.delta, id);
        this.state("speaking");
      }
    } else if (
      type === "response.output_audio_transcript.delta" ||
      type === "response.audio_transcript.delta"
    ) {
      if (!this.ignoringAudio && typeof event.delta === "string")
        this.caption(`assistant:${id}`, "assistant", event.delta, true);
    } else if (
      type === "response.output_audio_transcript.done" ||
      type === "response.audio_transcript.done"
    ) {
      if (!this.ignoringAudio && typeof event.transcript === "string")
        this.caption(`assistant:${id}`, "assistant", event.transcript);
    } else if (type === "response.function_call_arguments.done") {
      this.callTool(event);
    } else if (type === "response.done") {
      this.responding = false;
      this.toolResponseDone = true;
      const response = event.response as { status?: string } | undefined;
      if (response?.status === "failed") {
        this.fail(
          "The voice provider could not answer. Please retry or type instead.",
        );
        return;
      }
      this.continueAfterTools();
      if (!this.playing && !this.responding && !this.pendingTools)
        this.state("listening");
      // Playback may still be draining; the audio callback returns to listening.
    } else if (type === "error") {
      this.fail(
        "The voice provider returned an error. Please restart or type your request.",
      );
    }
  }

  private callTool(event: Record<string, unknown>) {
    if (
      typeof event.call_id !== "string" ||
      typeof event.name !== "string" ||
      typeof event.arguments !== "string" ||
      this.callIds.has(event.call_id)
    )
      return;
    this.callIds.add(event.call_id);
    this.pendingCallIds.add(event.call_id);
    this.pendingTools++;
    this.state("thinking");
    const generation = this.generation;
    const toolGeneration = this.toolGeneration;
    const callId = event.call_id;
    let args: unknown;
    try {
      args = JSON.parse(event.arguments);
    } catch {
      args = null;
    }
    const toolSignal = this.toolAbort.signal;
    const tool = Promise.resolve().then(() => {
      if (
        generation !== this.generation ||
        toolGeneration !== this.toolGeneration ||
        toolSignal.aborted
      )
        return { error: "Search cancelled." };
      return this.options.tool(String(event.name), args, toolSignal);
    });
    void tool
      .catch(() => ({ error: "Could not complete that lookup. Please retry." }))
      .then((output) => {
        if (
          generation !== this.generation ||
          toolGeneration !== this.toolGeneration
        )
          return;
        this.send({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify(output),
          },
        });
        this.pendingTools--;
        this.pendingCallIds.delete(callId);
        this.continueAfterTools();
      });
  }

  private continueAfterTools() {
    if (this.toolResponseDone && this.pendingTools === 0 && this.callIds.size) {
      this.toolResponseDone = false;
      this.callIds.clear();
      this.responding = true;
      this.send({ type: "response.create" });
    }
  }

  interrupt() {
    const playback = this.audio?.interrupt();
    if (this.responding) this.send({ type: "response.cancel" });
    if (this.currentResponseId)
      this.cancelledResponses.add(this.currentResponseId);
    this.responding = false;
    if (playback)
      this.send({
        type: "conversation.item.truncate",
        item_id: playback.itemId,
        content_index: 0,
        audio_end_ms: playback.audioEndMs,
      });
    this.ignoringAudio = true;
    this.playing = false;
    if (this.pendingTools) {
      for (const callId of this.pendingCallIds)
        this.send({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify({
              error: "Search interrupted. Use the attendee’s updated request.",
            }),
          },
        });
      this.toolAbort.abort();
      this.toolAbort = new AbortController();
      this.toolGeneration++;
      this.pendingTools = 0;
      this.pendingCallIds.clear();
      this.callIds.clear();
      this.toolResponseDone = false;
    }
  }

  mute(muted: boolean) {
    this.audio?.mute(muted);
    this.touch();
  }

  private finish(message: string) {
    this.stop();
    this.options.onError(message);
  }
  private fail(message: string) {
    this.stop();
    this.options.onError(message);
    this.state("error");
  }

  stop() {
    this.generation++;
    clearTimeout(this.timeout);
    clearTimeout(this.lifetime);
    clearTimeout(this.idle);
    this.abort?.abort();
    this.abort = null;
    this.toolAbort.abort();
    this.toolAbort = new AbortController();
    this.toolGeneration++;
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.onopen = null;
      this.socket.close();
    }
    this.socket = null;
    this.audio?.close();
    this.audio = null;
    this.ready = false;
    this.configured = false;
    this.responding = false;
    this.currentResponseId = null;
    this.cancelledResponses.clear();
    this.playing = false;
    this.pendingTools = 0;
    this.pendingCallIds.clear();
    this.toolResponseDone = false;
    this.callIds.clear();
    this.captions.clear();
    this.state("idle");
  }

  dispose() {
    this.disposed = true;
    this.stop();
  }
}
