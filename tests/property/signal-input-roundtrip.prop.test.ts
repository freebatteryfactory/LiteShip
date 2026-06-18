/**
 * Drift guard (property-based) for the sanctioned SignalSource <-> SignalInput
 * bridge in `@czap/core` (`signal-input.ts`).
 *
 * LAW: `inputToSource(sourceToInput(s))` equals `s` after normalization of its
 * omitted discriminants, for every recognized `SignalSource`. The vocabulary
 * is the source of truth; the dot-string is a lossless projection of it.
 *
 * This pins the bridge so the runtime readers (boundary.ts, inspector.ts,
 * css-quantize.ts) that now derive their axis from this single parse cannot
 * silently diverge from the typed union.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { sourceToInput, inputToSource, type SignalSource } from '@czap/core';

/** Normalize a source the way `Signal.make`/the bridge do (fill omitted defaults). */
function normalize(s: SignalSource): SignalSource {
  switch (s.type) {
    case 'viewport':
      return { type: 'viewport', axis: s.axis ?? 'width' };
    case 'scroll':
      return { type: 'scroll', axis: s.axis ?? 'y' };
    case 'pointer':
      return { type: 'pointer', axis: s.axis ?? 'x' };
    case 'time':
      return { type: 'time', mode: s.mode ?? 'elapsed' };
    case 'audio':
      return { type: 'audio', mode: s.mode ?? 'sample' };
    case 'media':
    case 'custom':
      return s;
  }
}

const arbSource: fc.Arbitrary<SignalSource> = fc.oneof(
  fc.constantFrom<SignalSource>(
    { type: 'viewport', axis: 'width' },
    { type: 'viewport', axis: 'height' },
    { type: 'scroll', axis: 'x' },
    { type: 'scroll', axis: 'y' },
    { type: 'scroll', axis: 'progress' },
    { type: 'pointer', axis: 'x' },
    { type: 'pointer', axis: 'y' },
    { type: 'pointer', axis: 'pressure' },
    { type: 'time', mode: 'elapsed' },
    { type: 'time', mode: 'absolute' },
    { type: 'time', mode: 'scheduled' },
    { type: 'audio', mode: 'sample' },
    { type: 'audio', mode: 'normalized' },
    { type: 'audio', mode: 'amplitude' },
    { type: 'audio', mode: 'beat' },
  ),
  // media/custom carry arbitrary free-form payloads.
  fc.string().map((query): SignalSource => ({ type: 'media', query })),
  fc.string().map((id): SignalSource => ({ type: 'custom', id })),
);

describe('SignalSource <-> SignalInput bridge', () => {
  test('round-trips every recognized source after normalization', () => {
    fc.assert(
      fc.property(arbSource, (source) => {
        const back = inputToSource(sourceToInput(source));
        expect(back).toEqual(normalize(source));
      }),
    );
  });

  test('canonical dot-strings parse to their typed source', () => {
    expect(inputToSource('viewport.width')).toEqual({ type: 'viewport', axis: 'width' });
    expect(inputToSource('viewport.height')).toEqual({ type: 'viewport', axis: 'height' });
    expect(inputToSource('scroll.progress')).toEqual({ type: 'scroll', axis: 'progress' });
    expect(inputToSource('audio.amplitude')).toEqual({ type: 'audio', mode: 'amplitude' });
    expect(inputToSource('audio.beat')).toEqual({ type: 'audio', mode: 'beat' });
  });

  test('bare family names resolve to the family default', () => {
    expect(inputToSource('viewport')).toEqual({ type: 'viewport', axis: 'width' });
    expect(inputToSource('scroll')).toEqual({ type: 'scroll', axis: 'y' });
    expect(inputToSource('time')).toEqual({ type: 'time', mode: 'elapsed' });
    expect(inputToSource('audio')).toEqual({ type: 'audio', mode: 'sample' });
  });

  test('inputs outside the vocabulary map to undefined (lenient brand)', () => {
    for (const bad of ['brightness', 'b', 'scroll.depth', 'viewport.aspect', 'pointer.z', '', 'network.rtt']) {
      expect(inputToSource(bad)).toBeUndefined();
    }
  });

  test('media:/custom: colon payloads round-trip including dotted values', () => {
    expect(inputToSource('media:(min-width: 600px)')).toEqual({ type: 'media', query: '(min-width: 600px)' });
    expect(inputToSource('custom:my.signal.id')).toEqual({ type: 'custom', id: 'my.signal.id' });
  });
});
