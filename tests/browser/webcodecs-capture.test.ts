/**
 * WebCodecs capture — real browser lane (F.6). Exercises VideoEncoder when available.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { webcodecsAbsent } from '../helpers/capabilities.browser.js';
import { WebCodecsCapture } from '../../packages/web/src/capture/webcodecs.js';

describe.skipIf(webcodecsAbsent)('WebCodecsCapture — browser lane', () => {
  it('encodes a single frame to H.264 when VideoEncoder is available', async () => {
    const capture = WebCodecsCapture.make({ codec: 'avc1.42001E', bitrate: 500_000 });
    await capture.init({ width: 64, height: 64, fps: 30 });

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#336699';
    ctx.fillRect(0, 0, 64, 64);

    const bitmap = await createImageBitmap(canvas);
    await capture.capture({ frame: 0, timestamp: 0, bitmap });
    const result = await capture.finalize();

    expect(result.frames).toBe(1);
    expect(result.blob.size).toBeGreaterThan(0);
    bitmap.close();
  });
});
