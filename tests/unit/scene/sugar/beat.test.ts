import { describe, it, expect } from 'vitest';
import { Beat, resolveBeat, resolveFrameMark, addFrameMarks } from '@liteship/scene';

describe('Beat', () => {
  it('tags a beat count without resolving to frames', () => {
    const b = Beat(4);
    expect(b._tag).toBe('beat');
    expect(b.count).toBe(4);
  });

  it('resolveBeat converts using BPM + fps', () => {
    const f = resolveBeat(Beat(4), { bpm: 128, fps: 60 });
    expect(f).toBeCloseTo(112.5, 1);
  });

  it('resolveBeat accepts fractional beats', () => {
    const half = resolveBeat(Beat(0.5), { bpm: 120, fps: 60 });
    expect(half).toBeCloseTo(15, 1);
  });
});

describe('resolveFrameMark', () => {
  const ctx = { bpm: 128, fps: 60 };

  it('passes raw frame numbers through unchanged', () => {
    expect(resolveFrameMark(42, ctx)).toBe(42);
  });

  it('resolves beat handles via scene BPM + fps', () => {
    expect(resolveFrameMark(Beat(8), ctx)).toBeCloseTo(225, 6);
  });

  it('resolves a deferred frame+beat sum as frames + resolved beats', () => {
    const sum = addFrameMarks(30, Beat(8));
    expect(resolveFrameMark(sum, ctx)).toBeCloseTo(255, 6);
  });
});

describe('addFrameMarks', () => {
  it('number + number stays a plain number', () => {
    expect(addFrameMarks(10, 20)).toBe(30);
  });

  it('beat + beat stays a beat handle (counts accumulate)', () => {
    expect(addFrameMarks(Beat(2), Beat(3))).toEqual(Beat(5));
  });

  it('mixed units defer as a mark-sum until compile resolves them', () => {
    expect(addFrameMarks(30, Beat(8))).toEqual({ _tag: 'mark-sum', frames: 30, beats: 8 });
  });

  it('zero offsets renormalize to the narrowest representation', () => {
    expect(addFrameMarks(Beat(4), 0)).toEqual(Beat(4));
    expect(addFrameMarks(15, Beat(0))).toBe(15);
  });

  it('a mark-sum composes with further offsets', () => {
    const first = addFrameMarks(30, Beat(8));
    expect(addFrameMarks(first, Beat(2))).toEqual({ _tag: 'mark-sum', frames: 30, beats: 10 });
    expect(addFrameMarks(first, 5)).toEqual({ _tag: 'mark-sum', frames: 35, beats: 8 });
  });
});
