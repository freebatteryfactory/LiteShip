// @vitest-environment jsdom
/**
 * Authored ARIA reader chain (P1 Layer 2): serialize → parse → apply LIVE.
 *
 * Proves the "have-cake" data path end to end — `satelliteAttrs` folds authored
 * `stateAttributes` onto the boundary payload and SSRs the initial state's
 * attrs; `parseBoundary` reads them back; `applyBoundaryState` composes
 * `stateAttributes[currentState]` over the reflected aria so `aria-expanded`
 * updates on every crossing (NOT frozen at the SSR'd initial state).
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { Boundary } from '@czap/core';
import { satelliteAttrs } from '@czap/astro';
import { applyBoundaryState, parseBoundary } from '../../../packages/astro/src/runtime/boundary.js';

const boundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'collapsed'],
    [768, 'expanded'],
  ],
});

const aria = {
  collapsed: { 'aria-expanded': 'false' },
  expanded: { 'aria-expanded': 'true' },
} as const;

describe('authored ARIA: serialize → parse → apply', () => {
  test('satelliteAttrs serializes stateAttributes and SSRs the initial state attrs', () => {
    const attrs = satelliteAttrs({ boundary, aria });
    const payload = JSON.parse(attrs['data-czap-boundary']!) as { stateAttributes?: unknown };
    expect(payload.stateAttributes).toEqual(aria);
    // initial state = collapsed → its authored attr is on the element at SSR
    expect(attrs['data-czap-state']).toBe('collapsed');
    expect(attrs['aria-expanded']).toBe('false');
  });

  test('parseBoundary reads stateAttributes back into the RuntimeBoundary', () => {
    const attrs = satelliteAttrs({ boundary, aria });
    const runtime = parseBoundary(attrs['data-czap-boundary']!);
    expect(runtime?.stateAttributes).toEqual(aria);
  });

  test('applyBoundaryState composes authored aria for the LIVE state (updates on crossing)', () => {
    const attrs = satelliteAttrs({ boundary, aria });
    const runtime = parseBoundary(attrs['data-czap-boundary']!)!;
    const el = document.createElement('div');

    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'expanded' } }, 'czap:state');
    expect(el.getAttribute('aria-expanded')).toBe('true');

    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'collapsed' } }, 'czap:state');
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  test('the dispatched czap:state detail carries the composed authored aria', () => {
    const attrs = satelliteAttrs({ boundary, aria });
    const runtime = parseBoundary(attrs['data-czap-boundary']!)!;
    const el = document.createElement('div');
    let seen: Record<string, string> | undefined;
    el.addEventListener('czap:state', (e) => {
      seen = (e as CustomEvent<{ aria: Record<string, string> }>).detail.aria;
    });
    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'expanded' } }, 'czap:state');
    expect(seen?.['aria-expanded']).toBe('true');
  });

  test('a boundary with no authored aria is unaffected (no stateAttributes, no attrs)', () => {
    const attrs = satelliteAttrs({ boundary });
    const payload = JSON.parse(attrs['data-czap-boundary']!) as { stateAttributes?: unknown };
    expect(payload.stateAttributes).toBeUndefined();
    expect(attrs['aria-expanded']).toBeUndefined();
    const runtime = parseBoundary(attrs['data-czap-boundary']!)!;
    expect(runtime.stateAttributes).toBeUndefined();
    const el = document.createElement('div');
    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'expanded' } }, 'czap:state');
    expect(el.hasAttribute('aria-expanded')).toBe(false);
  });
});
