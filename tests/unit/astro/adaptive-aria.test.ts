// @vitest-environment jsdom
/**
 * Authored ARIA reader chain (P1 Layer 2): serialize → parse → apply LIVE.
 *
 * Proves the "have-cake" data path end to end — `adaptiveAttrs` folds authored
 * `stateAttributes` onto the boundary payload and SSRs the initial state's
 * attrs; `parseBoundary` reads them back; `applyBoundaryState` composes
 * `stateAttributes[currentState]` over the reflected aria so `aria-expanded`
 * updates on every crossing (NOT frozen at the SSR'd initial state).
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { defineBoundary } from '@liteship/core';
import { adaptiveAttrs } from '@liteship/astro';
import { applyBoundaryState, parseBoundary } from '../../../packages/astro/src/runtime/boundary.js';

const boundary = defineBoundary({
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
  test('adaptiveAttrs serializes stateAttributes and SSRs the initial state attrs', () => {
    const attrs = adaptiveAttrs({ boundary, aria });
    const payload = JSON.parse(attrs['data-liteship-boundary']!) as { stateAttributes?: unknown };
    expect(payload.stateAttributes).toEqual(aria);
    // initial state = collapsed → its authored attr is on the element at SSR
    expect(attrs['data-liteship-state']).toBe('collapsed');
    expect(attrs['aria-expanded']).toBe('false');
  });

  test('parseBoundary reads stateAttributes back into the RuntimeBoundary', () => {
    const attrs = adaptiveAttrs({ boundary, aria });
    const runtime = parseBoundary(attrs['data-liteship-boundary']!);
    expect(runtime?.stateAttributes).toEqual(aria);
  });

  test('applyBoundaryState composes authored aria for the LIVE state (updates on crossing)', () => {
    const attrs = adaptiveAttrs({ boundary, aria });
    const runtime = parseBoundary(attrs['data-liteship-boundary']!)!;
    const el = document.createElement('div');

    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'expanded' } }, 'liteship:state');
    expect(el.getAttribute('aria-expanded')).toBe('true');

    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'collapsed' } }, 'liteship:state');
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  test('the dispatched liteship:state detail carries the composed authored aria', () => {
    const attrs = adaptiveAttrs({ boundary, aria });
    const runtime = parseBoundary(attrs['data-liteship-boundary']!)!;
    const el = document.createElement('div');
    let seen: Record<string, string> | undefined;
    el.addEventListener('liteship:state', (e) => {
      seen = (e as CustomEvent<{ aria: Record<string, string> }>).detail.aria;
    });
    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'expanded' } }, 'liteship:state');
    expect(seen?.['aria-expanded']).toBe('true');
  });

  test('a boundary with no authored aria is unaffected (no stateAttributes, no attrs)', () => {
    const attrs = adaptiveAttrs({ boundary });
    const payload = JSON.parse(attrs['data-liteship-boundary']!) as { stateAttributes?: unknown };
    expect(payload.stateAttributes).toBeUndefined();
    expect(attrs['aria-expanded']).toBeUndefined();
    const runtime = parseBoundary(attrs['data-liteship-boundary']!)!;
    expect(runtime.stateAttributes).toBeUndefined();
    const el = document.createElement('div');
    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'expanded' } }, 'liteship:state');
    expect(el.hasAttribute('aria-expanded')).toBe(false);
  });
});
