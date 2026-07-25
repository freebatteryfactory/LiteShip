/** MC/DC condition-independence table for RIFF, audio-decode, and analysis admission boundaries. */

import { describe, expect, it } from 'vitest';
import { hasTag } from '@liteship/error';
import { audioDecoder, computeWaveform, walkRiff } from '@liteship/assets';
import { buildRawWav, buildSampleWav, makeRiffChunk } from '../../support/wav-fixtures.js';

interface RefusalCase {
  readonly decision: string;
  readonly execute: () => unknown | Promise<unknown>;
  readonly tag: 'ParseError' | 'ValidationError';
}

const valid = buildSampleWav('pcm16', [0, 0.5]);

const cases: readonly RefusalCase[] = [
  { decision: 'riff-minimum-length/false', execute: () => [...walkRiff(new ArrayBuffer(11))], tag: 'ParseError' },
  {
    decision: 'riff-magic/false',
    execute: () => [...walkRiff(Uint8Array.from([0, 0, 0, 0, 4, 0, 0, 0, 87, 65, 86, 69]).buffer)],
    tag: 'ParseError',
  },
  {
    decision: 'riff-form-size/false',
    execute: () => [...walkRiff(buildRawWav({ omitFormat: true, omitData: true, riffSizeOverride: 3 }))],
    tag: 'ParseError',
  },
  {
    decision: 'riff-declared-bound/false',
    execute: () => [...walkRiff(buildRawWav({ riffSizeOverride: 10_000 }))],
    tag: 'ParseError',
  },
  {
    decision: 'chunk-payload-bound/false',
    execute: () => [
      ...walkRiff(
        buildRawWav({
          omitFormat: true,
          omitData: true,
          chunksBeforeFormat: [makeRiffChunk('JUNK', new Uint8Array(2), { declaredSize: 32 })],
        }),
      ),
    ],
    tag: 'ParseError',
  },
  {
    decision: 'chunk-padding/false',
    execute: () => [
      ...walkRiff(
        buildRawWav({
          omitFormat: true,
          omitData: true,
          chunksBeforeFormat: [makeRiffChunk('JUNK', new Uint8Array(1), { includePadding: false })],
        }),
      ),
    ],
    tag: 'ParseError',
  },
  {
    decision: 'list-type-present/false',
    execute: () => [
      ...walkRiff(
        buildRawWav({
          omitFormat: true,
          omitData: true,
          chunksBeforeFormat: [makeRiffChunk('LIST', new Uint8Array(2))],
        }),
      ),
    ],
    tag: 'ParseError',
  },
  {
    decision: 'chunk-header-complete/false',
    execute: () => [
      ...walkRiff(buildRawWav({ omitFormat: true, omitData: true, chunksBeforeFormat: [new Uint8Array([1, 2, 3])] })),
    ],
    tag: 'ParseError',
  },
  {
    decision: 'wave-form/false',
    execute: () => audioDecoder(buildRawWav({ formType: 'AVI ' })),
    tag: 'ValidationError',
  },
  {
    decision: 'fmt-present/false',
    execute: () => audioDecoder(buildRawWav({ omitFormat: true })),
    tag: 'ValidationError',
  },
  {
    decision: 'data-present/false',
    execute: () => audioDecoder(buildRawWav({ omitData: true })),
    tag: 'ValidationError',
  },
  {
    decision: 'fmt-minimum/false',
    execute: () => audioDecoder(buildRawWav({ fmtPayloadBytes: 15 })),
    tag: 'ValidationError',
  },
  {
    decision: 'format-supported/false',
    execute: () => audioDecoder(buildRawWav({ bitsPerSample: 12 })),
    tag: 'ValidationError',
  },
  {
    decision: 'fmt-unique/false',
    execute: () => audioDecoder(buildRawWav({ chunksBeforeFormat: [makeRiffChunk('fmt ', new Uint8Array(16))] })),
    tag: 'ParseError',
  },
  {
    decision: 'data-unique/false',
    execute: () => audioDecoder(buildRawWav({ chunksBeforeData: [makeRiffChunk('data', new Uint8Array(0))] })),
    tag: 'ParseError',
  },
  {
    decision: 'channels-positive/false',
    execute: () => audioDecoder(buildRawWav({ channels: 0, blockAlign: 0, byteRate: 0 })),
    tag: 'ValidationError',
  },
  {
    decision: 'sample-rate-positive/false',
    execute: () => audioDecoder(buildRawWav({ sampleRate: 0, byteRate: 0 })),
    tag: 'ValidationError',
  },
  {
    decision: 'block-align/false',
    execute: () => audioDecoder(buildRawWav({ blockAlign: 4 })),
    tag: 'ValidationError',
  },
  { decision: 'byte-rate/false', execute: () => audioDecoder(buildRawWav({ byteRate: 1 })), tag: 'ValidationError' },
  {
    decision: 'whole-frame/false',
    execute: () => audioDecoder(buildRawWav({ data: new Uint8Array(3) })),
    tag: 'ValidationError',
  },
  {
    decision: 'analysis-rate-finite/false',
    execute: () => computeWaveform({ sampleRate: Number.NaN, samples: new Float32Array(1) }),
    tag: 'ValidationError',
  },
  {
    decision: 'analysis-samples-finite/false',
    execute: () => computeWaveform({ sampleRate: 48_000, samples: new Float32Array([Number.NaN]) }),
    tag: 'ValidationError',
  },
  {
    decision: 'analysis-channel-shape/false',
    execute: () => computeWaveform({ sampleRate: 48_000, channels: 2, samples: new Float32Array([0, 1, 0]) }),
    tag: 'ValidationError',
  },
  {
    decision: 'waveform-bins-positive/false',
    execute: () => computeWaveform({ sampleRate: 48_000, samples: new Float32Array(1) }, { bins: 0 }),
    tag: 'ValidationError',
  },
];

describe('asset binary decision table', () => {
  it('keeps the neighboring admitted path live', async () => {
    expect([...walkRiff(valid)]).toHaveLength(3);
    expect((await audioDecoder(valid)).sampleCount).toBe(2);
    expect(computeWaveform({ sampleRate: 48_000, samples: new Float32Array([1]) }, { bins: 1 })).toEqual([1]);
  });

  it.each(cases)('$decision', async ({ execute, tag }) => {
    try {
      await execute();
      throw new Error('expected refusal');
    } catch (error) {
      expect(hasTag(error, tag)).toBe(true);
    }
  });

  it('names every decision witness exactly once', () => {
    expect(new Set(cases.map((entry) => entry.decision)).size).toBe(cases.length);
  });
});
