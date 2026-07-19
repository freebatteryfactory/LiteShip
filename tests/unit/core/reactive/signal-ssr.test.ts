// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { Signal } from '@liteship/core';

/** Signal SSR behavior — Wave 6 plain CellKernel (Effect-free): inert reads when
 * window-specific sources / requestAnimationFrame are unavailable on the server. */

describe('Signal.make in server environments', () => {
  test('falls back to inert values when window-specific sources are unavailable', () => {
    const viewport = Signal.make({ type: 'viewport', axis: 'height' });
    const scroll = Signal.make({ type: 'scroll', axis: 'progress' });
    const media = Signal.make({ type: 'media', query: '(prefers-reduced-motion: reduce)' });

    expect({ viewport: viewport.read(), scroll: scroll.read(), media: media.read() }).toEqual({
      viewport: 0,
      scroll: 0,
      media: 0,
    });
  });

  test('time-elapsed signal exits cleanly when requestAnimationFrame is unavailable', () => {
    const signal = Signal.make({ type: 'time', mode: 'elapsed' });
    expect(signal.read()).toBe(0);
  });
});
