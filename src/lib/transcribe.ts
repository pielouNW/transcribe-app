import { File } from 'expo-file-system';
import { Chunker, type AudioChunk } from './chunker';
import type { TranscriptChunk } from './storage';
import { transcribeChunk } from './stt';
import { parseWav } from './wav';

/** Re-run Whisper over a saved WAV recording, chunk by chunk. */
export async function transcribeWavFile(
  uri: string,
  onProgress?: (done: number, total: number) => void,
): Promise<TranscriptChunk[]> {
  const { samples, sampleRate } = parseWav(await new File(uri).bytes());

  const audioChunks: AudioChunk[] = [];
  const chunker = new Chunker(sampleRate, c => audioChunks.push(c));
  chunker.push(samples);
  chunker.flush();

  const result: TranscriptChunk[] = [];
  for (const chunk of audioChunks) {
    onProgress?.(result.length, audioChunks.length);
    const text = await transcribeChunk(chunk);
    result.push({ start: chunk.start, end: chunk.end, text });
  }
  onProgress?.(result.length, audioChunks.length);
  return result;
}
