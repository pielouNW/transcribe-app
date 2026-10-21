import { File, Paths } from 'expo-file-system';
import { SpeechToText } from 'react-native-nobodywho';
import { loudness, type AudioChunk } from './chunker';

const WHISPER_SOURCE = 'hf://onnx-community/whisper-small';
const WHISPER_QUANTIZATION = 'int8';
const SILENCE_THRESHOLD = 30;

export type ModelStatus =
  | { state: 'idle' }
  | { state: 'downloading' }
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'error'; message: string };

let status: ModelStatus = { state: 'idle' };
let modelPromise: Promise<SpeechToText> | null = null;
const listeners = new Set<(s: ModelStatus) => void>();

function setStatus(next: ModelStatus) {
  status = next;
  listeners.forEach(l => l(next));
}

export function getModelStatus() {
  return status;
}

export function subscribeModelStatus(listener: (s: ModelStatus) => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

// NobodyWho doesn't report whether an ONNX model is cached (getCachedModels
// only lists .gguf files) and SpeechToText.load has no progress callback, so we
// remember which model loaded successfully. Changing the model or quantization
// counts as a new download.
const MODEL_KEY = `${WHISPER_SOURCE}#${WHISPER_QUANTIZATION}`;

function modelMarkerFile() {
  return new File(Paths.document, 'whisper-model.txt');
}

function isModelDownloaded() {
  try {
    const marker = modelMarkerFile();
    return marker.exists && marker.textSync() === MODEL_KEY;
  } catch {
    return false;
  }
}

function markModelDownloaded() {
  try {
    const marker = modelMarkerFile();
    if (!marker.exists) {
      marker.create();
    }
    marker.write(MODEL_KEY);
  } catch (e) {
    console.warn('Failed to record downloaded model', e);
  }
}

/** Load (and on first launch, download) the Whisper model. Safe to call many times. */
export function loadModel(): Promise<SpeechToText> {
  if (!modelPromise) {
    setStatus({ state: isModelDownloaded() ? 'loading' : 'downloading' });
    modelPromise = SpeechToText.load({
      source: WHISPER_SOURCE,
      language: 'en',
      quantization: WHISPER_QUANTIZATION,
    })
      .then(model => {
        markModelDownloaded();
        setStatus({ state: 'ready' });
        return model;
      })
      .catch(e => {
        modelPromise = null;
        setStatus({ state: 'error', message: String(e?.message ?? e) });
        throw e;
      });
  }
  return modelPromise;
}

// Whisper runs one chunk at a time; chain every request on this promise.
let queue: Promise<unknown> = Promise.resolve();

export function transcribeChunk(chunk: AudioChunk): Promise<string> {
  const job = queue.then(async () => {
    if (loudness(chunk.samples) < SILENCE_THRESHOLD) {
      return '';
    }
    const model = await loadModel();
    const text = await model
      .transcribePcm(chunk.samples, chunk.sampleRate)
      .completed();
    return cleanText(text);
  });

  queue = job.catch(() => undefined);

  return job;
}

const NON_SPEECH_LABELS = [
  'blank_audio',
  'blank audio',
  'silence',
  'silent',
  'music',
  'noise',
  'background noise',
  'inaudible',
  'laughter',
  'applause',
  'sound',
  'no speech',
  'pause',
  'cough',
  'coughs',
  'coughing',
  'sneeze',
  'sneezes',
  'sneezing',
  'clears throat',
  'clearing throat',
  'throat clearing',
  'sigh',
  'sighs',
  'sighing',
  'breath',
  'breathing',
  'breathes',
  'heavy breathing',
  'inhales',
  'exhales',
  'sniff',
  'sniffs',
  'sniffing',
  'yawn',
  'yawns',
  'yawning',
  'gasp',
  'gasps',
  'groan',
  'groans',
  'hiccup',
  'hiccups',
  'laugh',
  'laughs',
  'laughing',
  'chuckles',
];

const NON_SPEECH_PATTERN = new RegExp(
  `(?:\\[\\s*(?:${NON_SPEECH_LABELS.join('|')})\\s*\\]` +
    `|\\(\\s*(?:${NON_SPEECH_LABELS.join('|')})\\s*\\)` +
    `|\\*\\s*(?:${NON_SPEECH_LABELS.join('|')})\\s*\\*)`,
  'gi',
);

export function cleanText(raw: string | undefined) {
  if (!raw) {
    return '';
  }

  return raw.replace(NON_SPEECH_PATTERN, ' ').replace(/\s+/g, ' ').trim();
}
