import { File } from 'expo-file-system';
import { encodeWav, normalize, parseWav } from './wav';

/**
 * iOS records with automatic gain off (expo-audio uses the `.measurement`
 * session mode), so raw recordings play back very quietly. Rewrite the WAV
 * with its level normalized.
 */
export async function normalizeWavFile(file: File) {
  const { samples, sampleRate } = parseWav(await file.bytes());
  if (normalize(samples) > 1) {
    file.write(encodeWav(samples, sampleRate));
  }
}
