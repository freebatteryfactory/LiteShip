/**
 * Directive boot scanner — the regression lane for the inert-directive bug.
 *
 * Astro only fires custom client directives on framework-component
 * islands; a plain `<div client:adaptive>` (or a `Adaptive.astro`
 * shell) previously shipped the attribute verbatim and no runtime ever
 * ran. These tests exercise the injected scanner end-to-end in a real
 * browser: legacy `client:*` markers, the canonical
 * `data-liteship-directive` marker, enabled-set gating, idempotency,
 * `astro:after-swap` re-scans, and a scroll-signal boundary through a
 * real directive.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Diagnostics } from '@liteship/core';
import { bootstrapDirectives, scanAndBootDirectives } from '../../packages/astro/src/runtime/directive-boot.js';
import { installSwapPipeline } from '../../packages/astro/src/runtime/swap-pipeline.js';

// Failure-path stand-in: an llm directive entry that throws on init, injected
// through the scanner's `loaders` seam so the transient-failure handling
// (unmark + diagnostic) is testable without mocking the client-directive module.
const throwingLlmLoaders = {
  llm: () =>
    Promise.resolve({
      default: () => {
        throw new Error('simulated chunk init failure');
      },
    }),
};

// No-op stand-in: isolates the directive-COLLISION test from real WebGL/WebGPU
// init so it exercises only the scanner's double-claim detection.
const noopGpuLoaders = {
  gpu: () => Promise.resolve({ default: () => {} }),
};

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
    document.documentElement.setAttribute('data-liteship-tier', 'animated');
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
      element.dispatchEvent(new CustomEvent('liteship:teardown'));
    });
    delete (window as Window & { __LITESHIP_DIRECTIVE_BOOTSTRAPPED__?: boolean }).__LITESHIP_DIRECTIVE_BOOTSTRAPPED__;
    delete (window as Window & { __LITESHIP_SWAP_PIPELINE__?: boolean }).__LITESHIP_SWAP_PIPELINE__;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Diagnostics.reset();
    document.body.innerHTML = '';
  });

  test('legacy client:adaptive marker on a plain element activates (the 0.1.4 inert case)', async () => {
    vi.stubGlobal('innerWidth', 500);
    const el = makeMarkedElement({ 'data-liteship-boundary': boundary, 'client:adaptive': '' });

    await scanAndBootDirectives(['adaptive']);

    expect(el.getAttribute('data-liteship-state')).toBe('compact');
    expect(el.getAttribute('data-liteship-directive-bound')).toBe('adaptive');
  });

  test('canonical data-liteship-directive marker activates identically', async () => {
    vi.stubGlobal('innerWidth', 900);
    const el = makeMarkedElement({ 'data-liteship-boundary': boundary, 'data-liteship-directive': 'adaptive' });

    await scanAndBootDirectives(['adaptive']);

    expect(el.getAttribute('data-liteship-state')).toBe('expanded');
  });

  test('markers for directives outside the enabled set are left untouched', async () => {
    vi.stubGlobal('innerWidth', 500);
    const el = makeMarkedElement({ 'data-liteship-boundary': boundary, 'data-liteship-directive': 'worker' });

    await scanAndBootDirectives(['adaptive']);

    expect(el.getAttribute('data-liteship-state')).toBeNull();
    expect(el.hasAttribute('data-liteship-directive-bound')).toBe(false);
  });

  test('two liteship directives on one element warn about the collision (the client:gpu + adaptive trap)', async () => {
    vi.stubGlobal('innerWidth', 500);
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.clearOnce();
    Diagnostics.setSink(sink);
    // One element carrying BOTH an adaptive marker and a legacy client:gpu
    // attribute -- exactly the canvas that booted an adaptive and never started
    // its GPU shader, with no warning.
    const el = makeMarkedElement({
      'data-liteship-boundary': boundary,
      'data-liteship-directive': 'adaptive',
      'client:gpu': '',
    });

    await scanAndBootDirectives(['adaptive', 'gpu'], undefined, noopGpuLoaders);

    // adaptive (scanned first) claims the element; gpu then sees it already
    // bound and warns instead of silently fighting over the node.
    const collisions = events.filter((event) => event.code === 'astro/directive-boot/directive-collision');
    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.detail).toEqual({ conflicting: ['adaptive', 'gpu'] });
    expect(el.getAttribute('data-liteship-directive-bound')).toContain('adaptive');
  });

  test('re-scanning is idempotent per element', async () => {
    vi.stubGlobal('innerWidth', 500);
    const el = makeMarkedElement({ 'data-liteship-boundary': boundary, 'data-liteship-directive': 'adaptive' });

    await scanAndBootDirectives(['adaptive']);
    el.setAttribute('data-liteship-state', 'sentinel');
    await scanAndBootDirectives(['adaptive']);

    // A second init would re-evaluate and overwrite the sentinel.
    expect(el.getAttribute('data-liteship-state')).toBe('sentinel');
    expect(el.getAttribute('data-liteship-directive-bound')).toBe('adaptive');
  });

  test('a marked element passed AS the scan root activates (not only descendants)', async () => {
    vi.stubGlobal('innerWidth', 500);
    const el = makeMarkedElement({ 'data-liteship-boundary': boundary, 'data-liteship-directive': 'adaptive' });

    await scanAndBootDirectives(['adaptive'], el);

    expect(el.getAttribute('data-liteship-state')).toBe('compact');
  });

  test('a failed activation unmarks the element so a later re-scan retries', async () => {
    vi.stubGlobal('innerWidth', 500);
    // The injected llm directive entry throws on init (the transient-failure
    // path). The element must NOT stay branded as bound, or astro:after-swap
    // re-scans could never retry it.
    const el = makeMarkedElement({ 'data-liteship-boundary': boundary, 'data-liteship-directive': 'llm' });

    await scanAndBootDirectives(['llm'], undefined, throwingLlmLoaders);

    expect(el.hasAttribute('data-liteship-directive-bound')).toBe(false);
    expect(el.getAttribute('data-liteship-state')).toBeNull();
  });

  test('the swap pipeline re-scans swapped-in DOM on astro:after-swap (the View-Transitions survival contract)', async () => {
    vi.stubGlobal('innerWidth', 500);
    // The production boot script (integration.ts) wires BOTH the initial scan
    // (bootstrapDirectives) AND the single ordered after-swap pipeline
    // (installSwapPipeline). The post-swap re-scan is step 2 of that pipeline
    // (rescanSlots → bootDirectives → reinitDirectives), NOT a listener that
    // bootstrapDirectives registers itself. Mirror the real wiring here.
    bootstrapDirectives(['adaptive']);
    installSwapPipeline(['adaptive']);

    // Fresh server HTML arrives via View Transitions: no bound attribute. Astro
    // does NOT re-execute page scripts on a swap, so the pipeline's after-swap
    // listener is the only thing that boots these freshly swapped-in directives.
    document.body.innerHTML = '';
    const swapped = makeMarkedElement({ 'data-liteship-boundary': boundary, 'data-liteship-directive': 'adaptive' });
    document.dispatchEvent(new Event('astro:after-swap'));

    await vi.waitFor(() => {
      expect(swapped.getAttribute('data-liteship-state')).toBe('compact');
    });
  });

  test('a scroll.y boundary activates and re-evaluates on scroll through a real directive', async () => {
    vi.stubGlobal('scrollY', 0);
    const el = makeMarkedElement({
      'data-liteship-boundary': JSON.stringify({
        id: 'reader',
        input: 'scroll.y',
        thresholds: [0, 400],
        states: ['top', 'deep'],
      }),
      'data-liteship-directive': 'adaptive',
    });

    await scanAndBootDirectives(['adaptive']);
    expect(el.getAttribute('data-liteship-state')).toBe('top');

    vi.stubGlobal('scrollY', 900);
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    expect(el.getAttribute('data-liteship-state')).toBe('deep');
  });
});
