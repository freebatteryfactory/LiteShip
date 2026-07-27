/**
 * view-transition compile surface — build-time cross-document / cross-fade
 * View Transitions for a boundary (#CSS, Wave-4 "Modern CSS vs the motion ceremony").
 *
 * This surface is PURE PROGRESSIVE ENHANCEMENT: it emits `view-transition-name`
 * per boundary, `::view-transition-old/new` pseudo styles that REUSE the boundary's
 * already-compiled `linear()` easing (Law 4 — one curve, never forked), and an
 * optional build-time `@view-transition { navigation: auto }` at-rule for MPA
 * documents. There is ZERO runtime and NO fallback tier — a browser without View
 * Transitions simply navigates/paints instantly, and the emitted CSS is inert.
 */

import { describe, test, expect } from 'vitest';
import { Easing, DEFAULT_MOTION_SPRING } from '@liteship/core';
import {
  compileViewTransition,
  type ViewTransitionCompileResult,
} from '../../../packages/compiler/src/view-transition-compile.js';

describe('compileViewTransition — view-transition-name per boundary', () => {
  test('assigns a sanitized custom-ident to the boundary selector', () => {
    const result = compileViewTransition({ boundary: 'hero', durationMs: 420, easing: 'ease' });

    expect(result.viewTransitionName).toBe('liteship-vt-hero');
    expect(result.nameAssignment).toContain('[data-liteship-boundary="hero"]');
    expect(result.nameAssignment).toContain('view-transition-name: liteship-vt-hero;');
  });

  test('escapes special characters in the DEFAULT attribute-selector value (no broken CSS)', () => {
    const result = compileViewTransition({ boundary: 'hero"card', durationMs: 420, easing: 'ease' });
    // The quote is backslash-escaped so the attribute selector stays one string …
    expect(result.nameAssignment).toContain('[data-liteship-boundary="hero\\"card"]');
    // … NOT the raw form that terminates the string early and drops the assignment.
    expect(result.nameAssignment).not.toContain('[data-liteship-boundary="hero"card"]');
    // The name remains a valid custom-ident (the quote collapsed to a hyphen).
    expect(result.viewTransitionName).toBe('liteship-vt-hero-card');
  });

  test('honors an explicit selector for the name assignment', () => {
    const result = compileViewTransition({
      boundary: 'card',
      selector: '.gallery > figure',
      durationMs: 300,
      easing: 'ease',
    });

    expect(result.nameAssignment).toContain('.gallery > figure {');
    expect(result.nameAssignment).toContain('view-transition-name: liteship-vt-card;');
  });

  test('sanitizes a boundary with whitespace/special chars into a valid custom-ident', () => {
    const result = compileViewTransition({ boundary: 'Hero Card #2', durationMs: 200, easing: 'ease' });

    // Only [A-Za-z0-9_-] survive; runs collapse to a single hyphen; no leading/trailing hyphen.
    expect(result.viewTransitionName).toBe('liteship-vt-Hero-Card-2');
    expect(result.viewTransitionName).toMatch(/^liteship-vt-[A-Za-z0-9_-]+$/);
    expect(result.viewTransitionName).not.toMatch(/-$/);
  });
});

describe('compileViewTransition — ::view-transition pseudo styles reuse the compiled easing', () => {
  test('old + new pseudos carry the SAME linear() easing string the motion path compiled', () => {
    // The exact easing string a spring boundary compiles to via the native motion compiler.
    const springEasing = Easing.springToLinearCSS(DEFAULT_MOTION_SPRING);
    expect(springEasing.startsWith('linear(')).toBe(true);

    const result = compileViewTransition({ boundary: 'hero', durationMs: 420, easing: springEasing });

    expect(result.pseudoStyles).toContain('::view-transition-old(liteship-vt-hero)');
    expect(result.pseudoStyles).toContain('::view-transition-new(liteship-vt-hero)');
    // Reuse, not recompute: the identical linear() list appears in the pseudo rules.
    const occurrences = result.pseudoStyles.split(springEasing).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(1);
    expect(result.pseudoStyles).toContain('animation-timing-function: ' + springEasing + ';');
    expect(result.pseudoStyles).toContain('animation-duration: 420ms;');
  });

  test('a plain keyword easing (ease/linear) is reused verbatim', () => {
    const result = compileViewTransition({ boundary: 'hero', durationMs: 300, easing: 'linear' });
    expect(result.pseudoStyles).toContain('animation-timing-function: linear;');
  });

  test('a stagger/entry delay is emitted as animation-delay on the pseudos', () => {
    const withDelay = compileViewTransition({ boundary: 'hero', durationMs: 300, easing: 'ease', delayMs: 60 });
    expect(withDelay.pseudoStyles).toContain('animation-delay: 60ms;');

    const noDelay = compileViewTransition({ boundary: 'hero', durationMs: 300, easing: 'ease' });
    expect(noDelay.pseudoStyles).not.toContain('animation-delay');
  });
});

describe('compileViewTransition — @view-transition navigation at-rule (MPA opt-in)', () => {
  test('emits the build-time at-rule when mpaNavigation is requested', () => {
    const result = compileViewTransition({ boundary: 'hero', durationMs: 420, easing: 'ease', mpaNavigation: true });
    expect(result.atRule).toContain('@view-transition {');
    expect(result.atRule).toContain('navigation: auto;');
    expect(result.raw).toContain('@view-transition {');
  });

  test('omits the at-rule for the SPA default (router drives startViewTransition)', () => {
    const result = compileViewTransition({ boundary: 'hero', durationMs: 420, easing: 'ease' });
    expect(result.atRule).toBe('');
    expect(result.raw).not.toContain('@view-transition');
  });
});

describe('compileViewTransition — zero-runtime, no-fallback posture', () => {
  const result: ViewTransitionCompileResult = compileViewTransition({
    boundary: 'hero',
    durationMs: 420,
    easing: Easing.springToLinearCSS(DEFAULT_MOTION_SPRING),
    mpaNavigation: true,
  });

  test('emits pure CSS — no script, no JS handles, nothing to execute', () => {
    expect(result.raw).not.toMatch(/<script/i);
    // No JS: no arrow/function calls (the CSS `animation-timing-function` keyword is fine).
    expect(result.raw).not.toMatch(/=>/);
    expect(result.raw).not.toMatch(/\bfunction\s*\(/);
    expect(result.raw).not.toContain('addEventListener');
    expect(result.raw).not.toContain('startViewTransition');
  });

  test('carries NO fallback tier — no @supports gate and no transition/timeline fallback', () => {
    // Unsupported browsers navigate instantly; there is deliberately nothing to fall back to.
    expect(result.raw).not.toContain('@supports');
    expect(result.raw).not.toContain('transition:');
    expect(result.raw).not.toContain('animation-timeline');
  });

  test('is a pure, deterministic function of its input (same in ⇒ same bytes)', () => {
    const again = compileViewTransition({
      boundary: 'hero',
      durationMs: 420,
      easing: Easing.springToLinearCSS(DEFAULT_MOTION_SPRING),
      mpaNavigation: true,
    });
    expect(again.raw).toBe(result.raw);
  });

  test('raw concatenates every non-empty section', () => {
    expect(result.raw).toContain(result.atRule);
    expect(result.raw).toContain(result.nameAssignment);
    expect(result.raw).toContain(result.pseudoStyles);
  });
});
