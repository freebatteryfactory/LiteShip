import { describe, expect, test } from 'vitest';
import { driveAudioFromAnalyser, readAudioSignal } from '@liteship/astro/runtime';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe('@liteship/astro/runtime audio route in a real browser clock', () => {
  test('publishes through browser rAF and stops without a trailing frame', async () => {
    const analyser = {
      fftSize: 16,
      getFloatTimeDomainData(buffer: Float32Array) {
        buffer.fill(0.25);
      },
    } as AnalyserNode;

    const stop = driveAudioFromAnalyser(analyser);
    await nextFrame();
    expect(readAudioSignal('amplitude')).toBeCloseTo(0.25, 6);

    stop();
    await nextFrame();
    expect(readAudioSignal('amplitude')).toBe(0);
    expect(readAudioSignal('beat')).toBe(0);
  });
});
