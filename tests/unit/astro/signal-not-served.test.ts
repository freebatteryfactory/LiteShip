// @vitest-environment jsdom
/**
 * Unserved-signal freeze warning: a directive wired to a signal that will never
 * tick must be LOUD, not silently frozen — WITHOUT false-firing on served
 * signals and WITHOUT losing typo detection.
 *
 * The six directive surfaces only have live producers for viewport.* / scroll.* /
 * audio.{amplitude,beat} (see `readSignalValue`); every other recognized input
 * (pointer.* / time.* / media:* / custom:* / audio.{sample,normalized}) FREEZES
 * with no producer. Wave-2 only half-caught this — it MISLABELED recognized
 * vocabulary as a typo. `warnIfSignalUnserved` splits the two with two disjoint
 * codes, and `classifySignalServing` is the source of truth the gate derives
 * `expected` from, so the table auto-adjusts if the served set ever changes.
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Diagnostics } from '@liteship/core';
import {
  classifySignalServing,
  warnIfSignalUnserved,
  type SignalServing,
} from '../../../packages/astro/src/runtime/boundary.js';
import { driveUniformFromSignal } from '../../../packages/astro/src/runtime/uniform-signal.js';

const UNKNOWN_CODE = 'signal-input-unknown';
const UNSERVED_CODE = 'signal-input-unserved-here';

// served: live producer on every surface; frozen: recognized but no producer
// (freezes); typos: outside the SignalSource vocabulary entirely.
const served = ['viewport.width', 'scroll.progress', 'audio.amplitude'];
const frozen = ['pointer.x', 'time.elapsed', 'audio.sample', 'custom:foo', 'media:(min-width:600px)'];
const typos = ['brightness', 'scroll.depth'];

function codeFor(serving: SignalServing): string | null {
  if (serving === 'served') return null;
  return serving === 'unknown-typo' ? UNKNOWN_CODE : UNSERVED_CODE;
}

describe('warnIfSignalUnserved / classifySignalServing', () => {
  let events: ReturnType<typeof Diagnostics.createBufferSink>['events'];

  beforeEach(() => {
    Diagnostics.clearOnce();
    const buffer = Diagnostics.createBufferSink();
    Diagnostics.setSink(buffer.sink);
    events = buffer.events;
  });

  afterEach(() => {
    Diagnostics.reset();
    document.body.innerHTML = '';
  });

  // Pin the classifier against the three families so a regression in the served
  // set (the source of truth the warner reads) surfaces directly, not just via
  // the emission assertions below.
  test('classifySignalServing labels the three families correctly', () => {
    for (const input of served) expect(classifySignalServing(input)).toBe('served');
    for (const input of frozen) expect(classifySignalServing(input)).toBe('frozen-unserved');
    for (const input of typos) expect(classifySignalServing(input)).toBe('unknown-typo');
  });

  for (const input of [...served, ...frozen, ...typos]) {
    test(`warnIfSignalUnserved emits the classified diagnostic for "${input}"`, () => {
      // expected is DERIVED from classifySignalServing — the table auto-adjusts.
      const expectedCode = codeFor(classifySignalServing(input));

      warnIfSignalUnserved(input, { source: 'liteship/astro.test', what: 'boundary signal' });

      const codes = events.map((e) => e.code);
      if (expectedCode === null) {
        expect(codes).toHaveLength(0); // served: silent, no false-fire
      } else {
        expect(codes).toEqual([expectedCode]); // exactly one, the right code
      }
      // The two failure codes are disjoint by construction — never both.
      expect(codes.filter((c) => c === UNKNOWN_CODE && c === UNSERVED_CODE)).toHaveLength(0);
      expect(codes.includes(UNKNOWN_CODE) && codes.includes(UNSERVED_CODE)).toBe(false);
    });
  }

  test('warnOnce dedups a repeated unserved setup read (reinit-safe)', () => {
    warnIfSignalUnserved('time.elapsed', { source: 'liteship/astro.test', what: 'boundary signal' });
    warnIfSignalUnserved('time.elapsed', { source: 'liteship/astro.test', what: 'boundary signal' });
    expect(events.filter((e) => e.code === UNSERVED_CODE)).toHaveLength(1);
  });
});

describe('driveUniformFromSignal split: unserved vs typo', () => {
  let events: ReturnType<typeof Diagnostics.createBufferSink>['events'];
  const stops: Array<() => void> = [];

  beforeEach(() => {
    Diagnostics.clearOnce();
    const buffer = Diagnostics.createBufferSink();
    Diagnostics.setSink(buffer.sink);
    events = buffer.events;
  });

  afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    Diagnostics.reset();
    document.body.innerHTML = '';
  });

  test('a recognized-but-unserved uniform signal warns unserved, not unknown', () => {
    const el = document.createElement('canvas');
    stops.push(driveUniformFromSignal(el, 'time.elapsed', 'u_x'));

    const codes = events.map((e) => e.code);
    expect(codes.filter((c) => c === UNSERVED_CODE)).toHaveLength(1);
    expect(codes.filter((c) => c === UNKNOWN_CODE)).toHaveLength(0);
  });

  test('an out-of-vocabulary uniform signal warns unknown, not unserved (typo detection kept)', () => {
    const el = document.createElement('canvas');
    stops.push(driveUniformFromSignal(el, 'brightness', 'u_x'));

    const codes = events.map((e) => e.code);
    expect(codes.filter((c) => c === UNKNOWN_CODE)).toHaveLength(1);
    expect(codes.filter((c) => c === UNSERVED_CODE)).toHaveLength(0);
  });
});
