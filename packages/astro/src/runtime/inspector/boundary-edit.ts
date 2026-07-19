/**
 * Pure, DOM-free boundary-edit helpers for the dev inspector — the LAWS the
 * draggable-notch UI leans on:
 *
 * - {@link rewriteBoundaryThreshold} keeps thresholds strictly monotonic across a
 *   notch drag (rewrite is rejected, never silently reordered).
 * - {@link trackMaxForInput} derives the track's 0..max scale from the SOURCE OF
 *   TRUTH (`inputToSource`), pinning the `scroll.progress` / `audio.*` 0..1 feeds
 *   to the same 1 `readSignalValue` reports (the scale drift-guard).
 *
 * Every export here is a pure function of its inputs (no `document`, no `window`
 * read), so they stay deterministic and unit-testable without a DOM.
 *
 * @module
 */

import { inputToSource } from '@liteship/core';
import type { SerializedBoundary } from '../boundary.js';

/** Rewrite one threshold in serialized boundary JSON. Returns null when invalid. */
export function rewriteBoundaryThreshold(
  boundaryJson: string,
  thresholdIndex: number,
  newValue: number,
): string | null {
  let parsed: Partial<SerializedBoundary>;
  try {
    parsed = JSON.parse(boundaryJson) as Partial<SerializedBoundary>;
  } catch (error) {
    // Malformed attribute JSON is the designed no-rewrite case; anything
    // else is a programming error that must surface.
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }

  if (
    !Array.isArray(parsed.thresholds) ||
    !Array.isArray(parsed.states) ||
    parsed.thresholds.length === 0 ||
    parsed.states.length !== parsed.thresholds.length ||
    thresholdIndex <= 0 ||
    thresholdIndex >= parsed.thresholds.length ||
    typeof newValue !== 'number' ||
    !Number.isFinite(newValue)
  ) {
    return null;
  }

  const thresholds = [...parsed.thresholds];
  thresholds[thresholdIndex] = newValue;

  for (let index = 1; index < thresholds.length; index++) {
    if (thresholds[index]! <= thresholds[index - 1]!) {
      return null;
    }
  }

  return JSON.stringify({
    ...parsed,
    thresholds,
  });
}

/** Format a paste-ready `Boundary.make` snippet from serialized boundary JSON. */
export function formatBoundaryMakeSnippet(boundaryJson: string): string {
  const parsed = JSON.parse(boundaryJson) as SerializedBoundary;
  const atPairs = parsed.thresholds.map((threshold, index) => `[${threshold}, '${parsed.states[index]}']`);
  const lines = [`  input: '${parsed.input}',`, `  at: [${atPairs.join(', ')}],`];
  if (typeof parsed.hysteresis === 'number') {
    lines.push(`  hysteresis: ${parsed.hysteresis},`);
  }
  if (parsed.id) {
    lines.push(`  // id: ${parsed.id}`);
  }
  return `Boundary.make({\n${lines.join('\n')}\n})`;
}

/** Derive the CSS container name a quantize block would use for an input. */
export function containerNameFromInput(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/**
 * The 0..max scale a boundary's notch track runs over. Derived from the SOURCE
 * OF TRUTH (`inputToSource`), never re-parsed from the raw input string.
 *
 * `scroll.progress` and the `audio.*` feeds are normalized 0..1 — the track runs
 * 0..1 so a 0.5-authored boundary maps to the middle. The `1` returned here is
 * pinned to `readSignalValue`'s 0..1 range by a drift guard.
 */
export function trackMaxForInput(input: string, thresholds: readonly number[]): number {
  const peak = thresholds.length > 0 ? Math.max(...thresholds) : 0;
  // Family is derived from the SOURCE OF TRUTH (inputToSource), not re-parsed.
  const source = inputToSource(input);
  if (source?.type === 'viewport') {
    return Math.max(peak * 1.5, typeof window !== 'undefined' ? window.innerWidth : peak, 1200);
  }
  if (source?.type === 'scroll') {
    // scroll.progress is the canonical 0..1 scale (see readSignalValue): the
    // track runs 0..1 so the cursor/notches map a 0.5-authored boundary to the
    // middle. A drift guard pins this 1 to readSignalValue's 0..1 range.
    if (source.axis === 'progress') {
      return 1;
    }
    return Math.max(peak * 1.5, 2000);
  }
  // audio.amplitude / audio.beat are normalized 0..1 feeds.
  if (source?.type === 'audio') {
    return 1;
  }
  return Math.max(peak * 1.5, peak + 100, 100);
}
