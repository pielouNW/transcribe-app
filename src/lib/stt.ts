import { Directory, File, Paths } from 'expo-file-system';
import { SpeechToText } from 'react-native-nobodywho';
import { loudness, type AudioChunk } from './chunker';
import { loadSettings, saveSettings } from './settings';

const WHISPER_REPO = 'onnx-community/whisper-small';
const WHISPER_REVISION = '36050c46d777d46dc4b5f43f6d90574fc38f8732';
const WHISPER_QUANTIZATION = 'int8';
const SILENCE_THRESHOLD = 10;

const WHISPER_FILES = [
  { path: 'config.json', size: 2227 },
  { path: 'generation_config.json', size: 3893 },
  { path: 'tokenizer.json', size: 2480466 },
  { path: 'onnx/encoder_model_int8.onnx', size: 92326127 },
  { path: 'onnx/decoder_model_merged_int8.onnx', size: 156750845 },
];

export const MODEL_DOWNLOAD_BYTES = WHISPER_FILES.reduce(
  (sum, f) => sum + f.size,
  0,
);

export type ModelStatus =
  | { state: 'notDownloaded' }
  | { state: 'downloading'; progress: number }
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'error'; message: string };

// Files live in Documents so the OS doesn't purge them. The marker is written
// after the last file, so a directory without it is an interrupted download.
// Changing the model, revision or quantization counts as a new download.
const MODEL_KEY = `${WHISPER_REPO}@${WHISPER_REVISION}#${WHISPER_QUANTIZATION}`;

function modelDir() {
  return new Directory(Paths.document, 'whisper-model');
}

function modelMarkerFile() {
  return new File(modelDir(), 'complete.txt');
}

function modelPath() {
  return decodeURIComponent(modelDir().uri.replace(/^file:\/\//, '')).replace(
    /\/$/,
    '',
  );
}

export function isModelDownloaded() {
  try {
    const marker = modelMarkerFile();
    return marker.exists && marker.textSync() === MODEL_KEY;
  } catch {
    return false;
  }
}

function removeModelFiles() {
  try {
    const dir = modelDir();
    if (dir.exists) {
      dir.delete();
    }
  } catch (e) {
    console.warn('Failed to remove model files', e);
  }
}

let status: ModelStatus = isModelDownloaded()
  ? { state: 'idle' }
  : { state: 'notDownloaded' };
let modelPromise: Promise<SpeechToText> | null = null;
let language = loadSettings().sttLanguage;
let downloadController: AbortController | null = null;
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

async function downloadFiles(signal: AbortSignal) {
  removeModelFiles();
  const dir = modelDir();
  new Directory(dir, 'onnx').create({ intermediates: true });

  let completedBytes = 0;
  let lastPercent = 0;
  setStatus({ state: 'downloading', progress: 0 });

  for (const file of WHISPER_FILES) {
    await File.downloadFileAsync(
      `https://huggingface.co/${WHISPER_REPO}/resolve/${WHISPER_REVISION}/${file.path}`,
      new File(dir, file.path),
      {
        signal,
        onProgress: ({ bytesWritten }) => {
          const progress = Math.min(
            (completedBytes + bytesWritten) / MODEL_DOWNLOAD_BYTES,
            1,
          );

          const percent = Math.floor(progress * 100);
          if (percent !== lastPercent) {
            lastPercent = percent;
            setStatus({ state: 'downloading', progress });
          }
        },
      },
    );
    completedBytes += file.size;
  }

  const marker = modelMarkerFile();
  marker.create();
  marker.write(MODEL_KEY);
}

export async function downloadModel() {
  if (isModelDownloaded()) {
    loadModel().catch(() => {});
    return;
  }
  if (downloadController) {
    return;
  }

  const controller = new AbortController();
  downloadController = controller;
  try {
    await downloadFiles(controller.signal);
  } catch (e: any) {
    removeModelFiles();
    setStatus(
      controller.signal.aborted
        ? { state: 'notDownloaded' }
        : { state: 'error', message: String(e?.message ?? e) },
    );
    return;
  } finally {
    downloadController = null;
  }
  loadModel().catch(() => {});
}

export function cancelDownload() {
  downloadController?.abort();
}

export function getSttLanguage() {
  return language;
}

// The language is fixed at load time, so a change reloads a loaded model. The
// old one is destroyed once the chunks already queued on it are done.
export function setSttLanguage(next: string | null) {
  if (next === language) {
    return;
  }
  language = next;
  saveSettings({ sttLanguage: next });

  const previous = modelPromise;
  if (!previous) {
    return;
  }
  
  modelPromise = null;
  queue = queue
    .then(() => previous)
    .then(
      model => model.destroy(),
      () => undefined,
    );
  loadModel().catch(() => {});
}

export function loadModel(): Promise<SpeechToText> {
  if (!modelPromise) {
    if (!isModelDownloaded()) {
      return Promise.reject(new Error('Transcription model is not downloaded'));
    }
    setStatus({ state: 'loading' });
    const promise: Promise<SpeechToText> = SpeechToText.load({
      source: modelPath(),
      language: language ?? undefined,
      quantization: WHISPER_QUANTIZATION,
    })
      .then(model => {
        if (modelPromise === promise) {
          setStatus({ state: 'ready' });
        }
        return model;
      })
      .catch(e => {
        if (modelPromise === promise) {
          modelPromise = null;
          setStatus({ state: 'error', message: String(e?.message ?? e) });
        }
        throw e;
      });
    modelPromise = promise;
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
