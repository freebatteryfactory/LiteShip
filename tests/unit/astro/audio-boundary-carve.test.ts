// @vitest-environment jsdom
/**
 * ACCEPTANCE: a `audio.amplitude` boundary carves named states through the
 * EXISTING source-agnostic carve-path when fed live amplitude values.
 *
 *   Boundary.make({ input: 'audio.amplitude', at: [[0,'quiet'],[0.6,'loud']] })
 *     → readSignalValue('audio.amplitude')   (reads the producer's published RMS)
 *     → evaluateBoundary                       (axis-agnostic evaluator)
 *     → applyBoundaryState                     (sets data-czap-state + CSS)
 *
 * This proves the audio plumb reuses the same evaluator/carve-path the
 * viewport/scroll families use — no audio-specific evaluator was added.
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Boundary } from '@czap/core';
import {
  parseBoundary,
  readSignalValue,
  evaluateBoundary,
  applyBoundaryState,
} from '../../../packages/astro/src/runtime/boundary.js';
import { __resetAudioSignalForTest, __setAudioSignalForTest } from '../../../packages/astro/src/runtime/audio-signal.js';

function serialize(input: string, at: readonly (readonly [number, string])[]): string {
  const b = Boundary.make({ input, at: at as never });
  return JSON.stringify({ input, thresholds: [...b.thresholds], states: [...b.states] });
}

describe('audio.amplitude boundary carve-path', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    __resetAudioSignalForTest();
  });
  afterEach(() => {
    __resetAudioSignalForTest();
  });

  test('amplitude crossing flips data-czap-state through the shared evaluator', () => {
    const el = document.createElement('div');
    el.setAttribute(
      'data-czap-boundary',
      serialize('audio.amplitude', [
        [0, 'quiet'],
        [0.6, 'loud'],
      ]),
    );
    document.body.appendChild(el);

    const rb = parseBoundary(el.getAttribute('data-czap-boundary'));
    expect(rb).not.toBeNull();

    const carve = (): string => {
      const value = readSignalValue(rb!.input);
      expect(value).not.toBeUndefined();
      const state = evaluateBoundary(rb!, value!);
      applyBoundaryState(el, rb!, { discrete: { [rb!.name]: state } }, 'czap:satellite-state');
      return state;
    };

    // Quiet: amplitude 0.2 < 0.6 → 'quiet'
    __setAudioSignalForTest({ amplitude: 0.2 });
    expect(carve()).toBe('quiet');
    expect(el.getAttribute('data-czap-state')).toBe('quiet');

    // Loud: amplitude 0.8 >= 0.6 → 'loud'
    __setAudioSignalForTest({ amplitude: 0.8 });
    expect(carve()).toBe('loud');
    expect(el.getAttribute('data-czap-state')).toBe('loud');

    // Back to quiet.
    __setAudioSignalForTest({ amplitude: 0.1 });
    expect(carve()).toBe('quiet');
    expect(el.getAttribute('data-czap-state')).toBe('quiet');
  });

  test('readSignalValue reads audio.beat as a 0/1 pulse', () => {
    __setAudioSignalForTest({ beat: 0 });
    expect(readSignalValue('audio.beat')).toBe(0);
    __setAudioSignalForTest({ beat: 1 });
    expect(readSignalValue('audio.beat')).toBe(1);
  });

  test('offline audio modes (sample/normalized) read frozen 0 — no live producer', () => {
    expect(readSignalValue('audio.sample')).toBe(0);
    expect(readSignalValue('audio.normalized')).toBe(0);
  });
});
