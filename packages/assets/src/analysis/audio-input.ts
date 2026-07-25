/** Shared admission for public sample-space analysis kernels. */

import { ValidationError } from '@liteship/error';

export interface AnalysisAudio {
  readonly sampleRate: number;
  /** Interleaved channel count. Direct mono callers may omit it. */
  readonly channels?: number;
  readonly samples: Float32Array | Int16Array;
}

/** Validate and deterministically downmix interleaved samples to frame-domain mono. */
export function analysisFrames(audio: AnalysisAudio, operation: string): Float32Array | Int16Array {
  if (!Number.isFinite(audio.sampleRate) || audio.sampleRate <= 0) {
    throw ValidationError(operation, `sampleRate must be a finite positive number, got ${String(audio.sampleRate)}`);
  }
  if (!(audio.samples instanceof Float32Array) && !(audio.samples instanceof Int16Array)) {
    throw ValidationError(operation, 'samples must be a Float32Array or Int16Array');
  }
  const channels = audio.channels ?? 1;
  if (!Number.isSafeInteger(channels) || channels <= 0) {
    throw ValidationError(operation, `channels must be a positive safe integer, got ${String(channels)}`);
  }
  if (audio.samples.length % channels !== 0) {
    throw ValidationError(
      operation,
      `interleaved sample length ${audio.samples.length} is not divisible by channels=${channels}`,
    );
  }
  if (audio.samples instanceof Float32Array) {
    for (let index = 0; index < audio.samples.length; index++) {
      if (!Number.isFinite(audio.samples[index])) {
        throw ValidationError(operation, `samples[${index}] must be finite`);
      }
    }
  }
  if (channels === 1) return audio.samples;
  const frames = new Float32Array(audio.samples.length / channels);
  for (let frame = 0; frame < frames.length; frame++) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel++) sum += Number(audio.samples[frame * channels + channel]);
    frames[frame] = sum / channels;
  }
  return frames;
}
