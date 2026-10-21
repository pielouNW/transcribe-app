import type { TranscriptChunk } from './storage';

export type SearchMatch = {
  chunkIndex: number;
  chunk: TranscriptChunk;
  /** [start, end) character ranges of matches inside chunk.text. */
  ranges: [number, number][];
};

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive regex search over transcript chunks. Falls back to a
 * literal search when the query isn't a valid regex (e.g. "what?(").
 */
export function buildQuery(query: string): RegExp | null {
  const q = query.trim();
  if (!q) {
    return null;
  }
  try {
    return new RegExp(q, 'gi');
  } catch {
    return new RegExp(escapeRegex(q), 'gi');
  }
}

export function searchChunks(
  chunks: TranscriptChunk[],
  regex: RegExp,
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  chunks.forEach((chunk, chunkIndex) => {
    const ranges: [number, number][] = [];
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(chunk.text)) !== null) {
      if (m[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      ranges.push([m.index, m.index + m[0].length]);
    }
    if (ranges.length) {
      matches.push({ chunkIndex, chunk, ranges });
    }
  });
  return matches;
}
