/**
 * #133 — graph-native stream recovery: discrete/continuous replay law.
 */
import { describe, expect, test } from 'vitest';
import {
  StateCell,
  asReplayableRecoveryCell,
  filterDiscreteSnapshotSignals,
  isReplayHtmlPatch,
  replayDroppedSignals,
  signalPayloadKind,
  signalSourceKind,
} from '@czap/core';

describe('stream-recovery replay law', () => {
  test('recovery entry type-refuses continuous cells — only discrete/replayable recover', () => {
    const discrete = StateCell.snapshot('mode', 'discrete', 'quantizer', 'open', 1, 0, 3);
    const continuous = StateCell.snapshot('scroll', 'continuous', 'synthetic', 'live', 0, 0, 0, 0.42);

    expect(asReplayableRecoveryCell(discrete)).toBe(discrete);
    expect(asReplayableRecoveryCell(continuous)).toBeUndefined();
  });

  test('classifies canonical signal sources by discrete/continuous law', () => {
    expect(signalSourceKind({ type: 'scroll', axis: 'progress' })).toBe('continuous');
    expect(signalSourceKind({ type: 'pointer', axis: 'x' })).toBe('continuous');
    expect(signalSourceKind({ type: 'time', mode: 'elapsed' })).toBe('continuous');
    expect(signalSourceKind({ type: 'audio', mode: 'amplitude' })).toBe('continuous');
    expect(signalSourceKind({ type: 'audio', mode: 'sample' })).toBe('discrete');
    expect(signalSourceKind({ type: 'media', query: '(prefers-reduced-motion)' })).toBe('discrete');
    expect(signalSourceKind({ type: 'custom', id: 'workspace.mode' })).toBe('discrete');
  });

  test('discrete SSE state crossings are replayable signal payloads', () => {
    expect(signalPayloadKind({ state: 'open' })).toBe('discrete');
    expect(signalPayloadKind({ type: 'signal', data: { state: 'ready' } })).toBe('discrete');
  });

  test('continuous transients are NOT replayable signal payloads', () => {
    expect(signalPayloadKind({ width: 1280 })).toBe('continuous');
    expect(signalPayloadKind({ viewport: 1024 })).toBe('continuous');
    expect(signalPayloadKind({ 'scroll.progress': 0.5 })).toBe('continuous');
    expect(signalPayloadKind({ 'audio.amplitude': 0.8 })).toBe('continuous');
    expect(signalPayloadKind({ 'time.elapsed': 1200 })).toBe('continuous');
  });

  test('replayDroppedSignals detects missed signal frames in HTML-only replay', () => {
    expect(isReplayHtmlPatch('<p>patch</p>')).toBe(true);
    expect(isReplayHtmlPatch({ html: '<p>x</p>' })).toBe(true);
    expect(isReplayHtmlPatch({ type: 'signal', data: { state: 'open' } })).toBe(false);

    expect(replayDroppedSignals(['<p>a</p>', '<p>b</p>'])).toBe(false);
    expect(
      replayDroppedSignals([
        '<p>a</p>',
        { type: 'signal', data: { state: 'open' } },
      ]),
    ).toBe(true);
  });

  test('filterDiscreteSnapshotSignals replays discrete only — continuous transients excluded', () => {
    const signals = {
      state: 'open',
      'scroll.progress': 0.42,
      width: 1280,
      'audio.amplitude': 0.9,
    };

    expect(filterDiscreteSnapshotSignals(signals)).toEqual([{ state: 'open' }]);
    expect(
      filterDiscreteSnapshotSignals([
        { state: 'ready' },
        { width: 800 },
        { 'scroll.progress': 0.1 },
      ]),
    ).toEqual([{ state: 'ready' }]);
  });
});
