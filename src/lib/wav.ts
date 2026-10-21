export type PcmAudio = {
  samples: Int16Array;
  sampleRate: number;
};

function readString(view: DataView, offset: number, length: number) {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += String.fromCharCode(view.getUint8(offset + i));
  }
  return s;
}

/** Parse a RIFF/WAV file (16-bit int or 32-bit float PCM) into mono int16 samples. */
export function parseWav(bytes: Uint8Array): PcmAudio {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readString(view, 0, 4) !== 'RIFF' || readString(view, 8, 4) !== 'WAVE') {
    throw new Error('Not a WAV file');
  }

  let offset = 12;
  let format = 1;
  let channels = 1;
  let sampleRate = 16000;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= view.byteLength) {
    const id = readString(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (id === 'data') {
      dataOffset = body;
      // Header size can be stale if the app was killed mid-recording.
      dataLength = Math.min(size, view.byteLength - body);
      break;
    }
    offset = body + size + (size % 2);
  }
  if (dataOffset < 0) {
    throw new Error('WAV file has no data chunk');
  }

  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.floor(dataLength / (bytesPerSample * channels));
  const samples = new Int16Array(frameCount);
  const isFloat = format === 3 || bitsPerSample === 32;

  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      const p = dataOffset + (i * channels + c) * bytesPerSample;
      sum += isFloat
        ? Math.max(-1, Math.min(1, view.getFloat32(p, true))) * 32767
        : view.getInt16(p, true);
    }
    samples[i] = sum / channels;
  }
  return { samples, sampleRate };
}

/** Encode mono int16 samples as a WAV file. */
export function encodeWav(samples: Int16Array, sampleRate: number): Uint8Array {
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  new Int16Array(buffer, 44).set(samples);
  return new Uint8Array(buffer);
}

const TARGET_PEAK = 0.9 * 32767; // ~-1 dBFS
const MAX_GAIN = 30;

/**
 * Boost quiet audio in place so its loud parts sit near full scale.
 * Uses the 99.99th-percentile level rather than the absolute peak so a single
 * click doesn't block the boost; the rare samples above it are clipped.
 */
export function normalize(samples: Int16Array) {
  const histogram = new Uint32Array(32769);
  for (let i = 0; i < samples.length; i++) {
    histogram[Math.abs(samples[i])]++;
  }
  const outliers = Math.ceil(samples.length * 0.0001);
  let level = 32768;
  let louder = histogram[level];
  while (level > 0 && louder < outliers) {
    level--;
    louder += histogram[level];
  }
  if (level <= 0) {
    return 1;
  }

  const gain = Math.min(TARGET_PEAK / level, MAX_GAIN);
  if (gain <= 1.05) {
    return 1;
  }
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.max(
      -32768,
      Math.min(32767, Math.round(samples[i] * gain)),
    );
  }
  return gain;
}
