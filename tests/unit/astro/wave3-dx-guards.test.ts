// @vitest-environment jsdom
/**
 * Wave-3 DX regression guards (@liteship/astro) — pins the LAWS behind the
 * "defaults-pass" + "error-contract" sweep so a benign refactor can't
 * silently revert the ergonomics:
 *
 *  - #90 satelliteAttrs defaults `data-liteship-state` to the first state when
 *    `initialState` is omitted but a boundary is present (no flash of
 *    unstated content). LAW: a boundary-bearing satellite is NEVER shipped
 *    without a server state.
 *  - #91 resolveInitialState's ServerIslandContext is fully optional —
 *    callable with no context / partial context — and still resolves a
 *    real state. LAW: graceful degradation, never throws on absent fields.
 *  - #92 integration → middleware toggle seam: worker isolation is
 *    configured ONCE in integration() and liteshipMiddleware() derives it.
 *    LAW: configure-once; the two never diverge by default.
 *  - #93 `liteship` is exported and is referentially the SAME factory as
 *    `integration` — the rename ritual is unnecessary. LAW: alias identity.
 *  - #95–#100 error-contract: every runtime failure diagnostic carries the
 *    literal next thing to type (`Fix: liteship({ ... })`), not just a code.
 *    LAW: an actionable fix-instruction rides every inert-island failure.
 *
 * Style per testing-philosophy: property-based where the input space
 * warrants, pin INVARIANTS not byte-for-byte strings, self-documenting
 * LESSON names.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import * as fc from 'fast-check';
import { Boundary, Diagnostics } from '@liteship/core';
import {
  satelliteAttrs,
  resolveInitialState,
  resolveInitialStateFallback,
  integration,
  liteship,
  liteshipMiddleware,
} from '@liteship/astro';
import {
  resolveIntegrationToggles,
  publishIntegrationToggles,
  consumeIntegrationToggles,
  resetIntegrationTogglesForTesting,
} from '../../../packages/astro/src/integration-toggles.js';
import { boundaryParseFailureMessage, parseBoundary } from '../../../packages/astro/src/runtime/boundary.js';
import { captureDiagnosticsAsync } from '../../helpers/diagnostics.js';

// ---------------------------------------------------------------------------
// Generators — adversarial-ish boundary domain
// ---------------------------------------------------------------------------

/** A state label generator that never collides within one boundary. */
const stateLabel = fc.stringMatching(/^[a-z][a-z0-9_]{0,7}$/);

/**
 * Generate a structurally-valid Boundary with >= 1 ascending,
 * distinct thresholds and distinct state labels. `at[0]` is pinned to a
 * sentinel low threshold so the first state is always the resolution floor.
 */
const arbBoundary = fc.uniqueArray(stateLabel, { minLength: 1, maxLength: 5 }).chain((states) =>
  fc
    .uniqueArray(fc.integer({ min: 0, max: 4000 }), {
      minLength: states.length,
      maxLength: states.length,
    })
    .map((rawThresholds) => {
      const thresholds = [...rawThresholds].sort((a, b) => a - b);
      thresholds[0] = 0; // pin the floor so states[0] is the absolute fallback
      const at = states.map((s, i) => [thresholds[i]!, s] as const);
      return Boundary.make({
        input: 'viewport.width',
        at: at as never,
      });
    }),
);

// ---------------------------------------------------------------------------
// #90 — satelliteAttrs default-state law
// ---------------------------------------------------------------------------

describe('LESSON (#90): a boundary-bearing satellite always ships a server state', () => {
  test('PROPERTY: omitting initialState defaults data-liteship-state to states[0]', () => {
    fc.assert(
      fc.property(arbBoundary, (boundary) => {
        const attrs = satelliteAttrs({ boundary });
        // The state attribute is present (never undefined → CSS keyed on
        // [data-liteship-state] matches at first paint, no flash-of-unstated).
        expect(attrs['data-liteship-state']).toBeDefined();
        // …and it equals the fallback heuristic exactly, not some other state.
        expect(attrs['data-liteship-state']).toBe(resolveInitialStateFallback(boundary));
        expect(boundary.states).toContain(attrs['data-liteship-state']);
      }),
    );
  });

  test('PROPERTY: an explicit initialState still wins over the default (back-compat)', () => {
    fc.assert(
      fc.property(arbBoundary, (boundary) => {
        const chosen = boundary.states[boundary.states.length - 1]!;
        const attrs = satelliteAttrs({ boundary, initialState: chosen });
        expect(attrs['data-liteship-state']).toBe(chosen);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// #91 — resolveInitialState graceful-degradation law
// ---------------------------------------------------------------------------

describe('LESSON (#91): resolveInitialState degrades gracefully on absent context', () => {
  test('PROPERTY: callable with NO context arg and never throws', () => {
    fc.assert(
      fc.property(arbBoundary, (boundary) => {
        const state = resolveInitialState(boundary); // zero-arg
        expect(boundary.states).toContain(state);
      }),
    );
  });

  test('PROPERTY: each context field is independently optional', () => {
    fc.assert(
      fc.property(
        arbBoundary,
        fc.option(fc.constant('Mozilla/5.0 (iPhone)'), { nil: undefined }),
        fc.option(fc.constant('reactive' as const), { nil: undefined }),
        (boundary, userAgent, detectedCapTier) => {
          // Any subset of fields present — still resolves a real state.
          const state = resolveInitialState(boundary, {
            ...(userAgent !== undefined ? { userAgent } : {}),
            ...(detectedCapTier !== undefined ? { detectedCapTier } : {}),
            // clientHints intentionally always omitted → exercises the {} default
          });
          expect(boundary.states).toContain(state);
        },
      ),
    );
  });

  test('empty-context resolution agrees with the tier-default branch', () => {
    const boundary = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'compact'],
        [768, 'tablet'],
        [1280, 'desktop'],
      ],
    });
    // No fields → tier default 'reactive' → synthetic 960 → 'tablet'.
    expect(resolveInitialState(boundary, {})).toBe(resolveInitialState(boundary));
    expect(boundary.states).toContain(resolveInitialState(boundary, {}));
  });
});

// ---------------------------------------------------------------------------
// #92 — integration→middleware configure-once toggle seam
// ---------------------------------------------------------------------------

describe('LESSON (#92): worker isolation is configured once and derived, never diverges', () => {
  beforeEach(() => resetIntegrationTogglesForTesting());
  afterEach(() => resetIntegrationTogglesForTesting());

  test('PROPERTY: middleware with NO config inherits whatever the integration published', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.option(fc.constantFrom('require-corp' as const, 'credentialless' as const), { nil: undefined }),
        (workersEnabled, coep) => {
          // Single source of truth: integration computes the toggles…
          const toggles = resolveIntegrationToggles({
            workers: { enabled: workersEnabled, ...(coep ? { coep } : {}) },
          });
          publishIntegrationToggles(toggles);

          // …and middleware (configured with NOTHING) derives the same set.
          const derived = consumeIntegrationToggles();
          expect(derived.workersEnabled).toBe(workersEnabled);
          expect(derived.coep).toBe(coep);
        },
      ),
    );
  });

  test('explicit middleware config still overrides the published toggle (back-compat)', () => {
    publishIntegrationToggles(resolveIntegrationToggles({ workers: { enabled: false } }));
    const overridden = consumeIntegrationToggles({ workers: { enabled: true } });
    expect(overridden.workersEnabled).toBe(true);
  });

  test('END-TO-END: building the integration once makes liteshipMiddleware() emit COOP/COEP', async () => {
    resetIntegrationTogglesForTesting();
    // Stating workers exactly once, in integration(), publishes the toggle.
    integration({ workers: { enabled: true } });

    // Middleware with NO workers config now emits the isolation headers.
    const middleware = liteshipMiddleware();
    const context = {
      request: new Request('http://localhost/'),
      locals: {} as Record<string, unknown>,
    };
    const response = await middleware(context, () => Promise.resolve(new Response('OK')));

    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(response.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
  });
});

// ---------------------------------------------------------------------------
// #93 — liteship alias identity law
// ---------------------------------------------------------------------------

describe('LESSON (#93): `liteship` is the same factory as `integration` (no rename ritual)', () => {
  test('the alias is referentially identical to integration', () => {
    expect(liteship).toBe(integration);
  });

  test('liteship(...) produces an equivalent AstroIntegration', () => {
    expect(liteship().name).toBe('@liteship/astro');
    expect(liteship().name).toBe(integration().name);
  });
});

// ---------------------------------------------------------------------------
// #95–#100 — error-contract: every inert-island failure carries a fix
// ---------------------------------------------------------------------------

describe('LESSON (#95): boundary parse failure names the fix, not just the symptom', () => {
  test('malformed JSON → actionable satelliteAttrs() guidance', () => {
    const message = boundaryParseFailureMessage('{not valid json');
    expect(message).toBeTruthy();
    // Pin the CONTRACT (tells you the symptom + the fix), not the exact prose.
    expect(message).toMatch(/inert/i);
    expect(message).toMatch(/satelliteAttrs|JSON\.stringify/);
  });

  test('structurally-invalid payload → names the missing fields + the fix', () => {
    const message = boundaryParseFailureMessage(JSON.stringify({ input: 'viewport.width' }));
    expect(message).toBeTruthy();
    expect(message).toMatch(/thresholds|states/);
    expect(message).toMatch(/Boundary\.make|satelliteAttrs/);
  });

  test('parseBoundary emits a warnOnce diagnostic (not silence) on bad payloads', async () => {
    const events = await captureDiagnosticsAsync(async ({ events }) => {
      Diagnostics.reset();
      expect(parseBoundary('{broken')).toBeNull();
      return events;
    });
    const boundaryWarn = events.find((e) => e.source === 'liteship/astro.boundary');
    expect(boundaryWarn).toBeDefined();
    expect(boundaryWarn?.message).toMatch(/satelliteAttrs|JSON/);
  });

  test('PROPERTY: a well-formed satelliteAttrs payload NEVER produces a parse-failure message', () => {
    fc.assert(
      fc.property(arbBoundary, (boundary) => {
        const json = satelliteAttrs({ boundary })['data-liteship-boundary']!;
        expect(boundaryParseFailureMessage(json)).toBeNull();
        expect(parseBoundary(json)).not.toBeNull();
      }),
    );
  });
});
