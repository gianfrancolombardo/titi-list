import { describe, expect, it } from 'vitest';
import {
  DESIRED_CHUNK_DURATION_MS,
  DESIRED_CHUNK_SIZE,
  isLocalWhisperSupported,
  mergeChunks,
  resampleTo16k,
  TARGET_SAMPLE_RATE,
} from '../utils/audioUtils';

describe('resampleTo16k', () => {
  it('returns the same buffer when the sample rate already matches', () => {
    const buffer = new Float32Array([0.1, 0.2, 0.3]);
    expect(resampleTo16k(buffer, TARGET_SAMPLE_RATE)).toBe(buffer);
  });

  it('throws when the input sample rate is invalid', () => {
    const buffer = new Float32Array([0]);
    expect(() => resampleTo16k(buffer, 0)).toThrow();
  });

  it('downsamples linearly to 16kHz', () => {
    const buffer = new Float32Array([0, 0.5, 1, 0.5, 0]);
    const result = resampleTo16k(buffer, 32_000);
    expect(result.length).toBe(3);
    expect(Array.from(result)).toEqual([0, 1, 0]);
  });
});

describe('mergeChunks', () => {
  it('concatenates multiple chunks', () => {
    const chunks = [new Float32Array([1, 2]), new Float32Array([3])];
    expect(Array.from(mergeChunks(chunks))).toEqual([1, 2, 3]);
  });

  it('handles empty input', () => {
    expect(Array.from(mergeChunks([]))).toEqual([]);
  });
});

describe('isLocalWhisperSupported', () => {
  it('returns false on non-browser environments', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulate undefined window
    delete (globalThis as { window?: Window }).window;
    expect(isLocalWhisperSupported()).toBe(false);
    globalThis.window = originalWindow;
  });
});

describe('chunk constants', () => {
  it('computes chunk size consistently', () => {
    expect(DESIRED_CHUNK_SIZE).toBeGreaterThan(0);
    expect(DESIRED_CHUNK_SIZE).toBeLessThanOrEqual(TARGET_SAMPLE_RATE);
    const ratio =
      Math.abs(
        DESIRED_CHUNK_SIZE - (TARGET_SAMPLE_RATE * DESIRED_CHUNK_DURATION_MS) / 1_000,
      ) / TARGET_SAMPLE_RATE;
    expect(ratio).toBeLessThan(0.01);
  });
});

