/** Stateful fault injection: bad binary admissions cannot poison later decodes. */

import { describe, expect, it } from 'vitest';
import { audioDecoder, imageDecoder } from '@liteship/assets';
import { buildSampleWav } from '../../support/wav-fixtures.js';

const VALID_WAV = buildSampleWav('pcm16', [0, 0.25, -0.25, 0.5]);
const VALID_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='),
  (character) => character.charCodeAt(0),
).buffer;

describe('asset decoder fault injection', () => {
  it('recovers deterministically after repeated RIFF extent and signature faults', async () => {
    for (let attempt = 0; attempt < 64; attempt++) {
      const fault = new Uint8Array(VALID_WAV.slice(0));
      if (attempt % 2 === 0) fault[attempt % 4] = (fault[attempt % 4] ?? 0) ^ 0xff;
      else new DataView(fault.buffer).setUint32(4, 0xffff_ffff, true);

      await expect(audioDecoder(fault.buffer)).rejects.toBeDefined();
      await expect(audioDecoder(VALID_WAV)).resolves.toMatchObject({ sampleRate: 48_000, sampleCount: 4 });
    }
  });

  it('recovers deterministically after repeated PNG header faults', async () => {
    for (let attempt = 0; attempt < 64; attempt++) {
      const fault = new Uint8Array(VALID_PNG.slice(0));
      switch (attempt % 4) {
        case 0:
          fault[0] = 0;
          await expect(imageDecoder(fault.buffer)).resolves.toMatchObject({ format: 'unknown' });
          break;
        case 1:
          new DataView(fault.buffer).setUint32(8, 12);
          await expect(imageDecoder(fault.buffer)).rejects.toBeDefined();
          break;
        case 2:
          fault[12] = 'X'.charCodeAt(0);
          await expect(imageDecoder(fault.buffer)).rejects.toBeDefined();
          break;
        case 3:
          new DataView(fault.buffer).setUint32(16, 0);
          await expect(imageDecoder(fault.buffer)).rejects.toBeDefined();
          break;
      }
      await expect(imageDecoder(VALID_PNG)).resolves.toEqual({ format: 'png', width: 1, height: 1 });
    }
  });
});
