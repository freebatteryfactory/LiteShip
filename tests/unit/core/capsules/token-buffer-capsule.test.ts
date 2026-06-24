import { describe, it, expect } from 'vitest';
import { tokenBufferCapsule } from '@czap/core';
import { hasTag } from '@czap/error';

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
    expect(inv!.check({ _tag: 'reset' }, { phase: 'buffering', tokens: [], totalBytes: 0 })).toBe(false);
    // Empty + idle → ok.
    expect(inv!.check({ _tag: 'reset' }, { phase: 'idle', tokens: [], totalBytes: 0 })).toBe(true);
    // Non-empty + buffering → ok.
    expect(inv!.check({ _tag: 'push', token: 'a' }, { phase: 'buffering', tokens: ['a'], totalBytes: 1 })).toBe(true);
  });

  it('totalBytes-tracks-tokens rejects mismatched byte total', () => {
    const inv = tokenBufferCapsule.invariants.find((i) => i.name === 'totalBytes-tracks-tokens');
    expect(inv).toBeDefined();
    expect(inv!.check(undefined, { tokens: ['ab', 'c'], totalBytes: 3 })).toBe(true);
    expect(inv!.check(undefined, { tokens: ['ab', 'c'], totalBytes: 5 })).toBe(false);
    expect(inv!.check(undefined, { tokens: [], totalBytes: 0 })).toBe(true);
  });

  it('totalBytes counts UTF-8 bytes, not UTF-16 code units', () => {
    // 'é' is 1 UTF-16 code unit but 2 UTF-8 bytes; '🚀' is 2 units, 4 bytes.
    const inv = tokenBufferCapsule.invariants.find((i) => i.name === 'totalBytes-tracks-tokens');
    expect(inv!.check(undefined, { tokens: ['é', '🚀'], totalBytes: 6 })).toBe(true);
    expect(inv!.check(undefined, { tokens: ['é', '🚀'], totalBytes: 3 })).toBe(false);

    const step = tokenBufferCapsule.step!;
    const state = step(tokenBufferCapsule.initialState!, { _tag: 'push', token: 'é🚀' });
    expect(state.totalBytes).toBe(6);
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

  it('step rejects an out-of-type event _tag with a typed InvariantViolationError (exhaustiveness guard)', () => {
    // The TokenEvent union forbids any _tag outside push/flush/reset, so this
    // is reachable only by defeating the types — exactly the bad-decoded-data
    // case the `default: assertNever` arm exists for. It must fail as the
    // algebra's InvariantViolationError, never silently fold to a no-op.
    const step = tokenBufferCapsule.step!;
    const initial = tokenBufferCapsule.initialState!;
    const forged = { _tag: 'evict' } as unknown as Parameters<typeof step>[1];
    try {
      step(initial, forged);
      throw new Error('expected step to throw on an out-of-type event _tag');
    } catch (e) {
      expect(hasTag(e, 'InvariantViolationError')).toBe(true);
      expect((e as { invariant: string }).invariant).toBe('TokenEvent._tag');
    }
  });

  it('step exercises the production overflow: capacity stays 256 and the oldest token drops', () => {
    // The rebuild must use the production default capacity, not an
    // expanding one — otherwise the harness never reaches the ring's
    // oldest-overwrite path and the state diverges from the hot path.
    const step = tokenBufferCapsule.step!;
    let state = tokenBufferCapsule.initialState!;
    for (let i = 0; i < 257; i++) {
      state = step(state, { _tag: 'push', token: `t${i}` });
    }
    expect(state.tokens).toHaveLength(256);
    expect(state.tokens[0]).toBe('t1'); // t0 overwritten by the 257th push
    expect(state.tokens[255]).toBe('t256');
    expect(state.totalBytes).toBe(state.tokens.reduce((s, t) => s + t.length, 0));
  });
});
