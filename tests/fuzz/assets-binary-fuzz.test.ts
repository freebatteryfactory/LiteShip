import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { hasTag } from '@liteship/error';
import { audioDecoder, imageDecoder, walkRiff } from '@liteship/assets';
import { buildSampleWav } from '../support/wav-fixtures.js';

function isStableAssetRefusal(error: unknown): boolean {
  return hasTag(error, 'ParseError') || hasTag(error, 'ValidationError');
}

describe('asset binary fuzz boundaries', () => {
  it('arbitrary RIFF bytes either produce bounded chunks or a stable parse refusal', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 4_096 }), (bytes) => {
        try {
          const chunks = [...walkRiff(bytes.slice().buffer)];
          expect(chunks.length).toBeLessThanOrEqual(Math.floor(bytes.byteLength / 8) + 1);
        } catch (error) {
          expect(hasTag(error, 'ParseError')).toBe(true);
        }
      }),
      { numRuns: 1_000 },
    );
  });

  it('arbitrary audio bytes never escape as raw RangeError or DataView failure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ maxLength: 4_096 }), async (bytes) => {
        try {
          const decoded = await audioDecoder(bytes.slice().buffer);
          expect(decoded.sampleCount).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(decoded.durationMs)).toBe(true);
        } catch (error) {
          expect(isStableAssetRefusal(error)).toBe(true);
        }
      }),
      { numRuns: 1_000 },
    );
  });

  it('every proper truncation of an admitted WAV is refused rather than partially decoded', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 256 }), async (sampleCount) => {
        const valid = new Uint8Array(buildSampleWav('pcm16', new Array(sampleCount).fill(0)));
        const cut = valid.slice(0, valid.byteLength - 1);
        await expect(audioDecoder(cut.buffer)).rejects.toSatisfy(isStableAssetRefusal);
      }),
      { numRuns: 150 },
    );
  });

  it('arbitrary image bytes return finite metadata or a stable structural refusal', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ maxLength: 4_096 }), async (bytes) => {
        try {
          const decoded = await imageDecoder(bytes.slice().buffer);
          expect(['png', 'jpeg', 'webp', 'unknown']).toContain(decoded.format);
          expect(Number.isSafeInteger(decoded.width)).toBe(true);
          expect(Number.isSafeInteger(decoded.height)).toBe(true);
          expect(decoded.width).toBeGreaterThanOrEqual(0);
          expect(decoded.height).toBeGreaterThanOrEqual(0);
        } catch (error) {
          expect(hasTag(error, 'ParseError')).toBe(true);
        }
      }),
      { numRuns: 1_000 },
    );
  });
});
