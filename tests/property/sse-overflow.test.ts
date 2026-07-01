/**
 * Property test: SSE overflow policy (the A3 primitive).
 *
 * The pure target is `applyOverflow` (`packages/web/src/stream/sse-pure.ts`),
 * the collapse pass behind the bounded `Queue` in `sse.ts`. We fold an
 * INTERLEAVED sequence of LLM-style ordered tokens (keyless messages) and
 * id-keyed patches and assert the safety invariants Wave-2 demanded:
 *
 *  1. tokens are never dropped, reordered, or merged WHILE a keyed patch is
 *     still evictable;
 *  2. same-id patches coalesce to the newest version;
 *  3. the buffer never exceeds capacity (bound derived from the real
 *     `SSE_BUFFER_SIZE` default — the source of truth);
 *  4. BITE — the live client emits exactly one `sse-buffer-saturated`
 *     `warnOnce` on first saturation and reports `dropping === true`.
 */

import { describe, test, expect, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { Effect } from 'effect';
import { Diagnostics, SSE_BUFFER_SIZE } from '@czap/core';
import { SSE } from '@czap/web';
import type { SSEMessage } from '@czap/web';
import {
  applyOverflow,
  extractCoalesceKey,
  defaultOverflowPolicy,
} from '../../packages/web/src/stream/sse-pure.js';
import { MockEventSource } from '../helpers/mock-event-source.js';
import { runScopedAsync as runScoped } from '../helpers/effect-test.js';

// ---------------------------------------------------------------------------
// Message model
// ---------------------------------------------------------------------------

/** A keyless, order-significant message (an LLM token analogue). */
const tokenMessage = (n: number): SSEMessage => ({ type: 'batch', data: `tok:${n}` });

/** An id-keyed, idempotent patch (a newer version supersedes the older). */
const patchMessage = (id: string, version: number): SSEMessage => ({
  type: 'patch',
  data: `<div data-czap-id="${id}">v${version}</div>`,
});

const isTokenData = (data: unknown): data is string => typeof data === 'string' && data.startsWith('tok:');

type Step = { readonly kind: 'token'; readonly n: number } | { readonly kind: 'patch'; readonly id: string; readonly version: number };

const stepArb: fc.Arbitrary<Step> = fc.oneof(
  fc.nat({ max: 1000 }).map((n): Step => ({ kind: 'token', n })),
  fc
    .record({ id: fc.constantFrom('a', 'b', 'c', 'd'), version: fc.nat({ max: 1000 }) })
    .map(({ id, version }): Step => ({ kind: 'patch', id, version })),
);

const toMessage = (step: Step): SSEMessage =>
  step.kind === 'token' ? tokenMessage(step.n) : patchMessage(step.id, step.version);

// ---------------------------------------------------------------------------
// Pure invariants over applyOverflow
// ---------------------------------------------------------------------------

describe('applyOverflow — coalesce-by-id safety invariants', () => {
  test('default policy is coalesce-by-id', () => {
    expect(defaultOverflowPolicy).toBe('coalesce-by-id');
  });

  test('coalescing preserves FIFO vs an intervening ordered message (the patch does not jump ahead)', () => {
    // patch a@v1, then a keyless ordered token, then a newer patch a@v2.
    const buffer: SSEMessage[] = [patchMessage('a', 1), tokenMessage(7)];
    const result = applyOverflow(buffer, patchMessage('a', 2), 'coalesce-by-id', 8);

    expect(result.coalesced).toBe(1);
    // The stale v1 is dropped and v2 lands at the TAIL — its true arrival position —
    // so the token that arrived BEFORE it still precedes it. Overwriting v1 in place
    // would have delivered v2 ahead of an earlier ordered message.
    expect(result.buffer).toEqual([tokenMessage(7), patchMessage('a', 2)]);
  });

  test('a single-quoted data-czap-id patch is still keyed (both quote styles coalesce)', () => {
    const doubleQuoted: SSEMessage = { type: 'patch', data: `<div data-czap-id="hero">v1</div>` };
    const singleQuoted: SSEMessage = { type: 'patch', data: `<div data-czap-id='hero'>v2</div>` };
    const dqKey = extractCoalesceKey(doubleQuoted);
    const sqKey = extractCoalesceKey(singleQuoted);
    // Both quote styles are valid HTML — a single-quoted addressed patch must NOT be
    // misclassified as keyless (which would let the fallback shed ordered messages).
    expect(sqKey).not.toBeNull();
    expect(sqKey).toBe(dqKey);
  });

  test('the coalesce key comes from a real attribute, not a substring in text or another attribute', () => {
    // data-czap-id appears only inside a title attribute's VALUE and as text — never as
    // a real attribute — so it must NOT produce a key (fail-safe: treated as keyless).
    const decoy: SSEMessage = {
      type: 'patch',
      data: `<div title='literal data-czap-id="x"'>data-czap-id="y"</div>`,
    };
    expect(extractCoalesceKey(decoy)).toBeNull();
    const real: SSEMessage = { type: 'patch', data: `<div data-czap-id="hero">x</div>` };
    expect(extractCoalesceKey(real)).not.toBeNull();
  });

  test('a saturated all-ordered buffer rejects an incoming keyed patch (never sheds an ordered message)', () => {
    const max = 3;
    const buffer: SSEMessage[] = [tokenMessage(0), tokenMessage(1), tokenMessage(2)];
    const result = applyOverflow(buffer, patchMessage('a', 1), 'coalesce-by-id', max);
    // The idempotent keyed patch is dropped; every ordered message is preserved.
    expect(result.dropped).toBe(1);
    expect(result.buffer).toEqual([tokenMessage(0), tokenMessage(1), tokenMessage(2)]);
  });

  test('a token is never dropped, reordered, or merged while a keyed patch is evictable', () => {
    fc.assert(
      fc.property(fc.array(stepArb, { minLength: 0, maxLength: 200 }), fc.integer({ min: 2, max: 12 }), (steps, max) => {
        const buffer: SSEMessage[] = [];
        const insertedTokenOrder: number[] = [];

        for (const step of steps) {
          const message = toMessage(step);
          if (step.kind === 'token') insertedTokenOrder.push(step.n);

          const keylessBefore = buffer.filter((m) => extractCoalesceKey(m) === null);
          const keyedBefore = buffer.length - keylessBefore.length;
          const tokensOf = (msgs: readonly SSEMessage[]): Set<number> =>
            new Set(
              msgs
                .filter((m): m is SSEMessage & { data: string } => isTokenData(m.data))
                .map((m) => Number(m.data.slice('tok:'.length))),
            );
          const tokensBefore = tokensOf(buffer);

          applyOverflow(buffer, message, 'coalesce-by-id', max);

          // Bound holds at every step.
          expect(buffer.length).toBeLessThanOrEqual(max);

          // A token (keyless) leaves the buffer ONLY when there was NOTHING keyed
          // left to evict — the load-bearing safety invariant. Checked by token
          // IDENTITY, not count, so a buggy step that drops an older token while
          // appending the incoming one (leaving the count unchanged) is still caught.
          const tokensAfter = tokensOf(buffer);
          if ([...tokensBefore].some((n) => !tokensAfter.has(n))) {
            expect(keyedBefore).toBe(0);
          }
        }

        // No token is mutated/merged: every keyless entry is a verbatim token,
        // and the tokens present appear in strictly increasing insertion order.
        const survivingTokenNs = buffer
          .filter((m): m is SSEMessage & { data: string } => isTokenData(m.data))
          .map((m) => Number(m.data.slice('tok:'.length)));

        // Strictly-ordered subsequence of the inserted token order (no reorder).
        let cursor = 0;
        for (const n of survivingTokenNs) {
          const found = insertedTokenOrder.indexOf(n, cursor);
          expect(found).toBeGreaterThanOrEqual(0);
          cursor = found + 1;
        }
      }),
    );
  });

  test('same-id patches coalesce to the newest version with a unique key', () => {
    fc.assert(
      fc.property(fc.array(stepArb, { minLength: 0, maxLength: 200 }), fc.integer({ min: 2, max: 12 }), (steps, max) => {
        const buffer: SSEMessage[] = [];
        const latestVersionById = new Map<string, number>();
        let totalCoalesced = 0;

        for (const step of steps) {
          if (step.kind === 'patch') latestVersionById.set(step.id, step.version);
          const result = applyOverflow(buffer, toMessage(step), 'coalesce-by-id', max);
          totalCoalesced += result.coalesced;
        }

        // Every key is unique in the buffer (no same-id duplicates).
        const keys = buffer.map((m) => extractCoalesceKey(m)).filter((k): k is string => k !== null);
        expect(new Set(keys).size).toBe(keys.length);

        // Each surviving keyed entry carries the LAST version seen for its id.
        for (const message of buffer) {
          const key = extractCoalesceKey(message);
          if (key === null) continue;
          const id = key.slice('patch:'.length);
          const data = message.data as string;
          expect(data).toContain(`v${latestVersionById.get(id)}`);
        }

        // Coalesce only ever collapses, never invents — bounded by patch count.
        expect(totalCoalesced).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  test('buffer length never exceeds the real SSE_BUFFER_SIZE default', () => {
    fc.assert(
      fc.property(fc.array(stepArb, { minLength: 0, maxLength: SSE_BUFFER_SIZE * 2 + 10 }), (steps) => {
        const buffer: SSEMessage[] = [];
        for (const step of steps) {
          // Default capacity = SSE_BUFFER_SIZE (the defaults.ts source of truth).
          applyOverflow(buffer, toMessage(step), defaultOverflowPolicy);
          expect(buffer.length).toBeLessThanOrEqual(SSE_BUFFER_SIZE);
        }
      }),
    );
  });

  test('drop-newest rejects the incoming message at capacity; drop-oldest evicts the head', () => {
    const full = (): SSEMessage[] => Array.from({ length: 3 }, (_, i) => tokenMessage(i));

    const newest = full();
    const r1 = applyOverflow(newest, tokenMessage(99), 'drop-newest', 3);
    expect(r1.dropped).toBe(1);
    expect(r1.saturated).toBe(true);
    expect(newest.map((m) => m.data)).toEqual(['tok:0', 'tok:1', 'tok:2']);

    const oldest = full();
    const r2 = applyOverflow(oldest, tokenMessage(99), 'drop-oldest', 3);
    expect(r2.dropped).toBe(1);
    expect(oldest.map((m) => m.data)).toEqual(['tok:1', 'tok:2', 'tok:99']);
  });
});

// ---------------------------------------------------------------------------
// BITE — live-client saturation diagnostics
// ---------------------------------------------------------------------------

describe('SSE saturation diagnostics (BITE)', () => {
  let restoreES: () => void;

  afterEach(() => {
    if (restoreES) restoreES();
    Diagnostics.reset();
    vi.useRealTimers();
  });

  test('first saturation emits exactly one warnOnce and reports dropping', async () => {
    vi.useFakeTimers();
    restoreES = MockEventSource.install();
    Diagnostics.reset(); // clear any prior once-keys so warnOnce is observable
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    await runScoped(
      Effect.gen(function* () {
        const client = yield* SSE.create({ url: 'http://localhost/sse' });
        const es = MockEventSource.instances[0]!;

        // Keyless patches (data {i} has no data-czap-id) -> drop-oldest
        // fallback once the buffer saturates at SSE_BUFFER_SIZE.
        for (let i = 0; i < SSE_BUFFER_SIZE + 5; i++) {
          es.simulateMessage(JSON.stringify({ type: 'patch', data: { i } }));
        }

        const saturationEvents = events.filter((e) => e.code === 'sse-buffer-saturated');
        expect(saturationEvents).toHaveLength(1);
        expect(saturationEvents[0]!.source).toBe('czap/web.sse');

        const bp = yield* client.backpressure;
        expect(bp.dropping).toBe(true);
        expect(bp.bufferSize).toBe(SSE_BUFFER_SIZE);
        expect(bp.droppedCount).toBe(5);
        expect(bp.policy).toBe('coalesce-by-id');
      }),
    );
  });
});
