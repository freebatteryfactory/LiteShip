/**
 * clamp owner pins — the unit-interval clamp + the endpoint-inclusive
 * frame→t law the ~8 former inline copies relied on ([DUP] Wave 7).
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { clamp01, frameToT } from '@liteship/core';

describe('clamp01', () => {
  it('leaves the closed-interval endpoints fixed', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
  });

  it('passes an interior value through unchanged', () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(0.25)).toBe(0.25);
  });

  it('clamps below 0 up to 0 and above 1 down to 1', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(2)).toBe(1);
  });
});

describe('frameToT', () => {
  it('maps the first and last frame to the [0,1] endpoints (endpoint-inclusive law)', () => {
    // frame / max(1, totalFrames - 1): frame 0 → 0, frame N-1 → 1.
    expect(frameToT(0, 10)).toBe(0);
    expect(frameToT(9, 10)).toBe(1);
    expect(frameToT(0, 2)).toBe(0);
    expect(frameToT(1, 2)).toBe(1);
  });

  it('maps interior frames linearly across the inclusive span', () => {
    expect(frameToT(5, 11)).toBe(0.5); // 5 / (11 - 1)
    expect(frameToT(2, 5)).toBe(0.5); // 2 / (5 - 1)
  });

  it('degenerates a single-frame (or empty) timeline to 0', () => {
    // totalFrames <= 1 has no span — max(1, totalFrames - 1) === 1, and the only frame is 0.
    expect(frameToT(0, 1)).toBe(0);
    expect(frameToT(0, 0)).toBe(0);
  });

  it('clamps out-of-range frames into [0,1]', () => {
    expect(frameToT(-1, 10)).toBe(0);
    expect(frameToT(20, 10)).toBe(1); // 20 / 9 > 1 → clamped
  });
});
