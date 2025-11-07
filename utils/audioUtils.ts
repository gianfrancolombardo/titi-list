export const TARGET_SAMPLE_RATE = 16_000;
export const DESIRED_CHUNK_DURATION_MS = 25;
export const DESIRED_CHUNK_SIZE = Math.floor(
  (TARGET_SAMPLE_RATE * DESIRED_CHUNK_DURATION_MS) / 1_000,
);

/**
 * Performs linear resampling from an arbitrary input sample rate to 16 kHz.
 * The algorithm trades minimal precision for simplicity and speed, which is
 * acceptable for speech transcription models such as Whisper.
 */
export function resampleTo16k(
  input: Float32Array,
  sourceSampleRate: number
): Float32Array {
  if (sourceSampleRate === TARGET_SAMPLE_RATE) {
    return input;
  }

  if (sourceSampleRate <= 0) {
    throw new Error('Invalid source sample rate');
  }

  const sampleRateRatio = sourceSampleRate / TARGET_SAMPLE_RATE;
  const newLength = Math.round(input.length / sampleRateRatio);
  const output = new Float32Array(newLength);

  for (let i = 0; i < newLength; i += 1) {
    const position = i * sampleRateRatio;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(leftIndex + 1, input.length - 1);
    const interpolation = position - leftIndex;

    output[i] =
      input[leftIndex] * (1 - interpolation) + input[rightIndex] * interpolation;
  }

  return output;
}

export function mergeChunks(chunks: Float32Array[]): Float32Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Float32Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

export function isLocalWhisperSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const mediaDevicesAvailable = !!window.navigator?.mediaDevices?.getUserMedia;
  const audioContextAvailable =
    typeof window.AudioContext !== 'undefined' ||
    typeof (window as unknown as { webkitAudioContext?: AudioContext })
      .webkitAudioContext !== 'undefined';

  return mediaDevicesAvailable && audioContextAvailable;
}

