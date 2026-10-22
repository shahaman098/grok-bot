export function pcm16(
  samples: Float32Array,
  inputRate: number,
  outputRate = 24000,
): Int16Array {
  const size = Math.floor((samples.length * outputRate) / inputRate);
  const result = new Int16Array(size);
  for (let i = 0; i < size; i++) {
    const position = (i * inputRate) / outputRate;
    const left = Math.floor(position);
    const fraction = position - left;
    const value = Math.max(
      -1,
      Math.min(
        1,
        samples[left] * (1 - fraction) +
          (samples[Math.min(left + 1, samples.length - 1)] ?? 0) * fraction,
      ),
    );
    result[i] = Math.round(value * (value < 0 ? 32768 : 32767));
  }
  return result;
}

export function encodePcm(samples: Int16Array) {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  samples.forEach((sample, i) => view.setInt16(i * 2, sample, true));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export interface VoiceAudio {
  prepare(
    onAudio: (base64: string) => void,
    onPlaybackEnd: () => void,
  ): Promise<void>;
  play(base64: string, itemId: string): void;
  interrupt(): { itemId: string; audioEndMs: number } | null;
  mute(muted: boolean): void;
  close(): void;
}

export class BrowserVoiceAudio implements VoiceAudio {
  private context = new AudioContext();
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private capture: AudioWorkletNode | null = null;
  private silent: GainNode | null = null;
  private closed = false;
  private muted = false;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private currentItem: { id: string; start: number; duration: number } | null =
    null;
  private onPlaybackEnd = () => {};

  async prepare(onAudio: (base64: string) => void, onPlaybackEnd: () => void) {
    // Resume synchronously from the initiating tap, before network/microphone awaits.
    this.onPlaybackEnd = onPlaybackEnd;
    await this.context.resume();
    if (this.closed) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    if (this.closed) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !this.muted;
    });
    await this.context.audioWorklet.addModule("/audio/concierge-capture.js");
    if (this.closed) return;
    this.source = this.context.createMediaStreamSource(stream);
    this.capture = new AudioWorkletNode(this.context, "bumpin-capture");
    this.silent = this.context.createGain();
    this.silent.gain.value = 0;
    this.source.connect(this.capture);
    this.capture.connect(this.silent);
    this.silent.connect(this.context.destination);
    this.capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (!this.closed && !this.muted)
        onAudio(encodePcm(pcm16(event.data, this.context.sampleRate)));
    };
  }

  play(base64: string, itemId: string) {
    if (this.closed) return;
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    if (!bytes.length || bytes.length % 2) return;
    const values = new DataView(bytes.buffer);
    const buffer = this.context.createBuffer(1, bytes.length / 2, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++)
      channel[i] = values.getInt16(i * 2, true) / 32768;
    const start = Math.max(this.context.currentTime + 0.02, this.nextTime);
    if (this.currentItem?.id !== itemId)
      this.currentItem = { id: itemId, start, duration: 0 };
    this.currentItem.duration += buffer.duration;
    const node = this.context.createBufferSource();
    node.buffer = buffer;
    node.connect(this.context.destination);
    this.sources.add(node);
    node.onended = () => {
      this.sources.delete(node);
      node.disconnect();
      if (!this.sources.size && !this.closed) this.onPlaybackEnd();
    };
    node.start(start);
    this.nextTime = start + buffer.duration;
  }

  interrupt() {
    const item = this.currentItem;
    this.currentItem = null;
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
    this.sources.clear();
    this.nextTime = 0;
    return item
      ? {
          itemId: item.id,
          audioEndMs: Math.floor(
            Math.max(
              0,
              Math.min(item.duration, this.context.currentTime - item.start),
            ) * 1000,
          ),
        }
      : null;
  }

  mute(muted: boolean) {
    this.muted = muted;
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  close() {
    this.closed = true;
    this.interrupt();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.capture) this.capture.port.onmessage = null;
    this.capture?.disconnect();
    this.source?.disconnect();
    this.silent?.disconnect();
    void this.context.close().catch(() => undefined);
  }
}
