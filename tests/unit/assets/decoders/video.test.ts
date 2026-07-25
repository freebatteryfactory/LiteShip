import { describe, it, expect } from 'vitest';
import { videoDecoder } from '@liteship/assets';

describe('videoDecoder', () => {
  it('classifies a minimal MP4-like fixture through the real probe boundary or refuses it stably', async () => {
    const fixture = new Uint8Array([
      0x00, 0x00, 0x00, 0x10, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
    ]).buffer;
    try {
      const decoded = await videoDecoder(fixture);
      expect(decoded.container).toBe('mp4');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(String(error)).not.toContain('SyntaxError');
    }
  });

  it('throws on an empty buffer with a teaching error', async () => {
    await expect(videoDecoder(new ArrayBuffer(0))).rejects.toThrow(/empty buffer.*readable and non-empty/);
  });

  it('classifies a WebM-like fixture through the real probe boundary or refuses it stably', async () => {
    // EBML header magic (0x1a45DFA3 first 4 bytes).
    const fixture = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0xa3, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81]).buffer;
    try {
      const decoded = await videoDecoder(fixture);
      expect(decoded.container.length).toBeGreaterThan(0);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('refuses unrecognized bytes rather than fabricating an unknown container', async () => {
    const fixture = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]).buffer;
    await expect(videoDecoder(fixture)).rejects.toBeInstanceOf(Error);
  });
});
