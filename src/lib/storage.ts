import { Directory, File, Paths } from 'expo-file-system';

export type TranscriptChunk = {
  start: number;
  end: number;
  text: string;
};

export type Recording = {
  id: string;
  title: string;
  createdAt: number;
  duration: number;
  chunks: TranscriptChunk[];
};

const recordingsDir = new Directory(Paths.document, 'recordings');
const indexFile = new File(Paths.document, 'recordings.json');

export function ensureRecordingsDir() {
  if (!recordingsDir.exists) {
    recordingsDir.create({ intermediates: true, idempotent: true });
  }
  return recordingsDir;
}

/** Audio lives at a path derived from the id: iOS changes the app container path on updates. */
export function audioFileFor(id: string) {
  return new File(ensureRecordingsDir(), `${id}.wav`);
}

export function loadRecordings(): Recording[] {
  try {
    if (!indexFile.exists) {
      return [];
    }
    return JSON.parse(indexFile.textSync()) as Recording[];
  } catch (e) {
    console.warn('Failed to read recordings', e);
    return [];
  }
}

export function saveRecordings(recordings: Recording[]) {
  if (!indexFile.exists) {
    indexFile.create({ intermediates: true });
  }
  indexFile.write(JSON.stringify(recordings));
}

export function deleteRecordingFiles(recording: Recording) {
  const audio = audioFileFor(recording.id);
  if (audio.exists) {
    audio.delete();
  }
}

export function transcriptToText(recording: Recording) {
  const header = `${recording.title}\n${new Date(
    recording.createdAt,
  ).toLocaleString()}\n\n`;
  return (
    header +
    recording.chunks
      .filter(c => c.text)
      .map(c => `[${formatTime(c.start)}] ${c.text}`)
      .join('\n\n')
  );
}

export function formatTime(seconds: number) {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
