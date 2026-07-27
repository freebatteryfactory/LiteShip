// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from 'vitest';
import { Diagnostics } from '@liteship/core';
import {
  attachAudioObserver,
  driveAudioFromAnalyser,
  readAudioSignal,
} from '@liteship/astro/runtime';
import { __resetAudioSignalForTest } from '../../../packages/astro/src/runtime/audio-signal.js';

afterEach(() => {
  __resetAudioSignalForTest();
  Diagnostics.clearOnce();
  vi.unstubAllGlobals();
});

describe('@liteship/astro/runtime live audio host contract', () => {
  test('publishes analyser frames and stop is idempotent with no later mutation', () => {
    let nextId = 1;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      frames.delete(id);
    });

    const analyser = {
      fftSize: 8,
      getFloatTimeDomainData(buffer: Float32Array) {
        buffer.fill(0.5);
      },
    } as AnalyserNode;

    const stop = driveAudioFromAnalyser(analyser);
    const first = frames.entries().next().value as [number, FrameRequestCallback];
    frames.delete(first[0]);
    first[1](16);

    expect(readAudioSignal('amplitude')).toBeCloseTo(0.5, 6);
    expect(frames.size).toBe(1);

    stop();
    stop();
    expect(readAudioSignal('amplitude')).toBe(0);
    expect(readAudioSignal('beat')).toBe(0);
    expect(frames.size).toBe(0);
  });

  test('refuses both public live routes when the host has no complete animation clock', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.stubGlobal('cancelAnimationFrame', undefined);
    const { sink, events } = Diagnostics.createBufferSink();
    const previous = Diagnostics.setSink(sink);
    const getFrame = vi.fn();
    try {
      expect(attachAudioObserver(vi.fn())).toBeNull();
      const stop = driveAudioFromAnalyser({ fftSize: 8, getFloatTimeDomainData: getFrame } as never);
      expect(() => {
        stop();
        stop();
      }).not.toThrow();
      expect(getFrame).not.toHaveBeenCalled();
      expect(events.filter((event) => event.code === 'astro/audio/animation-clock-unavailable')).toHaveLength(1);
    } finally {
      Diagnostics.setSink(previous);
    }
  });
});
