/** Independent image-header differential against sharp/libvips encoders. */

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { imageDecoder } from '@liteship/assets';

const CASES = [
  { width: 1, height: 1 },
  { width: 17, height: 31 },
  { width: 257, height: 129 },
] as const;

function exactArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

describe('imageDecoder independent differential', () => {
  it.each(['png', 'jpeg', 'webp'] as const)('agrees with sharp metadata for encoded %s dimensions', async (format) => {
    for (const expected of CASES) {
      const encoder = sharp({
        create: {
          ...expected,
          channels: 4,
          background: { r: 19, g: 71, b: 113, alpha: 0.75 },
        },
      });
      const encoded = await encoder.toFormat(format).toBuffer();
      const oracle = await sharp(encoded).metadata();
      const actual = await imageDecoder(exactArrayBuffer(encoded));

      expect(actual).toEqual({
        format,
        width: oracle.width,
        height: oracle.height,
      });
      expect(actual.width).toBe(expected.width);
      expect(actual.height).toBe(expected.height);
    }
  });
});
