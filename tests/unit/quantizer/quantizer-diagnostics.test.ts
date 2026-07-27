/**
 * Quantizer error contract — diagnostics where silence used to hide bugs.
 *
 * Covers: tier-gated outputs that can never fire (build-time warnOnce),
 * invalid MotionTier strings (throw instead of fail-open), foreign
 * previousState in evaluate() (warnOnce), and AnimatedQuantizer outputs
 * that do not cover every boundary state (warn at make()).
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { Diagnostics, CellKernel, defineBoundary } from '@liteship/core';
import type { MotionTier, ReactiveQuantizer } from '@liteship/core';
import { hasTag } from '@liteship/error';
import { AnimatedQuantizer, defineQuantizer, evaluate } from '@liteship/quantizer';
import { captureDiagnostics } from '../../helpers/diagnostics.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function viewport() {
  return defineBoundary({
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

describe('defineQuantizer tier validation', () => {
  test('an unknown MotionTier throws a ValidationError naming the valid tiers', () => {
    expect(() => defineQuantizer(viewport(), { outputs: {}, tier: 'fancy' as MotionTier })).toThrowError(
      "defineQuantizer: unknown MotionTier 'fancy'. Valid tiers: none, transitions, animations, physics, compute. Omit `tier` to allow all targets.",
    );
    try {
      defineQuantizer(viewport(), { outputs: {}, tier: 'fancy' as MotionTier });
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
    }
  });

  test('valid tiers still define configs', () => {
    expect(() => defineQuantizer(viewport(), { outputs: {}, tier: 'physics' })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Item 37: tier-gated outputs warn at build time
// ---------------------------------------------------------------------------

describe('tier-gated output diagnostics', () => {
  test('outputs defined for a gated target warn once with the force/tier remedy', () => {
    captureDiagnostics(({ events }) => {
      defineQuantizer(viewport(), {
        tier: 'transitions',
        outputs: {
          css: uniqueCss(),
          glsl: { compact: { u: 0 }, expanded: { u: 1 } },
        },
      });

      expect(events).toEqual([
        expect.objectContaining({
          source: 'liteship/quantizer',
          code: 'tier-gated-output-dropped',
          message:
            "you defined `glsl` outputs but tier 'transitions' only emits css+aria, so they will never fire. " +
            "Pass a tier that includes glsl to defineQuantizer(boundary, { tier }), or add 'glsl' to the `force` option.",
        }),
      ]);
    });
  });

  test('forced targets do not warn', () => {
    captureDiagnostics(({ events }) => {
      defineQuantizer(viewport(), {
        tier: 'transitions',
        force: ['glsl'],
        outputs: {
          css: uniqueCss(),
          glsl: { compact: { u: 2 }, expanded: { u: 3 } },
        },
      });

      expect(events).toEqual([]);
    });
  });

  test('no tier means no gating and no warning', () => {
    captureDiagnostics(({ events }) => {
      defineQuantizer(viewport(), {
        outputs: {
          glsl: { compact: { u: 4 }, expanded: { u: 5 } },
        },
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
    const boundary = defineBoundary({
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
      // live in @liteship/core; `evaluate` re-exports `Boundary.evaluateResult`.
      expect(events).toEqual([
        expect.objectContaining({
          source: 'liteship/core',
          code: 'core/boundary/unknown-previous-state',
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
    const boundary = defineBoundary({
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
  // A minimal reactive mock: a replay-1 state slot parked on 'compact' and an
  // empty crossing fan-out (no crossings are published — these tests only assert
  // the make()-time uncovered-states diagnostic).
  function mockReactive(boundary: ReturnType<typeof viewport>) {
    return {
      _tag: 'Quantizer',
      boundary,
      state: CellKernel.replay1<'compact' | 'expanded'>('compact'),
      changes: CellKernel.fanout<never>(),
      evaluate: () => 'compact' as const,
    } satisfies ReactiveQuantizer<typeof boundary>;
  }

  test('warns when the outputs record does not cover every boundary state', () => {
    const boundary = viewport();
    const quantizer = mockReactive(boundary);

    captureDiagnostics(({ events }) => {
      const { lifetime } = AnimatedQuantizer.make(quantizer, { '*': { duration: 0 } }, { compact: { opacity: 0 } });
      void lifetime.dispose();

      expect(events).toEqual([
        expect.objectContaining({
          source: 'liteship/quantizer',
          code: 'uncovered-animation-states',
          message:
            'AnimatedQuantizer outputs cover [compact] but boundary "viewport-width" has states ' +
            "[compact, expanded]; transitions into 'expanded' will animate to empty outputs.",
        }),
      ]);
    });
  });

  test('fully-covered outputs emit nothing', () => {
    const boundary = viewport();
    const quantizer = mockReactive(boundary);

    captureDiagnostics(({ events }) => {
      const { lifetime } = AnimatedQuantizer.make(
        quantizer,
        { '*': { duration: 0 } },
        { compact: { opacity: 0 }, expanded: { opacity: 1 } },
      );
      void lifetime.dispose();

      expect(events).toEqual([]);
    });
  });

  test('omitted outputs on a plain quantizer emit nothing (no derivation source)', () => {
    const boundary = viewport();
    const quantizer = mockReactive(boundary);

    captureDiagnostics(({ events }) => {
      const { lifetime } = AnimatedQuantizer.make(quantizer, { '*': { duration: 0 } });
      void lifetime.dispose();

      expect(events).toEqual([]);
    });
  });
});
