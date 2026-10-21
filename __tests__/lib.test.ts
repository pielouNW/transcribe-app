import { Chunker, type AudioChunk } from '../src/lib/chunker';
import { buildQuery, searchChunks } from '../src/lib/search';
import { formatTime } from '../src/lib/storage';
import { cleanText } from '../src/lib/stt';
import { encodeWav, normalize, parseWav } from '../src/lib/wav';

jest.mock('react-native-nobodywho', () => ({ SpeechToText: {} }));
jest.mock('expo-file-system', () => ({
  Directory: jest.fn(),
  File: jest.fn(),
  Paths: {},
}));

describe('Chunker', () => {
  it('splits a long stream into 12-20s chunks with continuous timestamps', () => {
    const rate = 16000;
    const chunks: AudioChunk[] = [];
    const chunker = new Chunker(rate, c => chunks.push(c));

    // 65s of "speech" pushed in 100ms buffers, with a silent gap at 15s.
    const total = rate * 65;
    for (let s = 0; s < total; s += rate / 10) {
      const buf = new Int16Array(rate / 10);
      const silent = s >= rate * 15 && s < rate * 15.2;
      buf.fill(silent ? 0 : 1000);
      chunker.push(buf);
    }
    chunker.flush();

    expect(chunks.length).toBeGreaterThanOrEqual(4);
    expect(chunks[0].start).toBe(0);
    expect(chunks[0].end).toBeGreaterThanOrEqual(15);
    expect(chunks[0].end).toBeLessThanOrEqual(15.2);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].start).toBeCloseTo(chunks[i - 1].end);
    }
    expect(chunks[chunks.length - 1].end).toBeCloseTo(65);
    const summed = chunks.reduce((n, c) => n + c.samples.length, 0);
    expect(summed).toBe(total);
  });
});

describe('WAV', () => {
  it('round-trips samples', () => {
    const samples = Int16Array.from([0, 1, -1, 32767, -32768, 1234]);
    const parsed = parseWav(encodeWav(samples, 22050));
    expect(parsed.sampleRate).toBe(22050);
    expect(Array.from(parsed.samples)).toEqual(Array.from(samples));
  });
});

describe('cleanText', () => {
  it('drops chunks that are only non-speech labels', () => {
    expect(cleanText(' [BLANK_AUDIO] ')).toBe('');
    expect(cleanText('[ blank_audio ] (Music) *coughs*')).toBe('');
    expect(cleanText(undefined)).toBe('');
  });

  it('strips labels around real speech and keeps unknown brackets', () => {
    expect(cleanText('So (laughs) the  budget [Applause] is set.')).toBe(
      'So the budget is set.',
    );
    expect(cleanText('Section [4] of the contract')).toBe(
      'Section [4] of the contract',
    );
  });
});

describe('normalize', () => {
  it('boosts quiet audio to near full scale', () => {
    const samples = new Int16Array(16000).map((_, i) =>
      Math.round(Math.sin(i / 10) * 1000),
    );
    const gain = normalize(samples);
    expect(gain).toBeCloseTo(29.49, 1);
    const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeGreaterThan(29000);
    expect(peak).toBeLessThanOrEqual(32767);
  });

  it('leaves loud audio and silence untouched', () => {
    const loud = Int16Array.from([0, 31000, -31000, 15000]);
    expect(normalize(loud)).toBe(1);
    expect(Array.from(loud)).toEqual([0, 31000, -31000, 15000]);
    expect(normalize(new Int16Array(100))).toBe(1);
  });
});

describe('search', () => {
  const chunks = [
    { start: 0, end: 15, text: 'We should ship the budget by Friday.' },
    { start: 15, end: 30, text: 'The budget review is on Monday.' },
    { start: 30, end: 45, text: 'Lunch?' },
  ];

  it('finds case-insensitive matches with ranges', () => {
    const results = searchChunks(chunks, buildQuery('BUDGET')!);
    expect(results.map(r => r.chunk.start)).toEqual([0, 15]);
    expect(results[0].ranges).toEqual([[19, 25]]);
  });

  it('supports regex and falls back to literal on invalid patterns', () => {
    expect(searchChunks(chunks, buildQuery('fri|mon')!)).toHaveLength(2);
    expect(searchChunks(chunks, buildQuery('lunch?(')!)).toHaveLength(0);
    expect(searchChunks(chunks, buildQuery('Lunch?')!)).toHaveLength(1);
  });

  it('formats timestamps', () => {
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(605)).toBe('10:05');
    expect(formatTime(3725)).toBe('1:02:05');
  });
});
