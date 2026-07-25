/** Synthetic RIFF/WAVE builders shared by asset property, fuzz, and fault campaigns. */

export interface RawWavOptions {
  readonly audioFormat?: number;
  readonly channels?: number;
  readonly sampleRate?: number;
  readonly bitsPerSample?: number;
  readonly blockAlign?: number;
  readonly byteRate?: number;
  readonly fmtPayloadBytes?: number;
  readonly data?: Uint8Array;
  readonly formType?: string;
  readonly chunksBeforeFormat?: readonly Uint8Array[];
  readonly chunksBeforeData?: readonly Uint8Array[];
  readonly riffSizeOverride?: number;
  readonly omitFormat?: boolean;
  readonly omitData?: boolean;
}

export function writeFourCC(target: Uint8Array, offset: number, value: string): void {
  if (value.length !== 4) throw new RangeError(`fourCC must contain exactly four characters: ${value}`);
  for (let index = 0; index < 4; index++) target[offset + index] = value.charCodeAt(index);
}

export function makeRiffChunk(
  id: string,
  payload: Uint8Array,
  options: { readonly declaredSize?: number; readonly includePadding?: boolean } = {},
): Uint8Array {
  const declaredSize = options.declaredSize ?? payload.byteLength;
  const padding = options.includePadding === false || payload.byteLength % 2 === 0 ? 0 : 1;
  const chunk = new Uint8Array(8 + payload.byteLength + padding);
  writeFourCC(chunk, 0, id);
  new DataView(chunk.buffer).setUint32(4, declaredSize, true);
  chunk.set(payload, 8);
  return chunk;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

export function buildRawWav(options: RawWavOptions = {}): ArrayBuffer {
  const audioFormat = options.audioFormat ?? 1;
  const channels = options.channels ?? 1;
  const sampleRate = options.sampleRate ?? 48_000;
  const bitsPerSample = options.bitsPerSample ?? 16;
  const bytesPerSample = Math.ceil(bitsPerSample / 8);
  const blockAlign = options.blockAlign ?? channels * bytesPerSample;
  const byteRate = options.byteRate ?? sampleRate * blockAlign;
  const fmtPayload = new Uint8Array(options.fmtPayloadBytes ?? 16);
  const fmtView = new DataView(fmtPayload.buffer);
  if (fmtPayload.byteLength >= 2) fmtView.setUint16(0, audioFormat, true);
  if (fmtPayload.byteLength >= 4) fmtView.setUint16(2, channels, true);
  if (fmtPayload.byteLength >= 8) fmtView.setUint32(4, sampleRate, true);
  if (fmtPayload.byteLength >= 12) fmtView.setUint32(8, byteRate, true);
  if (fmtPayload.byteLength >= 14) fmtView.setUint16(12, blockAlign, true);
  if (fmtPayload.byteLength >= 16) fmtView.setUint16(14, bitsPerSample, true);

  const chunks: Uint8Array[] = [...(options.chunksBeforeFormat ?? [])];
  if (options.omitFormat !== true) chunks.push(makeRiffChunk('fmt ', fmtPayload));
  chunks.push(...(options.chunksBeforeData ?? []));
  if (options.omitData !== true) chunks.push(makeRiffChunk('data', options.data ?? new Uint8Array(0)));

  const body = concat(chunks);
  const output = new Uint8Array(12 + body.byteLength);
  writeFourCC(output, 0, 'RIFF');
  new DataView(output.buffer).setUint32(4, options.riffSizeOverride ?? 4 + body.byteLength, true);
  writeFourCC(output, 8, options.formType ?? 'WAVE');
  output.set(body, 12);
  return output.buffer;
}

export type SupportedSampleEncoding = 'pcm8' | 'pcm16' | 'pcm24' | 'pcm32' | 'float32';

export function encodeWavSamples(encoding: SupportedSampleEncoding, samples: readonly number[]): Uint8Array {
  const bytesPerSample = encoding === 'pcm8' ? 1 : encoding === 'pcm16' ? 2 : encoding === 'pcm24' ? 3 : 4;
  const output = new Uint8Array(samples.length * bytesPerSample);
  const view = new DataView(output.buffer);
  for (let index = 0; index < samples.length; index++) {
    const offset = index * bytesPerSample;
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    switch (encoding) {
      case 'pcm8':
        output[offset] = Math.max(0, Math.min(255, Math.round(sample * 128 + 128)));
        break;
      case 'pcm16':
        view.setInt16(offset, Math.max(-0x8000, Math.min(0x7fff, Math.round(sample * 0x8000))), true);
        break;
      case 'pcm24': {
        const value = Math.max(-0x800000, Math.min(0x7fffff, Math.round(sample * 0x800000)));
        output[offset] = value & 0xff;
        output[offset + 1] = (value >>> 8) & 0xff;
        output[offset + 2] = (value >>> 16) & 0xff;
        break;
      }
      case 'pcm32':
        view.setInt32(offset, Math.max(-0x80000000, Math.min(0x7fffffff, Math.round(sample * 0x80000000))), true);
        break;
      case 'float32':
        view.setFloat32(offset, sample, true);
        break;
    }
  }
  return output;
}

export function buildSampleWav(
  encoding: SupportedSampleEncoding,
  samples: readonly number[],
  options: { readonly channels?: number; readonly sampleRate?: number } = {},
): ArrayBuffer {
  const bitsPerSample = encoding === 'pcm8' ? 8 : encoding === 'pcm16' ? 16 : encoding === 'pcm24' ? 24 : 32;
  return buildRawWav({
    audioFormat: encoding === 'float32' ? 3 : 1,
    bitsPerSample,
    channels: options.channels,
    sampleRate: options.sampleRate,
    data: encodeWavSamples(encoding, samples),
  });
}
