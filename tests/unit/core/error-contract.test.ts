/**
 * Error contract — core errors teach: what happened, which subject, the
 * literal next step. Covers the Composable/Receipt/ecs message rewrites,
 * the ValidationError taxonomy swap, and the Token/Style tap-miss
 * diagnostics.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Effect } from 'effect';
import {
  AVBridge,
  Boundary,
  Composable,
  ComposableWorld,
  Diagnostics,
  DirtyFlags,
  Easing,
  FrameBudget,
  HLC,
  Part,
  Receipt,
  Style,
  Token,
  World,
} from '@czap/core';
import { hasTag } from '@czap/error';
import type { EntityId } from '@czap/core';

// ---------------------------------------------------------------------------
// Composable.merge — ValidationError with the next step (items 20/21)
// ---------------------------------------------------------------------------

describe('Composable.merge error contract', () => {
  test('zero entities throws a ValidationError naming the fix', () => {
    try {
      Composable.merge();
      expect.unreachable('expected merge to throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/Composable\.merge/);
      expect(String(error)).toMatch(/pass at least one ComposableEntity/);
    }
  });

  test('a sparse first entity throws with the filter(Boolean) remedy', () => {
    const sparse = [undefined] as unknown as Parameters<typeof Composable.merge>;
    try {
      Composable.merge(...sparse);
      expect.unreachable('expected merge to throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/entities\[0\] is undefined/);
      expect(String(error)).toMatch(/filter\(Boolean\)/);
    }
  });
});

// ---------------------------------------------------------------------------
// ComposableWorld.dense store — call-order precondition (item 24)
// ---------------------------------------------------------------------------

describe('ComposableWorld dense store error contract', () => {
  test('store() before create() names the module and the call to make first', async () => {
    const program = Effect.scoped(
      Effect.gen(function* () {
        const world = yield* World.make();
        const dense = ComposableWorld.dense(world);
        const entity = Composable.make({ value: 1 });
        yield* dense.store(entity, 42);
      }),
    );

    await expect(Effect.runPromise(program)).rejects.toThrow(/ComposableWorld\.store/);
    await expect(Effect.runPromise(program)).rejects.toThrow(/world\.create\(name, capacity\)/);
  });
});

// ---------------------------------------------------------------------------
// Receipt.validateChain — messages carry values and the next step (items 22/23)
// ---------------------------------------------------------------------------

describe('Receipt.validateChain error contract', () => {
  const subject = { type: 'effect' as const, id: 'actor-1' };
  const payload = () => ({ schema_hash: 'sha256:test', content_hash: 'sha256:payload' });

  test('non-genesis first envelope reports the got-value and the remedy', async () => {
    const hlc = HLC.increment(HLC.create('node-a'), 1000);
    const envelope = await Effect.runPromise(
      Receipt.createEnvelope('test', subject, payload(), hlc, 'not-genesis'),
    );

    const err = await Effect.runPromise(Receipt.validateChain([envelope]).pipe(Effect.flip));
    expect(err.message).toMatch(/previous="not-genesis"/);
    expect(err.message).toMatch(/must start at previous="genesis"/);
    expect(err.message).toMatch(/validate from index 0|Receipt\.GENESIS/);
  });

  test('chain break reports both hashes and the recovery step', async () => {
    let hlc = HLC.create('node-a');
    hlc = HLC.increment(hlc, 1000);
    const first = await Effect.runPromise(Receipt.createEnvelope('test', subject, payload(), hlc, Receipt.GENESIS));
    hlc = HLC.increment(hlc, 2000);
    const detached = await Effect.runPromise(
      Receipt.createEnvelope('test', subject, payload(), hlc, 'wrong-previous-hash'),
    );

    const err = await Effect.runPromise(Receipt.validateChain([first, detached]).pipe(Effect.flip));
    expect(err.message).toMatch(/Envelope 1: chain break/);
    expect(err.message).toMatch(/previous="wrong-previous-hash"/);
    expect(err.message).toContain(`envelope 0's hash "${first.hash}"`);
    expect(err.message).toMatch(/re-fetch the chain/);
  });
});

// ---------------------------------------------------------------------------
// Dense store capacity — remedy appended, one taxonomy (items 25/31)
// ---------------------------------------------------------------------------

describe('dense store capacity error contract', () => {
  test('capacity overflow names the store, capacity, entity, and both remedies', () => {
    const store = Part.dense('physics', 1);
    store.set('e-1' as EntityId, 1);

    try {
      store.set('e-2' as EntityId, 2);
      expect.unreachable('expected set to throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
      expect(String(error)).toMatch(/store "physics" at capacity \(1\)/);
      expect(String(error)).toMatch(/Part\.dense\(name, n\)/);
      expect(String(error)).toMatch(/remove entities/);
    }
  });
});

// ---------------------------------------------------------------------------
// One validation taxonomy — factory validation throws ValidationError (item 31)
// ---------------------------------------------------------------------------

describe('factory validation taxonomy', () => {
  test('AVBridge/FrameBudget/DirtyFlags/Easing.spring all throw ValidationError', () => {
    const throwers = [
      () => AVBridge.make({ sampleRate: 0, fps: 60 }),
      () => Easing.spring({ stiffness: -1 }),
      () => DirtyFlags.make(Array.from({ length: 32 }, (_, i) => `k${i}`)),
    ];
    for (const thrower of throwers) {
      try {
        thrower();
        expect.unreachable('expected validation throw');
      } catch (error) {
        expect(hasTag(error, 'ValidationError')).toBe(true);
      }
    }
    expect(() => FrameBudget.make({ targetFps: 0 })).toThrow(/FrameBudget\.make/);
  });
});

// ---------------------------------------------------------------------------
// Token.tap / Style.tap — misses are observable via Diagnostics (item 30)
// ---------------------------------------------------------------------------

describe('tap-miss diagnostics', () => {
  let captured: ReturnType<typeof Diagnostics.createBufferSink>;

  beforeEach(() => {
    captured = Diagnostics.createBufferSink();
    Diagnostics.setSink(captured.sink);
    Diagnostics.clearOnce();
  });

  afterEach(() => {
    Diagnostics.reset();
  });

  test('Token.tap warns once per missed key with known keys listed', () => {
    const token = Token.make({
      name: 'bg',
      category: 'color',
      axes: ['theme'],
      values: { light: '#fff', dark: '#111' },
      fallback: '#ccc',
    });

    expect(Token.tap(token, { theme: 'drak' })).toBe('#ccc');
    expect(Token.tap(token, { theme: 'drak' })).toBe('#ccc');

    const misses = captured.events.filter((event) => event.code === 'token-tap-miss');
    expect(misses).toHaveLength(1);
    expect(misses[0]!.message).toMatch(/Token "bg": no value for key "drak"/);
    expect(misses[0]!.message).toMatch(/known keys: \[light, dark\]/);

    // A hit emits nothing.
    expect(Token.tap(token, { theme: 'dark' })).toBe('#111');
    expect(captured.events.filter((event) => event.code === 'token-tap-miss')).toHaveLength(1);
  });

  test('Style.tap warns when the state is outside the boundary state set', () => {
    const boundary = Boundary.make({ input: 'viewport.width', at: [[0, 'sm'], [768, 'lg']] });
    const style = Style.make({
      boundary,
      base: { properties: { color: 'black' } },
      states: { lg: { properties: { color: 'white' } } },
    });

    // Valid non-overridden state: base applies, no warn.
    expect(Style.tap(style, 'sm')).toEqual({ color: 'black' });
    expect(captured.events.filter((event) => event.code === 'style-unknown-state')).toHaveLength(0);

    // Typo'd state: base applies AND the miss is observable.
    Style.tap(style, 'gl' as never);
    const warns = captured.events.filter((event) => event.code === 'style-unknown-state');
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toMatch(/state "gl"/);
    expect(warns[0]!.message).toMatch(/\[sm, lg\]/);
  });
});
