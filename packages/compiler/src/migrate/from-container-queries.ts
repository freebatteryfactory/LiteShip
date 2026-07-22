/**
 * `migrate/from-container-queries` — lower native CSS `@container` query blocks
 * into ordinary {@link defineBoundary} definitions.
 *
 * A stylesheet's anonymous `@container (<condition>) { … }` blocks each declare
 * a single-axis width/height range. This adapter reads every top-level block,
 * refuses named containers (their identity has no runtime signal owner), reduces
 * each anonymous condition to a `(lo, hi)` range on one axis, then RANGE-MERGES
 * adjacent blocks on that axis into a single ascending threshold list — the
 * literal inverse of the compiler's
 * `buildContainerQuery` emit (`(width < T)`, `(width >= A) and (width < B)`,
 * `(width >= T)`). The merged thresholds become one `defineBoundary` whose
 * `input` is `viewport.<axis>` (the same input the `@quantize` compiler lowers to
 * `@container` queries).
 *
 * Lossy / dropped cases are surfaced as {@link MigrationDiagnostic}s rather than
 * thrown: conditions that are not a single-axis width/height range
 * (`migrate/unsupported-at-rule`), source blocks whose thresholds are not
 * strictly ascending (`migrate/non-ascending-thresholds`, sorted before
 * `defineBoundary`), duplicate breakpoints (`migrate/ambiguous-breakpoint`,
 * collapsed), and — as a last resort — a `defineBoundary` `ValidationError`
 * caught and re-surfaced as a `severity:'error'` diagnostic.
 *
 * @module
 */

import { defineBoundary, type Boundary, type Token, type Theme } from '@liteship/core';
import { hasTag } from '@liteship/error';
import {
  normalizeCssLineEndings,
  blankCssCommentsAndStrings,
  braceDepthDelta,
  skipSegment,
} from '@liteship/compiler/parse';
import type { MigrationResult, MigrationDiagnostic, FromMediaQueriesOptions } from './types.js';
import { makeMigrationDiagnostic, MIGRATE_CODES } from './diagnostics.js';

// ---------------------------------------------------------------------------
// Condition model
// ---------------------------------------------------------------------------

/** The container-query axis a condition measures. */
type Axis = 'width' | 'height';

/** One `@container` block reduced to a single-axis range plus its provenance. */
interface ContainerBlock {
  /** Container name from the prelude (`@container sidebar (...)`), or `''` when anonymous. */
  readonly name: string;
  /** The measured axis. */
  readonly axis: Axis;
  /** Inclusive lower bound (default `0`). Becomes the boundary threshold. */
  readonly lo: number;
  /** Exclusive upper bound (default `Infinity`). Used for overlap/ordering checks. */
  readonly hi: number;
  /** The raw condition text, for diagnostic paths. */
  readonly condition: string;
}

/** A single-axis bound parsed from one parenthesized feature. */
interface AxisBound {
  readonly axis: Axis;
  readonly lo?: number;
  readonly hi?: number;
}

// ---------------------------------------------------------------------------
// Length + feature parsing
// ---------------------------------------------------------------------------

/**
 * Parse a CSS length into a pixel number. Accepts `px`, `rem` (×16), and bare
 * numbers (`0`); every other unit (`em`, `%`, `vw`, …) returns `null`, marking
 * the whole condition unsupported.
 */
function parseLength(raw: string): number | null {
  const m = /^(-?\d*\.?\d+)(px|rem)?$/.exec(raw.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2] === 'rem' ? n * 16 : n;
}

/** Map a feature name to its axis, or `null` when it is not a width/height axis. */
function axisOfFeature(feature: string): Axis | null {
  switch (feature) {
    case 'width':
    case 'inline-size':
      return 'width';
    case 'height':
    case 'block-size':
      return 'height';
    default:
      return null;
  }
}

/**
 * Parse one parenthesized feature's inner text into an {@link AxisBound}, or
 * `null` when it is not reducible to a single-axis width/height bound. Handles:
 *
 * - legacy `min-width`/`max-width`/`min-height`/`max-height` (and `*-inline-size`
 *   / `*-block-size`) `feature: value` form,
 * - the range form `<axis> <op> <value>` (`op` ∈ `>=`,`>`,`<=`,`<`,`=`),
 * - the interval form `<value> <op> <axis> <op> <value>`.
 */
function parseFeature(inner: string): AxisBound | null {
  const text = inner.trim();

  // Legacy `feature: value` (min-width / max-width / exact width / …).
  const colon = text.indexOf(':');
  if (colon !== -1) {
    const feature = text.slice(0, colon).trim().toLowerCase();
    const value = parseLength(text.slice(colon + 1));
    if (value === null) return null;
    if (feature === 'min-width' || feature === 'min-inline-size') return { axis: 'width', lo: value };
    if (feature === 'max-width' || feature === 'max-inline-size') return { axis: 'width', hi: value };
    if (feature === 'min-height' || feature === 'min-block-size') return { axis: 'height', lo: value };
    if (feature === 'max-height' || feature === 'max-block-size') return { axis: 'height', hi: value };
    const exact = axisOfFeature(feature);
    if (exact) return { axis: exact, lo: value, hi: value };
    return null;
  }

  // Interval form: `<value> <op> <axis> <op> <value>` — both operators point up.
  const interval = /^(.+?)\s*(<=|<)\s*([a-z-]+)\s*(<=|<)\s*(.+)$/i.exec(text);
  if (interval) {
    const axis = axisOfFeature(interval[3]!.toLowerCase());
    const lo = parseLength(interval[1]!);
    const hi = parseLength(interval[5]!);
    if (!axis || lo === null || hi === null) return null;
    return { axis, lo, hi };
  }

  // Range form: `<axis> <op> <value>`.
  const range = /^([a-z-]+)\s*(<=|>=|<|>|=)\s*(.+)$/i.exec(text);
  if (range) {
    const axis = axisOfFeature(range[1]!.toLowerCase());
    const value = parseLength(range[3]!);
    if (!axis || value === null) return null;
    switch (range[2]) {
      case '>=':
      case '>':
        return { axis, lo: value };
      case '<=':
      case '<':
        return { axis, hi: value };
      case '=':
        return { axis, lo: value, hi: value };
    }
  }

  return null;
}

/**
 * Split a container condition into its top-level parenthesized groups, returning
 * the inner text of each group plus the lowercased connective text found
 * outside the groups (so `or` / `not` can be rejected). Returns `null` on
 * unbalanced parentheses.
 */
function splitCondition(cond: string): { groups: string[]; connective: string } | null {
  const groups: string[] = [];
  let connective = '';
  let depth = 0;
  let buf = '';
  for (let i = 0; i < cond.length; i++) {
    const ch = cond[i]!;
    if (ch === '(') {
      if (depth === 0) buf = '';
      else buf += ch;
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      if (depth < 0) return null;
      if (depth === 0) groups.push(buf);
      else buf += ch;
      continue;
    }
    if (depth > 0) buf += ch;
    else connective += ch;
  }
  if (depth !== 0) return null;
  return { groups, connective: connective.toLowerCase() };
}

/**
 * Reduce a full container condition to a single-axis {@link ContainerBlock}
 * range, or `null` when it cannot be represented as one (empty, `or`/`not`
 * logic, a non-width/height feature, mixed axes, or an unparseable length).
 * `and`-combined groups intersect: `lo = max`, `hi = min`.
 */
function reduceCondition(cond: string): Omit<ContainerBlock, 'name' | 'condition'> | null {
  const split = splitCondition(cond);
  if (!split || split.groups.length === 0) return null;
  // `or` / `not` cannot be a single contiguous range.
  if (/\b(or|not)\b/.test(split.connective)) return null;

  let axis: Axis | null = null;
  let lo = 0;
  let hi = Infinity;
  for (const group of split.groups) {
    const bound = parseFeature(group);
    if (!bound) return null;
    if (axis === null) axis = bound.axis;
    else if (axis !== bound.axis) return null; // mixed width/height → not single-axis
    if (bound.lo !== undefined) lo = Math.max(lo, bound.lo);
    if (bound.hi !== undefined) hi = Math.min(hi, bound.hi);
  }
  if (axis === null) return null;
  return { axis, lo, hi };
}

// ---------------------------------------------------------------------------
// Native `@container` block reader
// ---------------------------------------------------------------------------

/** Word-boundary guard so `@container-fake` is not read as `@container`. */
const CONTAINER_MARKER = /@container(?![a-zA-Z0-9_-])/gi;
/** A bare container name (the optional identifier before the condition). */
const CONTAINER_NAME = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

/**
 * Read every top-level `@container [<name>] (<condition>) { … }` block from CSS.
 *
 * Markers are located on a comment/string-blanked copy (same offsets) so
 * `@container` text inside a comment or a string value never matches; brace
 * depth is tracked incrementally so only sheet-top-level blocks are read (a
 * nested `@container` refining another is out of scope). Each block's body is
 * skipped — only the prelude condition matters for threshold reconstruction.
 * Named blocks are refused because their container identity cannot be encoded by
 * the current viewport input vocabulary. Returns the reduced anonymous blocks in
 * source order plus a diagnostic for every refused/unreducible prelude.
 */
function readContainerBlocks(css: string): { blocks: ContainerBlock[]; diagnostics: MigrationDiagnostic[] } {
  const normalized = normalizeCssLineEndings(css);
  const blanked = blankCssCommentsAndStrings(normalized);
  const blocks: ContainerBlock[] = [];
  const diagnostics: MigrationDiagnostic[] = [];

  CONTAINER_MARKER.lastIndex = 0;
  let depthFrom = 0;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = CONTAINER_MARKER.exec(blanked)) !== null) {
    depth = braceDepthDelta(blanked, depthFrom, match.index, depth);
    depthFrom = match.index;
    if (depth > 0) continue; // nested @container — not a sheet-top-level block

    const braceIdx = blanked.indexOf('{', CONTAINER_MARKER.lastIndex);
    if (braceIdx === -1) break;

    const prelude = normalized.slice(CONTAINER_MARKER.lastIndex, braceIdx).trim();
    const bodyEnd = skipSegment(normalized, braceIdx); // consume the balanced body

    // Split an optional leading container name off the parenthesized condition.
    const parenAt = prelude.indexOf('(');
    const nameText = (parenAt === -1 ? prelude : prelude.slice(0, parenAt)).trim();
    const condition = parenAt === -1 ? '' : prelude.slice(parenAt);

    const name = '';
    if (nameText !== '') {
      // `not` / `and` / `or` are query keywords, never container names — a
      // leading `not` negates the whole query, which is not a contiguous range.
      const reserved = /^(not|and|or)$/i.test(nameText);
      if (CONTAINER_NAME.test(nameText) && !reserved) {
        // The current runtime input vocabulary has viewport.width/height but no
        // container-qualified signal identity. Converting a named container to
        // viewport input would silently make unrelated containers equivalent,
        // so refuse the complete block until that capability exists end to end.
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unsupportedAtRule,
            `Named @container "${nameText}" cannot be represented: LiteShip has no container-qualified input identity; the block was skipped rather than converted to viewport.${condition.toLowerCase().includes('height') ? 'height' : 'width'}.`,
            { path: [nameText, condition], severity: 'error' },
          ),
        );
        CONTAINER_MARKER.lastIndex = bodyEnd;
        depthFrom = bodyEnd;
        depth = 0;
        continue;
      } else {
        // `not`, a style() query, or other non-name prelude text — unrepresentable.
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unsupportedAtRule,
            `@container prelude "${prelude}" is not a single-axis width/height range and was dropped.`,
            { path: [prelude], severity: 'error' },
          ),
        );
        CONTAINER_MARKER.lastIndex = bodyEnd;
        depthFrom = bodyEnd;
        depth = 0;
        continue;
      }
    }

    const reduced = condition === '' ? null : reduceCondition(condition);
    if (!reduced) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@container condition "${condition || '(empty)'}" is not a single-axis width/height range and was dropped.`,
          { path: name ? [name, condition] : [condition || prelude], severity: 'error' },
        ),
      );
    } else {
      blocks.push({ name, axis: reduced.axis, lo: reduced.lo, hi: reduced.hi, condition });
    }

    CONTAINER_MARKER.lastIndex = bodyEnd;
    depthFrom = bodyEnd;
    depth = 0;
  }

  return { blocks, diagnostics };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/** Group key isolating one anonymous-container axis. */
function groupKey(block: ContainerBlock): string {
  return `${block.name} ${block.axis}`;
}

/**
 * The non-empty threshold/state pair tuple `defineBoundary` accepts. The
 * threshold list is built dynamically (length known only at runtime), so the
 * homogeneous tuple is asserted here; `defineBoundary` re-validates ascending
 * order and state-name uniqueness at the value gate.
 */
type AtPairs = readonly [readonly [number, string], ...(readonly [number, string])[]];

/**
 * Lower native CSS `@container` query blocks into `defineBoundary` definitions.
 *
 * Every top-level anonymous `@container (<condition>) { … }` block is reduced to
 * a single-axis width/height range. Named containers are refused because the
 * current input vocabulary has no container-qualified identity; converting them
 * to `viewport.*` would silently widen their scope. Anonymous blocks sharing an
 * axis range-merge into one boundary whose ascending thresholds are the blocks'
 * lower bounds. State names are synthesized as `<statePrefix>-<threshold>`
 * (default prefix `bp`). Lossy/dropped cases are accumulated as diagnostics; a
 * `defineBoundary` `ValidationError` is caught and surfaced as an `error`
 * diagnostic rather than thrown.
 *
 * @example
 * ```ts
 * const { boundaries } = fromContainerQueries(`
 *   @container (width < 768px) { .card { grid-template-columns: 1fr; } }
 *   @container (width >= 768px) and (width < 1024px) { .card { grid-template-columns: 1fr 1fr; } }
 *   @container (width >= 1024px) { .card { grid-template-columns: 1fr 1fr 1fr; } }
 * `);
 * // boundaries[0].input === 'viewport.width'
 * // boundaries[0].thresholds === [0, 768, 1024]
 * // boundaries[0].states === ['bp-0', 'bp-768', 'bp-1024']
 * ```
 */
export function fromContainerQueries(css: string, options?: FromMediaQueriesOptions): MigrationResult {
  const prefix = options?.statePrefix ?? 'bp';
  const { blocks, diagnostics: readDiagnostics } = readContainerBlocks(css);
  const diagnostics: MigrationDiagnostic[] = [...readDiagnostics];
  const boundaries: Boundary[] = [];

  // Preserve first-seen group order.
  const groups = new Map<string, ContainerBlock[]>();
  for (const block of blocks) {
    const key = groupKey(block);
    const bucket = groups.get(key);
    if (bucket) bucket.push(block);
    else groups.set(key, [block]);
  }

  for (const bucket of groups.values()) {
    const first = bucket[0]!;
    const axis = first.axis;
    const path: (string | number)[] = first.name ? [first.name, axis] : [axis];

    // Source-order lower bounds — diagnose non-ascending / duplicate BEFORE sorting.
    const sourceLos = bucket.map((b) => b.lo);
    let nonAscending = false;
    for (let i = 1; i < sourceLos.length; i++) {
      if (sourceLos[i]! < sourceLos[i - 1]!) nonAscending = true;
    }
    if (nonAscending) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.nonAscendingThresholds,
          `@container thresholds for "${first.name || '(anonymous)'}" (${axis}) were not strictly ascending in source order [${sourceLos.join(', ')}]; sorted before defineBoundary.`,
          { path },
        ),
      );
    }
    // Ambiguous when two blocks share a lower bound OR their ranges overlap
    // (a block's lower bound falls inside a lower-starting block's `[lo, hi)`),
    // since either collapses to indistinct thresholds. Overlap is checked on
    // the lo-sorted ranges so `hi` is the load-bearing signal.
    const byLo = [...bucket].sort((a, b) => a.lo - b.lo);
    let overlap = false;
    for (let i = 1; i < byLo.length; i++) {
      if (byLo[i]!.lo < byLo[i - 1]!.hi && byLo[i]!.lo !== byLo[i - 1]!.lo) overlap = true;
    }
    const duplicateLo = new Set(sourceLos).size < sourceLos.length;
    if (duplicateLo || overlap) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.ambiguousBreakpoint,
          `@container blocks for "${first.name || '(anonymous)'}" (${axis}) declared ${
            duplicateLo ? 'duplicate' : 'overlapping'
          } breakpoints in [${sourceLos.join(', ')}]; collapsed to distinct thresholds.`,
          { path },
        ),
      );
    }

    // A finite upper bound (`hi`) is only represented when some block STARTS at it
    // (its `lo` becomes that threshold). In a complete partition every finite `hi`
    // coincides with the next block's `lo`, so nothing is lost; but a block whose
    // finite `hi` is not the lower bound of any block in this group has its cutoff
    // silently dropped by the lower-bounds-only reconstruction. Surface it rather
    // than lose it (the adapter's no-silent-drift contract).
    const loSet = new Set(sourceLos);
    const uncoveredHis = [
      ...new Set(bucket.filter((b) => Number.isFinite(b.hi) && !loSet.has(b.hi)).map((b) => b.hi)),
    ].sort((a, b) => a - b);
    if (uncoveredHis.length > 0) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@container blocks for "${first.name || '(anonymous)'}" (${axis}) declared finite upper bound(s) [${uncoveredHis.join(
            ', ',
          )}] with no block starting there; the cutoff is not representable as a boundary threshold and was dropped.`,
          { path },
        ),
      );
    }

    // Sort + dedupe the lower bounds into the ascending threshold list.
    const thresholds = [...new Set(sourceLos)].sort((a, b) => a - b);
    const at = thresholds.map((t) => [t, `${prefix}-${Math.round(t)}`] as const);

    try {
      const boundary = defineBoundary({ input: `viewport.${axis}`, at: at as unknown as AtPairs });
      boundaries.push(boundary);
    } catch (error) {
      // The define* constructor is the validation gate. A collision the
      // sort/dedupe pass cannot fix (e.g. sub-pixel thresholds rounding to the
      // same synthesized state name) throws a ValidationError — catch it and
      // surface it as an error diagnostic instead of letting it escape.
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@container boundary for "${first.name || '(anonymous)'}" (${axis}) could not be constructed: ${
            hasTag(error, 'ValidationError') ? error.message : String(error)
          }`,
          { path, severity: 'error', cause: error },
        ),
      );
    }
  }

  const tokens: Token[] = [];
  const themes: Theme[] = [];
  return { boundaries, tokens, themes, diagnostics };
}
