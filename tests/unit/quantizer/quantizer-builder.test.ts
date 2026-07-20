/**
 * defineQuantizer(boundary, { outputs }) / createQuantizer(config) tests.
 *
 * Covers: config creation, content-address identity, MotionTier gating,
 * the `force` option escape hatch, springToLinearCSS auto-generation, MemoCache,
 * LiveQuantizer reactive streams, BoundaryCrossing pub-sub.
 */

import { describe, test, expect } from 'vitest';
import type { Boundary } from '@liteship/core';
import { fixedClock, manualClock, type Clock, defineBoundary } from '@liteship/core';
import {
  defineQuantizer,
  createQuantizer,
  type OutputTarget,
  type MotionTier,
  type QuantizerConfig,
  type LiveQuantizer,
} from '@liteship/quantizer';
import { TIER_TARGETS, MemoCache } from '@liteship/quantizer/testing';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function viewport() {
  return defineBoundary({
    input: 'viewport-width',
    at: [
      [0, 'compact'],
      [768, 'medium'],
      [1280, 'expanded'],
    ] as const,
  });
}

// Counter to make outputs unique per call (avoids content-address cache collisions)
let outputCounter = 0;

function simpleOutputs<B extends Boundary>(_b: B) {
  const tag = `t${++outputCounter}`;
  return {
    css: {
      compact: { [`--${tag}-gap`]: '0.5rem', [`--${tag}-cols`]: 1 },
      medium: { [`--${tag}-gap`]: '1rem', [`--${tag}-cols`]: 2 },
      expanded: { [`--${tag}-gap`]: '2rem', [`--${tag}-cols`]: 3 },
    } as Record<string, Record<string, string | number>>,
    glsl: {
      compact: { [`u_${tag}_scale`]: 0.5 },
      medium: { [`u_${tag}_scale`]: 1.0 },
      expanded: { [`u_${tag}_scale`]: 1.5 },
    } as Record<string, Record<string, number>>,
    aria: {
      compact: { 'aria-label': `compact-${tag}` },
      medium: { 'aria-label': `medium-${tag}` },
      expanded: { 'aria-label': `expanded-${tag}` },
    } as Record<string, Record<string, string>>,
  };
}

// ---------------------------------------------------------------------------
// QuantizerConfig creation
// ---------------------------------------------------------------------------

describe('defineQuantizer() config creation', () => {
  test('returns a QuantizerConfig with correct boundary', () => {
    const b = viewport();
    const config = defineQuantizer(b, {
      outputs: {
        css: {
          compact: { '--gap': '0.5rem' },
          medium: { '--gap': '1rem' },
          expanded: { '--gap': '2rem' },
        },
      },
    });
    expect(config.boundary).toBe(b);
  });

  test('config has content-addressed id', () => {
    const b = viewport();
    const config = defineQuantizer(b, {
      outputs: {
        css: {
          compact: { '--gap': '0.5rem' },
          medium: { '--gap': '1rem' },
          expanded: { '--gap': '2rem' },
        },
      },
    });
    expect(config.id).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });

  test('same inputs produce same content address', () => {
    const b = viewport();
    const outputs = {
      css: {
        compact: { '--gap': '0.5rem' },
        medium: { '--gap': '1rem' },
        expanded: { '--gap': '2rem' },
      },
    };
    const config1 = defineQuantizer(b, { outputs });
    const config2 = defineQuantizer(b, { outputs });
    expect(config1.id).toBe(config2.id);
    expect(config1).toBe(config2);
  });

  test('different outputs produce different content address', () => {
    const b = viewport();
    const config1 = defineQuantizer(b, {
      outputs: {
        css: { compact: { '--gap': '0.5rem' }, medium: { '--gap': '1rem' }, expanded: { '--gap': '2rem' } },
      },
    });
    const config2 = defineQuantizer(b, {
      outputs: {
        css: { compact: { '--gap': '1rem' }, medium: { '--gap': '2rem' }, expanded: { '--gap': '3rem' } },
      },
    });
    expect(config1.id).not.toBe(config2.id);
  });

  test('createQuantizer materializes a live quantizer from the pure config', () => {
    const b = viewport();
    const config = defineQuantizer(b, {
      outputs: {
        css: { compact: { '--gap': '0.5rem' }, medium: { '--gap': '1rem' }, expanded: { '--gap': '2rem' } },
      },
    });
    // The config is a PURE definition — no `create` method hangs off it.
    expect((config as { create?: unknown }).create).toBeUndefined();
    const { quantizer, lifetime } = createQuantizer(config);
    expect(quantizer._tag).toBe('Quantizer');
    expect(typeof lifetime.dispose).toBe('function');
  });

  test('config stores tier when provided', () => {
    const b = viewport();
    const config = defineQuantizer(b, {
      tier: 'transitions',
      outputs: {
        css: {
          compact: { '--tier-test': '0.5rem' },
          medium: { '--tier-test': '1rem' },
          expanded: { '--tier-test': '2rem' },
        },
      },
    });
    expect(config.tier).toBe('transitions');
  });

  test('config stores spring when provided', () => {
    const b = viewport();
    const config = defineQuantizer(b, {
      spring: { stiffness: 170, damping: 26 },
      outputs: {
        css: {
          compact: { '--spring-test': '0.5rem' },
          medium: { '--spring-test': '1rem' },
          expanded: { '--spring-test': '2rem' },
        },
      },
    });
    expect(config.spring).toEqual({ stiffness: 170, damping: 26 });
  });
});

// ---------------------------------------------------------------------------
// MotionTier gating
// ---------------------------------------------------------------------------

describe('MotionTier gating', () => {
  test('TIER_TARGETS has every tier in the union', () => {
    // `satisfies` catches the case where a new tier is added to the
    // union but omitted from this array — the array literal must
    // include every element of `MotionTier` or the type-check fails.
    const tiers = ['none', 'transitions', 'animations', 'physics', 'compute'] as const satisfies readonly MotionTier[];
    type _ExhaustiveCheck = Exclude<MotionTier, (typeof tiers)[number]> extends never ? true : never;
    const _ok: _ExhaustiveCheck = true;
    void _ok;
    for (const tier of tiers) {
      expect(TIER_TARGETS[tier]).toBeDefined();
    }
  });

  test('none tier only allows aria', () => {
    expect(TIER_TARGETS.none).toEqual(new Set(['aria']));
  });

  test('transitions tier allows css + aria', () => {
    expect(TIER_TARGETS.transitions).toEqual(new Set(['css', 'aria']));
  });

  test('compute tier allows all targets', () => {
    expect(TIER_TARGETS.compute).toEqual(new Set(['css', 'glsl', 'wgsl', 'aria', 'ai']));
  });

  test('tier: none filters out css and glsl from outputs', async () => {
    const b = viewport();
    const config = defineQuantizer(b, { tier: 'none', outputs: simpleOutputs(b) });

    const lq = createQuantizer(config).quantizer;
    const outputs = lq.currentOutputs.read();

    // Only aria should be present
    expect(outputs.aria).toBeDefined();
    expect(outputs.css).toBeUndefined();
    expect(outputs.glsl).toBeUndefined();
  });

  test('tier: transitions includes css but not glsl', async () => {
    const b = viewport();
    const config = defineQuantizer(b, { tier: 'transitions', outputs: simpleOutputs(b) });

    const lq = createQuantizer(config).quantizer;
    const outputs = lq.currentOutputs.read();

    expect(outputs.css).toBeDefined();
    expect(outputs.aria).toBeDefined();
    expect(outputs.glsl).toBeUndefined();
  });

  test('tier: physics includes css + glsl + aria', async () => {
    const b = viewport();
    const config = defineQuantizer(b, { tier: 'physics', outputs: simpleOutputs(b) });

    const lq = createQuantizer(config).quantizer;
    const outputs = lq.currentOutputs.read();

    expect(outputs.css).toBeDefined();
    expect(outputs.glsl).toBeDefined();
    expect(outputs.aria).toBeDefined();
  });

  test('no tier = no filtering (all outputs present)', async () => {
    const b = viewport();
    const config = defineQuantizer(b, { outputs: simpleOutputs(b) });

    const lq = createQuantizer(config).quantizer;
    const outputs = lq.currentOutputs.read();

    expect(outputs.css).toBeDefined();
    expect(outputs.glsl).toBeDefined();
    expect(outputs.aria).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Config identity covers tier/spring/force (cross-config cache poisoning)
// ---------------------------------------------------------------------------

describe('config identity includes tier/spring/force', () => {
  // Deliberately reuse IDENTICAL boundary + outputs across configs: the
  // content-address must diverge on the options alone. Before the fix the
  // first config minted for a boundary+outputs pair was served from the
  // config cache for every later tier/spring/force variant, so a
  // `tier: 'physics'` quantizer created after a `tier: 'transitions'` one
  // never emitted glsl (the downstream 0.1.4 repro).
  const sharedOutputs = {
    css: {
      compact: { '--identity-gap': '0.5rem' },
      medium: { '--identity-gap': '1rem' },
      expanded: { '--identity-gap': '2rem' },
    } as Record<string, Record<string, string | number>>,
    glsl: {
      compact: { u_identity_scale: 0.5 },
      medium: { u_identity_scale: 1.0 },
      expanded: { u_identity_scale: 1.5 },
    } as Record<string, Record<string, number>>,
    aria: {
      compact: { 'aria-label': 'identity-compact' },
      medium: { 'aria-label': 'identity-medium' },
      expanded: { 'aria-label': 'identity-expanded' },
    } as Record<string, Record<string, string>>,
  };

  test('same outputs at a lower tier do not poison a later physics-tier config', async () => {
    const b = viewport();
    const transitions = defineQuantizer(b, { tier: 'transitions', outputs: sharedOutputs });
    const physics = defineQuantizer(b, { tier: 'physics', outputs: sharedOutputs });
    const ungated = defineQuantizer(b, { outputs: sharedOutputs });

    expect(transitions.id).not.toBe(physics.id);
    expect(physics.id).not.toBe(ungated.id);

    const lqTransitions = createQuantizer(transitions).quantizer;
    const lqPhysics = createQuantizer(physics).quantizer;
    const lqUngated = createQuantizer(ungated).quantizer;

    expect(lqTransitions.currentOutputs.read().glsl).toBeUndefined();
    expect(lqPhysics.currentOutputs.read().glsl).toBeDefined();
    expect(lqUngated.currentOutputs.read().glsl).toBeDefined();

    // Crossing-time resolution must stay per-config too (output cache key).
    lqPhysics.evaluate(800);
    const physicsOutputs = lqPhysics.currentOutputs.read();
    expect(physicsOutputs.glsl).toEqual({ u_identity_scale: 1.0 });
    lqTransitions.evaluate(800);
    expect(lqTransitions.currentOutputs.read().glsl).toBeUndefined();
  });

  test('distinct springs with identical outputs produce distinct configs and easings', async () => {
    const b = viewport();
    const stiff = defineQuantizer(b, { spring: { stiffness: 400, damping: 10 }, outputs: sharedOutputs });
    const soft = defineQuantizer(b, { spring: { stiffness: 80, damping: 30 }, outputs: sharedOutputs });

    expect(stiff.id).not.toBe(soft.id);

    const lqStiff = createQuantizer(stiff).quantizer;
    const lqSoft = createQuantizer(soft).quantizer;
    const stiffCss = lqStiff.currentOutputs.read().css ?? {};
    const softCss = lqSoft.currentOutputs.read().css ?? {};

    expect(stiffCss['--liteship-easing']).toBeDefined();
    expect(softCss['--liteship-easing']).toBeDefined();
    expect(stiffCss['--liteship-easing']).not.toBe(softCss['--liteship-easing']);
  });

  test('force targets are part of config identity', async () => {
    const b = viewport();
    const plain = defineQuantizer(b, { tier: 'none', outputs: sharedOutputs });
    const forced = defineQuantizer(b, { tier: 'none', force: ['glsl'], outputs: sharedOutputs });

    expect(plain.id).not.toBe(forced.id);

    const lqPlain = createQuantizer(plain).quantizer;
    const lqForced = createQuantizer(forced).quantizer;

    expect(lqPlain.currentOutputs.read().glsl).toBeUndefined();
    expect(lqForced.currentOutputs.read().glsl).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// force option escape hatch
// ---------------------------------------------------------------------------

describe('force option escape hatch', () => {
  test('force bypasses tier gating for specified targets', async () => {
    const b = viewport();
    // tier: none normally blocks everything except aria
    const config = defineQuantizer(b, { tier: 'none', force: ['css', 'glsl'], outputs: simpleOutputs(b) });

    const lq = createQuantizer(config).quantizer;
    const outputs = lq.currentOutputs.read();

    expect(outputs.css).toBeDefined();
    expect(outputs.glsl).toBeDefined();
    expect(outputs.aria).toBeDefined(); // still allowed by tier
  });

  test('force is recorded on the config as authored intent', () => {
    const b = viewport();
    const config = defineQuantizer(b, { tier: 'none', force: ['css'], outputs: simpleOutputs(b) });
    expect(config.force).toEqual(['css']);
  });
});

// ---------------------------------------------------------------------------
// Spring CSS auto-generation
// ---------------------------------------------------------------------------

describe('springToLinearCSS auto-generation', () => {
  test('injects --liteship-easing when spring config + CSS outputs present', async () => {
    const b = viewport();
    const tag = `spring${++outputCounter}`;
    const config = defineQuantizer(b, {
      spring: { stiffness: 170, damping: 26 },
      outputs: {
        css: {
          compact: { [`--${tag}`]: '0.5rem' },
          medium: { [`--${tag}`]: '1rem' },
          expanded: { [`--${tag}`]: '2rem' },
        },
      },
    });

    const lq = createQuantizer(config).quantizer;
    const outputs = lq.currentOutputs.read();

    expect(outputs.css).toBeDefined();
    expect(outputs.css!['--liteship-easing']).toBeDefined();
    expect(typeof outputs.css!['--liteship-easing']).toBe('string');
    // Should be a linear() CSS function
    expect(outputs.css!['--liteship-easing']).toMatch(/^linear\(/);
  });

  test('no spring config = no --liteship-easing injection', async () => {
    const b = viewport();
    const tag = `nospring${++outputCounter}`;
    const config = defineQuantizer(b, {
      outputs: {
        css: {
          compact: { [`--${tag}`]: '0.5rem' },
          medium: { [`--${tag}`]: '1rem' },
          expanded: { [`--${tag}`]: '2rem' },
        },
      },
    });

    const lq = createQuantizer(config).quantizer;
    const outputs = lq.currentOutputs.read();

    expect(outputs.css).toBeDefined();
    expect(outputs.css!['--liteship-easing']).toBeUndefined();
  });

  test('spring CSS is cached (same spring config = same string)', async () => {
    const b = viewport();
    const spring = { stiffness: 170, damping: 26 };
    const t1 = `sc${++outputCounter}`;
    const t2 = `sc${++outputCounter}`;

    const config1 = defineQuantizer(b, {
      spring,
      outputs: { css: { compact: { [`--${t1}`]: '1' }, medium: { [`--${t1}`]: '2' }, expanded: { [`--${t1}`]: '3' } } },
    });
    const config2 = defineQuantizer(b, {
      spring,
      outputs: { css: { compact: { [`--${t2}`]: '1' }, medium: { [`--${t2}`]: '2' }, expanded: { [`--${t2}`]: '3' } } },
    });

    const lq1 = createQuantizer(config1).quantizer;
    const lq2 = createQuantizer(config2).quantizer;
    const o1 = lq1.currentOutputs.read();
    const o2 = lq2.currentOutputs.read();

    expect(o1.css!['--liteship-easing']).toBe(o2.css!['--liteship-easing']);
  });
});

// ---------------------------------------------------------------------------
// MemoCache
// ---------------------------------------------------------------------------

describe('MemoCache', () => {
  test('get/set/has work correctly', () => {
    const cache = MemoCache.make<number>();
    const key = 'fnv1a:12345678' as any;

    expect(cache.has(key)).toBe(false);
    cache.set(key, 42);
    expect(cache.has(key)).toBe(true);
    expect(cache.get(key)).toBe(42);
  });

  test('size tracks entries', () => {
    const cache = MemoCache.make<string>();
    expect(cache.size).toBe(0);
    cache.set('fnv1a:00000001' as any, 'a');
    cache.set('fnv1a:00000002' as any, 'b');
    expect(cache.size).toBe(2);
  });

  test('returns undefined for missing keys', () => {
    const cache = MemoCache.make<number>();
    expect(cache.get('fnv1a:missing00' as any)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// LiveQuantizer -- reactive behavior
// ---------------------------------------------------------------------------

describe('LiveQuantizer', () => {
  function uniqueCss() {
    const t = `lq${++outputCounter}`;
    return {
      css: {
        compact: { [`--${t}`]: '0.5rem' },
        medium: { [`--${t}`]: '1rem' },
        expanded: { [`--${t}`]: '2rem' },
      },
      _key: `--${t}`,
    };
  }

  test('initial state is first boundary state', async () => {
    const b = viewport();
    const { css } = uniqueCss();
    const config = defineQuantizer(b, { outputs: { css } });

    const lq = createQuantizer(config).quantizer;
    const state = lq.state.read();
    expect(state).toBe('compact');
  });

  test('evaluate() returns current state for value in first range', async () => {
    const b = viewport();
    const { css } = uniqueCss();
    const config = defineQuantizer(b, { outputs: { css } });

    const lq = createQuantizer(config).quantizer;
    const result = lq.evaluate(500);
    expect(result).toBe('compact');
  });

  test('evaluate() transitions on boundary crossing', async () => {
    const b = viewport();
    const { css } = uniqueCss();
    const config = defineQuantizer(b, { outputs: { css } });

    const lq = createQuantizer(config).quantizer;

    expect(lq.evaluate(500)).toBe('compact');
    expect(lq.evaluate(800)).toBe('medium');
    expect(lq.evaluate(1300)).toBe('expanded');
  });

  test('evaluate() updates currentOutputs on crossing', async () => {
    const b = viewport();
    const { css, _key } = uniqueCss();
    const config = defineQuantizer(b, { outputs: { css } });

    const lq = createQuantizer(config).quantizer;

    let outputs = lq.currentOutputs.read();
    expect(outputs.css![_key]).toBe('0.5rem');

    lq.evaluate(800);
    outputs = lq.currentOutputs.read();
    expect(outputs.css![_key]).toBe('1rem');

    lq.evaluate(1300);
    outputs = lq.currentOutputs.read();
    expect(outputs.css![_key]).toBe('2rem');
  });

  test('evaluate() does not emit crossing when state unchanged', async () => {
    const b = viewport();
    const { css, _key } = uniqueCss();
    const config = defineQuantizer(b, { outputs: { css } });

    const lq = createQuantizer(config).quantizer;

    expect(lq.evaluate(100)).toBe('compact');
    expect(lq.evaluate(200)).toBe('compact');
    expect(lq.evaluate(300)).toBe('compact');

    const outputs = lq.currentOutputs.read();
    expect(outputs.css![_key]).toBe('0.5rem');
  });

  test('config reference is available on LiveQuantizer', async () => {
    const b = viewport();
    const { css } = uniqueCss();
    const config = defineQuantizer(b, { outputs: { css } });

    const lq = createQuantizer(config).quantizer;
    expect(lq.config).toBe(config);
  });

  test('boundary reference is available on LiveQuantizer', async () => {
    const b = viewport();
    const { css } = uniqueCss();
    const config = defineQuantizer(b, { outputs: { css } });

    const lq = createQuantizer(config).quantizer;
    expect(lq._tag).toBe('Quantizer');
    expect(lq.boundary).toBe(b);
  });

  test('stateSync tracks the latest boundary evaluation result', async () => {
    const b = viewport();
    const { css } = uniqueCss();
    const config = defineQuantizer(b, { outputs: { css } });

    const lq = createQuantizer(config).quantizer;
    expect((lq as LiveQuantizer<typeof b> & { stateSync(): string }).stateSync()).toBe('compact');
    lq.evaluate(800);
    expect((lq as LiveQuantizer<typeof b> & { stateSync(): string }).stateSync()).toBe('medium');
  });

  test('omits targets that do not define outputs for the current state', async () => {
    const b = viewport();
    const config = defineQuantizer(b, {
      outputs: {
        css: {
          compact: { '--gap': '4px' },
          medium: { '--gap': '8px' },
          expanded: { '--gap': '12px' },
        },
        glsl: {
          expanded: { u_scale: 2 },
        },
      },
    });

    const lq = createQuantizer(config).quantizer;
    expect(lq.currentOutputs.read()).toEqual({
      css: { '--gap': '4px' },
    });

    lq.evaluate(1300);
    expect(lq.currentOutputs.read()).toEqual({
      css: { '--gap': '12px' },
      glsl: { u_scale: 2 },
    });
  });

  test('reuses cached outputs when returning to a previously resolved state', async () => {
    const b = viewport();
    const { css } = uniqueCss();
    const config = defineQuantizer(b, { outputs: { css } });

    const lq = createQuantizer(config).quantizer;
    const initialOutputs = lq.currentOutputs.read();

    lq.evaluate(800);
    const mediumOutputs = lq.currentOutputs.read();
    expect(mediumOutputs).not.toBe(initialOutputs);

    lq.evaluate(500);
    const compactOutputs = lq.currentOutputs.read();
    expect(compactOutputs).toBe(initialOutputs);
  });

  test('rejects an unknown tier at definition time instead of failing open to all targets', () => {
    // Failing open would disable gating entirely (including ai/wgsl) for an
    // invalid tier from an untyped source — see quantizer-diagnostics.test.ts
    // for the full error-contract coverage.
    const b = viewport();
    expect(() => defineQuantizer(b, { outputs: {}, tier: 'ghost' as MotionTier })).toThrow(
      /unknown MotionTier 'ghost'/,
    );
  });

  test('changes subscriptions clean up cleanly when the lifetime disposes after a crossing', async () => {
    const b = viewport();
    const { css } = uniqueCss();
    const { quantizer: lq, lifetime } = createQuantizer(defineQuantizer(b, { outputs: { css } }));

    // The crossing fan-out publishes synchronously on evaluate(); collect via the
    // kernel's subscribe (was `Stream.take(lq.changes, 1)` forked in a scope).
    const events: Array<{ from: string; to: string }> = [];
    const dispose = lq.changes.subscribe((crossing) => {
      events.push({ from: crossing.from, to: crossing.to });
    });
    lq.evaluate(900); // compact -> medium crossing
    dispose();
    // Disposing the lifetime closes the crossing kernel (completes subscribers,
    // makes publish inert) — the clean-up the old scope close covered.
    await lifetime.dispose();

    expect(events).toEqual([{ from: 'compact', to: 'medium' }]);
  });
});

// ---------------------------------------------------------------------------
// Tier gating + output correctness integration
// ---------------------------------------------------------------------------

describe('tier gating output correctness', () => {
  test('tier: none with all output types only produces aria', async () => {
    const b = viewport();
    const t = `none${++outputCounter}`;
    const config = defineQuantizer(b, {
      tier: 'none',
      outputs: {
        css: { compact: { [`--${t}`]: '0.5rem' }, medium: { [`--${t}`]: '1rem' }, expanded: { [`--${t}`]: '2rem' } },
        glsl: { compact: { [`u_${t}`]: 0.5 }, medium: { [`u_${t}`]: 1.0 }, expanded: { [`u_${t}`]: 1.5 } },
        aria: {
          compact: { 'aria-label': `c-${t}` },
          medium: { 'aria-label': `m-${t}` },
          expanded: { 'aria-label': `e-${t}` },
        },
      },
    });

    const lq = createQuantizer(config).quantizer;
    const outputs = lq.currentOutputs.read();

    expect(outputs.aria).toEqual({ 'aria-label': `c-${t}` });
    expect(outputs.css).toBeUndefined();
    expect(outputs.glsl).toBeUndefined();
  });

  test('after crossing, tier gating still applies', async () => {
    const b = viewport();
    const t = `trans${++outputCounter}`;
    const config = defineQuantizer(b, {
      tier: 'transitions',
      outputs: {
        css: { compact: { [`--${t}`]: '0.5rem' }, medium: { [`--${t}`]: '1rem' }, expanded: { [`--${t}`]: '2rem' } },
        glsl: { compact: { [`u_${t}`]: 0.5 }, medium: { [`u_${t}`]: 1.0 }, expanded: { [`u_${t}`]: 1.5 } },
        aria: {
          compact: { 'aria-label': `c-${t}` },
          medium: { 'aria-label': `m-${t}` },
          expanded: { 'aria-label': `e-${t}` },
        },
      },
    });

    const lq = createQuantizer(config).quantizer;
    lq.evaluate(800);
    const outputs = lq.currentOutputs.read();

    expect(outputs.css).toEqual({ [`--${t}`]: '1rem' });
    expect(outputs.aria).toEqual({ 'aria-label': `m-${t}` });
    expect(outputs.glsl).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// A-1 determinism guard: the crossing HLC is injected per-instantiation, NOT a
// process-wide module singleton. Same input + a fixed clock → identical
// timestamp regardless of how many other quantizers evaluated first.
// ---------------------------------------------------------------------------

describe('injected-HLC determinism (A-1)', () => {
  /** Drive `lq` to its first crossing and return the crossing's HLC timestamp. */
  function firstCrossingHlc<B extends Boundary>(
    b: B,
    clock: Clock,
    node?: string,
  ): { wall_ms: number; counter: number; node_id: string } {
    const { css } = uniqueCssForGuard();
    const { quantizer: lq } = createQuantizer(defineQuantizer(b, { outputs: { css } }), { clock, node });
    let stamp: { wall_ms: number; counter: number; node_id: string } | undefined;
    const dispose = lq.changes.subscribe((crossing) => {
      // crossing.timestamp is the branded HLC — structurally { wall_ms, counter, node_id }.
      stamp = crossing.timestamp;
    });
    lq.evaluate(900); // crossing published synchronously
    dispose();
    return stamp!;
  }

  let guardCounter = 0;
  function uniqueCssForGuard() {
    const t = `guard${++guardCounter}`;
    return {
      css: {
        compact: { [`--${t}`]: '0.5rem' },
        medium: { [`--${t}`]: '1rem' },
        expanded: { [`--${t}`]: '2rem' },
      } as Record<string, Record<string, string | number>>,
    };
  }

  test('same input + a fixed clock yields an identical timestamp regardless of prior calls', async () => {
    const b = viewport();
    // Warm up: evaluate several OTHER quantizers first. With the old module
    // singleton these advanced a process-wide HLC and would poison the stamp.
    for (let i = 0; i < 5; i++) await firstCrossingHlc(b, fixedClock(1_000 + i));

    const a = await firstCrossingHlc(b, fixedClock(1_715_000_000_000), 'q');
    const c = await firstCrossingHlc(b, fixedClock(1_715_000_000_000), 'q');
    expect(a).toEqual(c);
    expect(a.wall_ms).toBe(1_715_000_000_000);
    expect(a.node_id).toBe('q');
    // First increment from a fresh per-instance HLC: counter resets to 0, it
    // does NOT inherit any prior quantizer's counter.
    expect(a.counter).toBe(0);
  });

  test("each createQuantizer owns its clock — one instance's evaluates never advance another's HLC", () => {
    const b = viewport();
    const clockA = manualClock(2_000);
    const clockB = manualClock(2_000);
    const { css } = uniqueCssForGuard();
    const config = defineQuantizer(b, { outputs: { css } });
    const { quantizer: lqA } = createQuantizer(config, { clock: clockA, node: 'A' });
    const { quantizer: lqB } = createQuantizer(config, { clock: clockB, node: 'B' });

    let ca: { wall_ms: number; node_id: string } | undefined;
    let cb: { wall_ms: number; node_id: string } | undefined;
    const disposeA = lqA.changes.subscribe((c) => {
      ca = c.timestamp;
    });
    const disposeB = lqB.changes.subscribe((c) => {
      cb = c.timestamp;
    });

    // Advance only A's clock and evaluate A before B ever crosses; B's stamp must
    // be untouched by A's activity. Each evaluate() publishes its crossing
    // synchronously to its own fan-out.
    clockA.advance(50);
    lqA.evaluate(900);
    clockB.advance(10);
    lqB.evaluate(900);
    disposeA();
    disposeB();

    const stamps = { ca: ca!, cb: cb! };
    expect(stamps.ca.wall_ms).toBe(2_050);
    expect(stamps.ca.node_id).toBe('A');
    // B's stamp reflects ONLY B's own clock (2_010), not A's 2_050 — no shared
    // process-wide HLC bleeds A's time into B.
    expect(stamps.cb.wall_ms).toBe(2_010);
    expect(stamps.cb.node_id).toBe('B');
  });
});

// ---------------------------------------------------------------------------
// Teardown: close ALL channels even when a completion callback throws
// ---------------------------------------------------------------------------

describe('createQuantizer live handle — disposal closes every channel despite a throwing complete', () => {
  test('a throwing state-complete does not strand the output/crossing channels open', async () => {
    const b = viewport();
    const { quantizer, lifetime } = createQuantizer(defineQuantizer(b, { outputs: simpleOutputs(b) }));

    // A state subscriber whose `complete` throws during teardown. `CellKernel.close`
    // rethrows the first fault (the sink-error law), so the finalizer's `stateCell.close()`
    // throws.
    quantizer.state.subscribe({
      next: () => undefined,
      complete: () => {
        throw new Error('boom');
      },
    });

    // Disposing runs the single finalizer. A bare sequential
    // `stateCell.close(); outputCell.close(); crossingChannel.close();` would let the
    // stateCell throw STRAND the output + crossing channels open — evaluate() could
    // still publish into subscribers that were never completed. The fault folds into a
    // LifetimeDisposeError (aggregate-failure law), which we swallow here.
    try {
      await lifetime.dispose();
    } catch {
      /* expected: the folded fault still surfaces */
    }

    // ALL three channels closed despite the earlier throw.
    expect(quantizer.state.closed).toBe(true);
    expect(quantizer.outputChanges.closed).toBe(true);
    expect(quantizer.changes.closed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// evaluate() publishes state + outputs + crossing as ONE consistent advance
// ---------------------------------------------------------------------------

describe('createQuantizer live handle — evaluate advances every channel despite a throwing subscriber', () => {
  test('a throwing state subscriber does not strand the outputs/crossing channels', () => {
    const b = viewport();
    const { quantizer } = createQuantizer(defineQuantizer(b, { outputs: simpleOutputs(b) }));

    // A state subscriber that throws on the CROSSING delivery (its initial replay of
    // the current state does not cross, so the throw fires only on the evaluate below).
    let stateDeliveries = 0;
    quantizer.state.subscribe({
      next: () => {
        stateDeliveries += 1;
        if (stateDeliveries > 1) throw new Error('boom');
      },
    });
    const crossings: unknown[] = [];
    quantizer.changes.subscribe((c) => crossings.push(c));
    const outputs: unknown[] = [];
    quantizer.outputChanges.subscribe(() => outputs.push(1));

    // Evaluate across a threshold → a crossing. The state subscriber throws (the
    // kernel fan-out is fail-fast), but the fault must NOT strand the later channels:
    // outputs + crossing still advance, THEN the first fault rethrows.
    expect(() => quantizer.evaluate(2000)).toThrow('boom');
    expect(crossings).toHaveLength(1); // the crossing STILL reached `changes`
    expect(outputs.length).toBeGreaterThanOrEqual(2); // outputs advanced beyond its initial replay
  });
});

describe('LiveQuantizer.evaluate — post-dispose inertness', () => {
  test('a post-dispose evaluate() freezes the discrete state (stateSync + state.read do not advance)', async () => {
    const b = viewport();
    const { quantizer, lifetime } = createQuantizer(defineQuantizer(b, { outputs: simpleOutputs(b) }), {
      clock: manualClock(1000),
    });
    expect(quantizer.evaluate(50)).toBe('compact'); // committed 'compact'
    await lifetime.dispose();
    // After dispose the state/outputs/crossing kernels are closed; evaluate must freeze
    // rather than advance previousState/HLC while the reactive channels stay put — else a
    // disposed-but-referenced quantizer reports a discrete state its own channel never emits.
    expect(quantizer.evaluate(1300)).toBe('compact'); // would-be 'expanded' is NOT committed
    expect(quantizer.stateSync?.()).toBe('compact');
    expect(quantizer.state.read()).toBe('compact');
  });
});
