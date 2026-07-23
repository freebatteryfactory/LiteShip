/**
 * View-transition compile surface — build-time cross-document / cross-fade View
 * Transitions for a boundary (#CSS, Wave-4 "Modern CSS vs the motion ceremony").
 *
 * This is PURE PROGRESSIVE ENHANCEMENT with ZERO runtime and NO fallback tier:
 *
 *   - {@link ViewTransitionCompileResult.nameAssignment} gives the boundary its own
 *     `view-transition-name`, so the browser snapshots it as an independent element
 *     across a navigation / `document.startViewTransition`.
 *   - {@link ViewTransitionCompileResult.pseudoStyles} styles the
 *     `::view-transition-old(name)` / `::view-transition-new(name)` cross-fade,
 *     REUSING the boundary's ALREADY-COMPILED `linear()` easing string (the exact
 *     one `MotionCompiler` produced via `Easing.springToLinearCSS`). One curve, never
 *     forked — the pseudo cross-fade and the boundary's own motion sample the SAME
 *     easing (Law 4).
 *   - {@link ViewTransitionCompileResult.atRule} optionally emits the build-time
 *     `@view-transition { navigation: auto }` that opts an MPA document into
 *     cross-document view transitions. SPA callers omit it — their router drives
 *     `document.startViewTransition` and needs no at-rule.
 *
 * There is deliberately no `@supports` gate and no `transition`/`animation-timeline`
 * fallback: a browser without View Transitions simply navigates/paints instantly and
 * the emitted CSS is inert. Because the surface is 100% CSS, it slots into the existing
 * `liteship:reinit` lifecycle unchanged — there is nothing to attach, dispose, or re-read.
 *
 * @module
 */

import { escapeCssString } from './css-string.js';

/** Input to {@link compileViewTransition}. */
export interface ViewTransitionCompileInput {
  /** The boundary/target name (e.g. `'hero'`) — seeds the `view-transition-name` ident. */
  readonly boundary: string;
  /**
   * The element selector the name is assigned to. Defaults to the boundary's data
   * attribute selector (`[data-liteship-boundary="<boundary>"]`) — the same hook
   * `MotionCompiler` keys its `liteship-motion-*` animations off.
   */
  readonly selector?: string;
  /** Cross-fade duration (ms) for the old/new pseudo-element animations. */
  readonly durationMs: number;
  /**
   * The ALREADY-COMPILED CSS timing-function string to REUSE (e.g. `'ease'`,
   * `'linear'`, or a spring `'linear(0.0000, …)'`). This is the identical string the
   * boundary's motion compiled to — the pseudo cross-fade reads one curve with it
   * (Law 4), never recomputing its own.
   */
  readonly easing: string;
  /**
   * Emit the build-time `@view-transition { navigation: auto }` at-rule for MPA
   * documents (cross-document view transitions). Omit / `false` for SPA, where the
   * router invokes `document.startViewTransition` and no at-rule is needed.
   */
  readonly mpaNavigation?: boolean;
  /** Optional stagger / entry delay (ms) applied as `animation-delay` on the pseudos. */
  readonly delayMs?: number;
}

/** CSS artifacts emitted by {@link compileViewTransition}. */
export interface ViewTransitionCompileResult {
  /** The sanitized custom-ident used as the `view-transition-name`. */
  readonly viewTransitionName: string;
  /** `<selector> { view-transition-name: <ident>; }`. */
  readonly nameAssignment: string;
  /** `::view-transition-old(<name>)` + `::view-transition-new(<name>)` cross-fade rules. */
  readonly pseudoStyles: string;
  /** `@view-transition { navigation: auto; }` for MPA; empty for the SPA default. */
  readonly atRule: string;
  /** Full concatenated sheet (non-empty sections joined by a blank line). */
  readonly raw: string;
}

/**
 * Turn a boundary name into a valid CSS `<custom-ident>` for `view-transition-name`:
 * a stable `liteship-vt-` prefix (guaranteeing an identifier that never starts with a
 * digit or `--`) followed by the boundary with any non `[A-Za-z0-9_-]` run collapsed
 * to a single hyphen and leading/trailing hyphens trimmed.
 */
function viewTransitionNameFor(boundary: string): string {
  const slug = boundary
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `liteship-vt-${slug.length > 0 ? slug : 'boundary'}`;
}

/**
 * Compile the build-time View-Transition CSS for a single boundary. Pure and
 * deterministic — identical input yields byte-identical output.
 */
export function compileViewTransition(input: ViewTransitionCompileInput): ViewTransitionCompileResult {
  const { boundary, durationMs, easing, mpaNavigation, delayMs } = input;
  const selector = input.selector ?? `[data-liteship-boundary="${escapeCssString(boundary)}"]`;
  const viewTransitionName = viewTransitionNameFor(boundary);

  const nameAssignment = [`${selector} {`, `  view-transition-name: ${viewTransitionName};`, `}`].join('\n');

  const pseudoDecls = [`  animation-duration: ${durationMs}ms;`, `  animation-timing-function: ${easing};`];
  if (delayMs !== undefined && delayMs > 0) {
    pseudoDecls.push(`  animation-delay: ${delayMs}ms;`);
  }
  const pseudoStyles = [
    `::view-transition-old(${viewTransitionName}),`,
    `::view-transition-new(${viewTransitionName}) {`,
    pseudoDecls.join('\n'),
    `}`,
  ].join('\n');

  const atRule = mpaNavigation === true ? [`@view-transition {`, `  navigation: auto;`, `}`].join('\n') : '';

  const raw = [atRule, nameAssignment, pseudoStyles].filter((s) => s.length > 0).join('\n\n');

  return Object.freeze({ viewTransitionName, nameAssignment, pseudoStyles, atRule, raw });
}
