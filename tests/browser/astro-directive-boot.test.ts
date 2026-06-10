/**
 * Directive boot scanner — the regression lane for the inert-directive bug.
 *
 * Astro only fires custom client directives on framework-component
 * islands; a plain `<div client:satellite>` (or a `Satellite.astro`
 * shell) previously shipped the attribute verbatim and no runtime ever
 * ran. These tests exercise the injected scanner end-to-end in a real
 * browser: legacy `client:*` markers, the canonical
 * `data-czap-directive` marker, enabled-set gating, idempotency,
 * `astro:after-swap` re-scans, and a scroll-signal boundary through a
 * real directive.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { bootstrapDirectives, scanAndBootDirectives } from '../../packages/astro/src/runtime/directive-boot.js';

// Failure-path stand-in: the llm directive throws on init so the scanner's
// transient-failure handling (unmark + diagnostic) is testable.
vi.mock('../../packages/astro/src/client-directives/llm.js', () => ({
  default: () => {
    throw new Error('simulated chunk init failure');
  },
}));

const boundary = JSON.stringify({
  id: 'hero',
  input: 'viewport.width',
  thresholds: [0, 768],
  states: ['compact', 'expanded'],
  hysteresis: 20,
});

function makeMarkedElement(attributes: Record<string, string>): HTMLElement {
  const el = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  document.body.appendChild(el);
  return el;
}

describe('directive boot scanner', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.setAttribute('data-czap-tier', 'animated');
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
  });

  afterEach(() => {
    document.querySelectorAll<HTMLElement>('*').forEach((element) => {
      element.dispatchEvent(new CustomEvent('czap:dispose'));
    });
    delete (window as Window & { __CZAP_DIRECTIVE_BOOTSTRAPPED__?: boolean }).__CZAP_DIRECTIVE_BOOTSTRAPPED__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  test('legacy client:satellite marker on a plain element activates (the 0.1.4 inert case)', async () => {
    vi.stubGlobal('innerWidth', 500);
    const el = makeMarkedElement({ 'data-czap-boundary': boundary, 'client:satellite': '' });

    await scanAndBootDirectives(['satellite']);

    expect(el.getAttribute('data-czap-state')).toBe('compact');
    expect(el.getAttribute('data-czap-directive-bound')).toBe('satellite');
  });

  test('canonical data-czap-directive marker activates identically', async () => {
    vi.stubGlobal('innerWidth', 900);
    const el = makeMarkedElement({ 'data-czap-boundary': boundary, 'data-czap-directive': 'satellite' });

    await scanAndBootDirectives(['satellite']);

    expect(el.getAttribute('data-czap-state')).toBe('expanded');
  });

  test('markers for directives outside the enabled set are left untouched', async () => {
    vi.stubGlobal('innerWidth', 500);
    const el = makeMarkedElement({ 'data-czap-boundary': boundary, 'data-czap-directive': 'worker' });

    await scanAndBootDirectives(['satellite']);

    expect(el.getAttribute('data-czap-state')).toBeNull();
    expect(el.hasAttribute('data-czap-directive-bound')).toBe(false);
  });

  test('re-scanning is idempotent per element', async () => {
    vi.stubGlobal('innerWidth', 500);
    const el = makeMarkedElement({ 'data-czap-boundary': boundary, 'data-czap-directive': 'satellite' });

    await scanAndBootDirectives(['satellite']);
    el.setAttribute('data-czap-state', 'sentinel');
    await scanAndBootDirectives(['satellite']);

    // A second init would re-evaluate and overwrite the sentinel.
    expect(el.getAttribute('data-czap-state')).toBe('sentinel');
    expect(el.getAttribute('data-czap-directive-bound')).toBe('satellite');
  });

  test('a marked element passed AS the scan root activates (not only descendants)', async () => {
    vi.stubGlobal('innerWidth', 500);
    const el = makeMarkedElement({ 'data-czap-boundary': boundary, 'data-czap-directive': 'satellite' });

    await scanAndBootDirectives(['satellite'], el);

    expect(el.getAttribute('data-czap-state')).toBe('compact');
  });

  test('a failed activation unmarks the element so a later re-scan retries', async () => {
    vi.stubGlobal('innerWidth', 500);
    // The llm directive module is mocked (top of file) to throw on init —
    // the transient-failure path. The element must NOT stay branded as
    // bound, or astro:after-swap re-scans could never retry it.
    const el = makeMarkedElement({ 'data-czap-boundary': boundary, 'data-czap-directive': 'llm' });

    await scanAndBootDirectives(['llm']);

    expect(el.hasAttribute('data-czap-directive-bound')).toBe(false);
    expect(el.getAttribute('data-czap-state')).toBeNull();
  });

  test('bootstrapDirectives re-scans swapped-in DOM on astro:after-swap', async () => {
    vi.stubGlobal('innerWidth', 500);
    bootstrapDirectives(['satellite']);

    // Fresh server HTML arrives via View Transitions: no bound attribute.
    document.body.innerHTML = '';
    const swapped = makeMarkedElement({ 'data-czap-boundary': boundary, 'data-czap-directive': 'satellite' });
    document.dispatchEvent(new Event('astro:after-swap'));

    await vi.waitFor(() => {
      expect(swapped.getAttribute('data-czap-state')).toBe('compact');
    });
  });

  test('a scroll.y boundary activates and re-evaluates on scroll through a real directive', async () => {
    vi.stubGlobal('scrollY', 0);
    const el = makeMarkedElement({
      'data-czap-boundary': JSON.stringify({
        id: 'reader',
        input: 'scroll.y',
        thresholds: [0, 400],
        states: ['top', 'deep'],
      }),
      'data-czap-directive': 'satellite',
    });

    await scanAndBootDirectives(['satellite']);
    expect(el.getAttribute('data-czap-state')).toBe('top');

    vi.stubGlobal('scrollY', 900);
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    expect(el.getAttribute('data-czap-state')).toBe('deep');
  });
});
