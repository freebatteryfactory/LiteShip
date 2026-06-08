import { describe, it, expect } from 'vitest';
import { ffmpegRenderCapable, probeFfmpegRender } from '@czap/command/host';

describe('ffmpeg render probe', () => {
  it('probeFfmpegRender returns a structured result', () => {
    const probe = probeFfmpegRender();
    expect(typeof probe.ok).toBe('boolean');
    expect(typeof probe.detail).toBe('string');
    expect(probe.detail.length).toBeGreaterThan(0);
    if (!probe.ok) {
      expect(typeof probe.hint).toBe('string');
    }
  });

  it('ffmpegRenderCapable matches probeFfmpegRender().ok', () => {
    expect(ffmpegRenderCapable()).toBe(probeFfmpegRender().ok);
  });
});
