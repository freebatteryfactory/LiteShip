import { describe, it, expect } from 'vitest';
import { tokenBufferCapsule } from '@czap/core';

describe('tokenBufferCapsule', () => {
  it('declares a stateMachine for the LLM token buffer', () => {
    expect(tokenBufferCapsule._kind).toBe('stateMachine');
    expect(tokenBufferCapsule.name).toBe('core.token-buffer');
  });

  it('declares bounded allocation class for zero-GC hot path', () => {
    expect(tokenBufferCapsule.budgets.allocClass).toBe('bounded');
  });

  it('has at least two invariants', () => {
    expect(tokenBufferCapsule.invariants.length).toBeGreaterThanOrEqual(2);
  });

  it('phase-matches-content rejects empty-buffer-while-buffering', () => {
    const inv = tokenBufferCapsule.invariants.find((i) => i.name === 'phase-matches-content');
    expect(inv).toBeDefined();
    // Empty + buffering → invalid.
    expect(
      inv!.check({ _tag: 'reset' }, { phase: 'buffering', tokens: [], totalBytes: 0 }),
    ).toBe(false);
    // Empty + idle → ok.
    expect(
      inv!.check({ _tag: 'reset' }, { phase: 'idle', tokens: [], totalBytes: 0 }),
    ).toBe(true);
    // Non-empty + buffering → ok.
    expect(
      inv!.check({ _tag: 'push', token: 'a' }, { phase: 'buffering', tokens: ['a'], totalBytes: 1 }),
    ).toBe(true);
  });

  it('totalBytes-tracks-tokens rejects mismatched byte total', () => {
    const inv = tokenBufferCapsule.invariants.find((i) => i.name === 'totalBytes-tracks-tokens');
    expect(inv).toBeDefined();
    expect(
      inv!.check(undefined, { tokens: ['ab', 'c'], totalBytes: 3 }),
    ).toBe(true);
    expect(
      inv!.check(undefined, { tokens: ['ab', 'c'], totalBytes: 5 }),
    ).toBe(false);
    expect(
      inv!.check(undefined, { tokens: [], totalBytes: 0 }),
    ).toBe(true);
  });

  it('declares the harness channel: initialState + step', () => {
    expect(tokenBufferCapsule.initialState).toEqual({ phase: 'idle', tokens: [], totalBytes: 0 });
    expect(typeof tokenBufferCapsule.step).toBe('function');
  });

  it('step drives the production TokenBuffer through push/flush/reset', () => {
    const step = tokenBufferCapsule.step!;
    const initial = tokenBufferCapsule.initialState!;

    const afterPush = step(initial, { _tag: 'push', token: 'hello' });
    expect(afterPush).toEqual({ phase: 'buffering', tokens: ['hello'], totalBytes: 5 });

    const afterSecond = step(afterPush, { _tag: 'push', token: 'ab' });
    expect(afterSecond).toEqual({ phase: 'buffering', tokens: ['hello', 'ab'], totalBytes: 7 });

    const afterFlush = step(afterSecond, { _tag: 'flush' });
    expect(afterFlush).toEqual({ phase: 'draining', tokens: [], totalBytes: 0 });

    const afterReset = step(afterSecond, { _tag: 'reset' });
    expect(afterReset).toEqual({ phase: 'idle', tokens: [], totalBytes: 0 });
  });

  it('step preserves FIFO order through the ring buffer rebuild', () => {
    const step = tokenBufferCapsule.step!;
    let state = tokenBufferCapsule.initialState!;
    for (const token of ['a', 'b', 'c', 'd']) {
      state = step(state, { _tag: 'push', token });
    }
    expect(state.tokens).toEqual(['a', 'b', 'c', 'd']);
  });
});
