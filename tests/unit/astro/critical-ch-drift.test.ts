// @vitest-environment node
/**
 * Critical-CH drift guard.
 *
 * `@czap/edge` owns the client-hint vocabulary; `@czap/astro`'s `CLIENT_HINTS_HEADERS`
 * (read by the dev-server middleware) must send the SAME hints the production middleware
 * does (which calls `ClientHints.acceptCHHeader()` / `criticalCHHeader()` directly). The
 * two were hand-mirrored and had silently diverged: dev listed `Sec-CH-Viewport-Width` as
 * critical, production did not — so a cold Chromium request never resent the viewport hint
 * before the first render, and SSR boundary resolution (`resolveInitialState`) fell back
 * to a User-Agent estimate that could disagree with the container-query CSS.
 *
 * This pins the single source of truth (astro derives from edge), that
 * `Sec-CH-Viewport-Width` is boot-critical, and that every critical hint is actually
 * requested — the invariants whose absence let the drift happen.
 */
import { describe, test, expect } from 'vitest';
import { ClientHints } from '../../../packages/edge/src/client-hints.js';
import { CrossOriginIsolation } from '../../../packages/edge/src/cross-origin.js';
import { CLIENT_HINTS_HEADERS, CROSS_ORIGIN_HEADERS } from '../../../packages/astro/src/headers.js';

const split = (header: string): string[] =>
  header
    .split(',')
    .map((hint) => hint.trim())
    .filter(Boolean);

describe('Critical-CH drift guard', () => {
  test('@czap/astro CLIENT_HINTS_HEADERS is derived from @czap/edge — the two can never diverge', () => {
    expect(CLIENT_HINTS_HEADERS['Accept-CH']).toBe(ClientHints.acceptCHHeader());
    expect(CLIENT_HINTS_HEADERS['Critical-CH']).toBe(ClientHints.criticalCHHeader());
    expect(CLIENT_HINTS_HEADERS['Vary']).toBe(ClientHints.varyCHHeader());
  });

  test('Sec-CH-Viewport-Width is boot-critical — SSR boundary resolution reads it before first render', () => {
    expect(split(ClientHints.criticalCHHeader())).toContain('Sec-CH-Viewport-Width');
  });

  test('every critical hint is also requested in Accept-CH (a hint never asked for can never arrive critically)', () => {
    const accepted = new Set(split(ClientHints.acceptCHHeader()));
    for (const hint of split(ClientHints.criticalCHHeader())) {
      expect(accepted.has(hint), `${hint} is Critical-CH but missing from Accept-CH`).toBe(true);
    }
  });
});

describe('Cross-origin isolation drift guard', () => {
  test('@czap/astro CROSS_ORIGIN_HEADERS is derived from @czap/edge CrossOriginIsolation — the emitter and the doctor validator share one source', () => {
    // The values czap EMITS (astro) and the values `czap doctor --deployed` VALIDATES
    // (edge) must be the same, or a correctly-configured deploy would warn.
    expect(CROSS_ORIGIN_HEADERS).toEqual(CrossOriginIsolation.isolationHeaders());
    expect(CROSS_ORIGIN_HEADERS['Cross-Origin-Opener-Policy']).toBe(CrossOriginIsolation.openerPolicy());
  });

  test('the emitted COOP/COEP are among edge`s isolating values (a real deploy passes the doctor probe)', () => {
    expect(CrossOriginIsolation.openerPolicy()).toBe(CROSS_ORIGIN_HEADERS['Cross-Origin-Opener-Policy']);
    expect(CrossOriginIsolation.embedderPolicies()).toContain(CROSS_ORIGIN_HEADERS['Cross-Origin-Embedder-Policy']);
  });
});
