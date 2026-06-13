/**
 * Quantizer error contract — diagnostics where silence used to hide bugs.
 *
 * Covers: tier-gated outputs that can never fire (build-time warnOnce),
 * invalid MotionTier strings (throw instead of fail-open), foreign
 * previousState in evaluate() (warnOnce), and AnimatedQuantizer outputs
 * that do not cover every boundary state (warn at make()).
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { Effect, Stream } from 'effect';
import { Boundary, Diagnostics, isValidationError } from '@czap/core';
import type { MotionTier, Quantizer } from '@czap/core';
import { AnimatedQuantizer, Q, evaluate } from '@czap/quantizer';
import { captureDiagnostics, captureDiagnosticsAsync } from '../../helpers/diagnostics.js';
import { runScopedAsync as runScoped } from '../../helpers/effect-test.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function viewport() {
  return Boundary.make({
    input: 'viewport-width',
    at: [
      [0, 'compact'],
      [768, 'expanded'],
    ] as const,
  });
}

// Unique output values per call to avoid content-address cache hits across tests.
let counter = 0;
function uniqueCss() {
  const tag = `d${++counter}`;
  return {
    compact: { [`--${tag}`]: '0' },
    expanded: { [`--${tag}`]: '1' },
  } as Record<string, Record<string, string | number>>;
}

beforeEach(() => {
  Diagnostics.clearOnce();
});

// ---------------------------------------------------------------------------
// Item 38: invalid tier throws instead of failing open
// ---------------------------------------------------------------------------

describe('Q.from tier validation', () => {
  test('an unknown MotionTier throws a CzapValidationError naming the valid tiers', () => {
    expect(() => Q.from(viewport(), { tier: 'fancy' as MotionTier })).toThrowError(
      "Q.from: unknown MotionTier 'fancy'. Valid tiers: none, transitions, animations, physics, compute. Omit `tier` to allow all targets.",
    );
    try {
      Q.from(viewport(), { tier: 'fancy' as MotionTier });
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  test('valid tiers still construct builders', () => {
    expect(() => Q.from(viewport(), { tier: 'physics' })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Item 37: tier-gated outputs warn at build time
// ---------------------------------------------------------------------------

describe('tier-gated output diagnostics', () => {
  test('outputs defined for a gated target warn once with the force()/tier remedy', () => {
    captureDiagnostics(({ events }) => {
      Q.from(viewport(), { tier: 'transitions' }).outputs({
        css: uniqueCss(),
        glsl: { compact: { u: 0 }, expanded: { u: 1 } },
      });

      expect(events).toEqual([
        expect.objectContaining({
          source: 'czap/quantizer',
          code: 'tier-gated-output-dropped',
          message:
            "you defined `glsl` outputs but tier 'transitions' only emits css+aria, so they will never fire. " +
            "Pass a tier that includes glsl to Q.from(boundary, { tier }), or chain .force('glsl').",
        }),
      ]);
    });
  });

  test('forced targets do not warn', () => {
    captureDiagnostics(({ events }) => {
      Q.from(viewport(), { tier: 'transitions' })
        .force('glsl')
        .outputs({
          css: uniqueCss(),
          glsl: { compact: { u: 2 }, expanded: { u: 3 } },
        });

      expect(events).toEqual([]);
    });
  });

  test('no tier means no gating and no warning', () => {
    captureDiagnostics(({ events }) => {
      Q.from(viewport()).outputs({
        glsl: { compact: { u: 4 }, expanded: { u: 5 } },
      });

      expect(events).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// Item 40: foreign previousState warns instead of silently crossing
// ---------------------------------------------------------------------------

describe('evaluate() unknown previousState', () => {
  test('warns once with the boundary input and valid states', () => {
    const boundary = Boundary.make({
      input: 'width',
      at: [
        [0, 'sm'],
        [640, 'md'],
        [1024, 'lg'],
      ] as const,
      hysteresis: 20,
    });

    captureDiagnostics(({ events }) => {
      const result = evaluate(boundary, 800, 'medium' as unknown as 'md');

      expect(result.crossed).toBe(true);
      // Phase-0 consolidation: the canonical evaluator (and this diagnostic) now
      // live in @czap/core; `evaluate` re-exports `Boundary.evaluateResult`.
      expect(events).toEqual([
        expect.objectContaining({
          source: 'czap/core',
          code: 'unknown-previous-state',
          message:
            'evaluateResult(): previousState "medium" is not a state of boundary "width" (states: sm, md, lg); ' +
            'treating as a crossing. Check that the state came from this boundary.',
        }),
      ]);

      // warnOnce: a second identical miss stays silent.
      evaluate(boundary, 800, 'medium' as unknown as 'md');
      expect(events).toHaveLength(1);
    });
  });

  test('a known previousState emits nothing', () => {
    const boundary = Boundary.make({
      input: 'width',
      at: [
        [0, 'sm'],
        [640, 'md'],
      ] as const,
      hysteresis: 20,
    });

    captureDiagnostics(({ events }) => {
      evaluate(boundary, 800, 'sm');
      expect(events).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// Item 41: AnimatedQuantizer outputs that miss states warn at make()
// ---------------------------------------------------------------------------

describe('AnimatedQuantizer uncovered states', () => {
  test('warns when the outputs record does not cover every boundary state', async () => {
    const boundary = viewport();
    const quantizer = {
      boundary,
      state: Effect.succeed<'compact' | 'expanded'>('compact'),
      changes: Stream.empty,
      evaluate: () => 'compact' as const,
    } satisfies Quantizer<typeof boundary>;

    await captureDiagnosticsAsync(async ({ events }) => {
      await runScoped(
        Effect.gen(function* () {
          yield* AnimatedQuantizer.make(quantizer, { '*': { duration: 0 } }, { compact: { opacity: 0 } });
        }),
      );

      expect(events).toEqual([
        expect.objectContaining({
          source: 'czap/quantizer',
          code: 'uncovered-animation-states',
          message:
            'AnimatedQuantizer outputs cover [compact] but boundary "viewport-width" has states ' +
            "[compact, expanded]; transitions into 'expanded' will animate to empty outputs.",
        }),
      ]);
    });
  });

  test('fully-covered outputs emit nothing', async () => {
    const boundary = viewport();
    const quantizer = {
      boundary,
      state: Effect.succeed<'compact' | 'expanded'>('compact'),
      changes: Stream.empty,
      evaluate: () => 'compact' as const,
    } satisfies Quantizer<typeof boundary>;

    await captureDiagnosticsAsync(async ({ events }) => {
      await runScoped(
        Effect.gen(function* () {
          yield* AnimatedQuantizer.make(
            quantizer,
            { '*': { duration: 0 } },
            { compact: { opacity: 0 }, expanded: { opacity: 1 } },
          );
        }),
      );

      expect(events).toEqual([]);
    });
  });

  test('omitted outputs on a plain quantizer emit nothing (no derivation source)', async () => {
    const boundary = viewport();
    const quantizer = {
      boundary,
      state: Effect.succeed<'compact' | 'expanded'>('compact'),
      changes: Stream.empty,
      evaluate: () => 'compact' as const,
    } satisfies Quantizer<typeof boundary>;

    await captureDiagnosticsAsync(async ({ events }) => {
      await runScoped(
        Effect.gen(function* () {
          yield* AnimatedQuantizer.make(quantizer, { '*': { duration: 0 } });
        }),
      );

      expect(events).toEqual([]);
    });
  });
});
