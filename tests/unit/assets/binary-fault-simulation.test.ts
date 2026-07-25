import { describe, expect, it } from 'vitest';
import { hasTag } from '@liteship/error';
import { audioDecoder } from '@liteship/assets';
import { buildRawWav, buildSampleWav } from '../../support/wav-fixtures.js';

describe('asset binary fault simulation', () => {
  it('refuses each transient structural fault and recovers on the next pristine decode', async () => {
    const pristine = buildSampleWav('pcm16', [0, 0.25, -0.25, 0.5]);
    const faults = [
      new Uint8Array(pristine).slice(0, -1).buffer,
      buildRawWav({ formType: 'AVI ', data: new Uint8Array(4) }),
      buildRawWav({ channels: 0, blockAlign: 0, byteRate: 0, data: new Uint8Array(4) }),
      buildRawWav({ sampleRate: 0, byteRate: 0, data: new Uint8Array(4) }),
      buildRawWav({ blockAlign: 4, data: new Uint8Array(4) }),
      buildRawWav({ byteRate: 1, data: new Uint8Array(4) }),
      buildRawWav({ data: new Uint8Array(3) }),
    ];

    for (const fault of faults) {
      expect((await audioDecoder(pristine)).sampleCount).toBe(4);
      await expect(audioDecoder(fault)).rejects.toSatisfy(
        (error: unknown) => hasTag(error, 'ParseError') || hasTag(error, 'ValidationError'),
      );
      expect((await audioDecoder(pristine)).sampleCount).toBe(4);
    }
  });
});
