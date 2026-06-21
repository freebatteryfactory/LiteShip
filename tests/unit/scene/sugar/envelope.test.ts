import { describe, it, expect } from 'vitest';
import { fade, pulse, Beat, resolveEnvelope, envelopeFactor } from '@czap/scene';

describe('envelope helpers', () => {
  it('fade.in returns a linear-in curve over the given span', () => {
    const env = fade.in(Beat(2));
    expect(env._tag).toBe('envelope');
    expect(env.curve).toBe('linear-in');
    expect(env.span).toEqual(Beat(2));
  });
  it('fade.out returns a linear-out curve', () => {
    const env = fade.out(Beat(1));
    expect(env.curve).toBe('linear-out');
  });
  it('pulse.every returns a periodic envelope with amplitude', () => {
    const env = pulse.every(Beat(0.5), { amplitude: 0.3 });
    expect(env._tag).toBe('envelope');
    expect(env.curve).toBe('pulse');
    expect(env.amplitude).toBe(0.3);
    expect(env.period).toEqual(Beat(0.5));
  });
});

describe('resolveEnvelope', () => {
  const ctx = { bpm: 128, fps: 60 };

  it('resolves a fade span to frames via scene BPM + fps', () => {
    const resolved = resolveEnvelope(fade.in(Beat(2)), ctx);
    expect(resolved).toEqual({ curve: 'linear-in', spanFrames: 56.25 });
  });

  it('resolves a pulse period to frames and carries amplitude', () => {
    const resolved = resolveEnvelope(pulse.every(Beat(0.5), { amplitude: 0.3 }), { bpm: 120, fps: 60 });
    expect(resolved).toEqual({ curve: 'pulse', periodFrames: 15, amplitude: 0.3 });
  });
});

describe('envelopeFactor', () => {
  const range = { from: 100, to: 220 };

  it('linear-in ramps 0 -> 1 over the span then holds 1', () => {
    const env = { curve: 'linear-in', spanFrames: 60 } as const;
    expect(envelopeFactor(env, 100, range)).toBe(0);
    expect(envelopeFactor(env, 130, range)).toBeCloseTo(0.5, 6);
    expect(envelopeFactor(env, 160, range)).toBe(1);
    expect(envelopeFactor(env, 200, range)).toBe(1);
  });

  it('linear-out holds 1 until the last span frames then ramps to 0', () => {
    const env = { curve: 'linear-out', spanFrames: 60 } as const;
    expect(envelopeFactor(env, 100, range)).toBe(1);
    expect(envelopeFactor(env, 160, range)).toBe(1);
    expect(envelopeFactor(env, 190, range)).toBeCloseTo(0.5, 6);
    expect(envelopeFactor(env, 220, range)).toBe(0);
  });

  it('pulse peaks at 1 + amplitude on each period boundary and decays back to 1', () => {
    const env = { curve: 'pulse', periodFrames: 15, amplitude: 0.3 } as const;
    expect(envelopeFactor(env, 100, range)).toBeCloseTo(1.3, 6);
    expect(envelopeFactor(env, 107.5, range)).toBeCloseTo(1.15, 6);
    expect(envelopeFactor(env, 115, range)).toBeCloseTo(1.3, 6);
  });
});
