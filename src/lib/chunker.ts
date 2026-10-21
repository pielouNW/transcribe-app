export type AudioChunk = {
  /** Offset of the chunk in the full recording, in seconds. */
  start: number;
  end: number;
  samples: Int16Array;
  sampleRate: number;
};

const MIN_CHUNK_SECONDS = 12;
const MAX_CHUNK_SECONDS = 20;
const FRAME_SECONDS = 0.1;

/**
 * Splits a stream of PCM samples into ~12-20s chunks, cutting at the quietest
 * moment so we avoid splitting words. Each chunk is small enough for a single
 * Whisper window (30s) and gives a fine-grained timestamp for search.
 */
export class Chunker {
  private buffer: Int16Array;
  private length = 0;
  private consumed = 0;

  constructor(
    private readonly sampleRate: number,
    private readonly onChunk: (chunk: AudioChunk) => void,
  ) {
    this.buffer = new Int16Array(
      Math.ceil(sampleRate * MAX_CHUNK_SECONDS * 1.5),
    );
  }

  /** Seconds of audio received so far. */
  get duration() {
    return (this.consumed + this.length) / this.sampleRate;
  }

  push(samples: Int16Array) {
    if (this.length + samples.length > this.buffer.length) {
      const grown = new Int16Array((this.length + samples.length) * 2);
      grown.set(this.buffer.subarray(0, this.length));
      this.buffer = grown;
    }
    this.buffer.set(samples, this.length);
    this.length += samples.length;

    const max = Math.floor(this.sampleRate * MAX_CHUNK_SECONDS);
    while (this.length >= max) {
      this.emit(this.findCut());
    }
  }

  /** Emit whatever is left (call once the recording stops). */
  flush() {
    if (this.length > this.sampleRate * 0.5) {
      this.emit(this.length);
    }
    this.length = 0;
  }

  private findCut() {
    const frame = Math.floor(this.sampleRate * FRAME_SECONDS);
    const from = Math.floor(this.sampleRate * MIN_CHUNK_SECONDS);
    const to = Math.floor(this.sampleRate * MAX_CHUNK_SECONDS) - frame;
    let best = to + frame;
    let bestEnergy = Infinity;
    for (let s = from; s <= to; s += frame) {
      let energy = 0;
      for (let i = s; i < s + frame; i++) {
        energy += Math.abs(this.buffer[i]);
      }
      if (energy < bestEnergy) {
        bestEnergy = energy;
        best = s + Math.floor(frame / 2);
      }
    }
    return best;
  }

  private emit(cut: number) {
    const samples = this.buffer.slice(0, cut);
    this.buffer.copyWithin(0, cut, this.length);
    this.length -= cut;

    const start = this.consumed / this.sampleRate;
    this.consumed += cut;
    this.onChunk({
      start,
      end: this.consumed / this.sampleRate,
      samples,
      sampleRate: this.sampleRate,
    });
  }
}

/** Mean absolute amplitude, used to skip silent chunks (Whisper hallucinates on silence). */
export function loudness(samples: Int16Array) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += Math.abs(samples[i]);
  }
  return samples.length ? sum / samples.length : 0;
}
