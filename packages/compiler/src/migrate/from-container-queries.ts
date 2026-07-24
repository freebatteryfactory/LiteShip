/**
 * `migrate/from-container-queries` — lower native CSS `@container` query blocks
 * into ordinary {@link defineBoundary} definitions.
 *
 * A stylesheet's `@container [name] (<condition>) { … }` blocks each declare
 * a single-axis width/height range. This adapter reads every top-level block,
 * requires the caller to map each source container identity to an explicit
 * LiteShip input, and accepts only faithful inclusive-min conditions on one
 * axis. Finite upper bounds, exact/strict comparisons, mixed axes, and nested
 * queries are refused because a threshold-only boundary cannot preserve them.
 * The ascending lower bounds become one `defineBoundary` whose
 * `input` is the caller's resolved custom/host input. It never substitutes
 * `viewport.<axis>` because a query container and the viewport are different facts.
 *
 * Refused cases are surfaced as error {@link MigrationDiagnostic}s and produce
 * no definition. Nothing is sorted, collapsed, or approximated after parsing.
 *
 * @module
 */

import { defineBoundary, type Boundary, type Token, type Theme } from '@liteship/core';
import { hasTag } from '@liteship/error';
import {
  normalizeCssLineEndings,
  blankCssCommentsAndStrings,
  cssCommentParsingView,
  braceDepthDelta,
  skipSegment,
} from '@liteship/compiler/parse';
import type { MigrationResult, MigrationDiagnostic, FromContainerQueriesOptions } from './types.js';
import { makeMigrationDiagnostic, MIGRATE_CODES } from './diagnostics.js';
import { parseQueryLength } from './query-length.js';
import type { QueryLengthUnit } from './types.js';

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
  /** Authored threshold unit; relative units stay relative. */
  readonly unit: QueryLengthUnit;
  /** The raw condition text, for diagnostic paths. */
  readonly condition: string;
}

/** A single-axis bound parsed from one parenthesized feature. */
interface AxisBound {
  readonly axis: Axis;
  readonly lo: number;
  readonly unit: QueryLengthUnit;
}

// ---------------------------------------------------------------------------
// Length + feature parsing
// ---------------------------------------------------------------------------

/**
 * Map a feature name to its axis, or `null` when it is not a width/height axis.
 */
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
 * - legacy `min-width`/`min-height` (and `min-inline-size` / `min-block-size`),
 * - the inclusive range form `<axis> >= <value>`.
 *
 * Every finite-upper, strict, exact, interval, or unsupported-unit form returns
 * `null`; callers refuse the complete source block rather than approximating it.
 */
function parseFeature(inner: string): AxisBound | null {
  const text = inner.trim();

  // Legacy `feature: value` (min-width / max-width / exact width / …).
  const colon = text.indexOf(':');
  if (colon !== -1) {
    const feature = text.slice(0, colon).trim().toLowerCase();
    const length = parseQueryLength(text.slice(colon + 1));
    if (length === null) return null;
    if (feature === 'min-width' || feature === 'min-inline-size')
      return { axis: 'width', lo: length.value, unit: length.unit };
    if (feature === 'min-height' || feature === 'min-block-size')
      return { axis: 'height', lo: length.value, unit: length.unit };
    // Exact size queries are point predicates; a threshold state persists above
    // its lower bound and cannot represent them.
    const exact = axisOfFeature(feature);
    if (exact) return null;
    return null;
  }

  // Range form: `<axis> >= <value>` only.
  const range = /^([a-z-]+)\s*(>=)\s*(.+)$/i.exec(text);
  if (range) {
    const axis = axisOfFeature(range[1]!.toLowerCase());
    const length = parseQueryLength(range[3]!);
    if (!axis || length === null) return null;
    return { axis, lo: length.value, unit: length.unit };
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
 * logic/connective text, a non-width/height feature, mixed axes, or an
 * unparseable length). `and`-combined inclusive lower bounds intersect by
 * retaining their maximum lower bound.
 */
function reduceCondition(cond: string): Omit<ContainerBlock, 'name' | 'condition'> | null {
  const split = splitCondition(cond);
  if (!split || split.groups.length === 0) return null;
  const connectives = split.connective.trim() === '' ? [] : split.connective.trim().split(/\s+/);
  if (connectives.length !== split.groups.length - 1 || connectives.some((word) => word !== 'and')) return null;

  let axis: Axis | null = null;
  let unit: QueryLengthUnit | null = null;
  let lo = 0;
  for (const group of split.groups) {
    const bound = parseFeature(group);
    if (!bound) return null;
    if (axis === null) axis = bound.axis;
    else if (axis !== bound.axis) return null; // mixed width/height → not single-axis
    if (bound.unit !== 'zero') {
      if (unit === null) unit = bound.unit;
      else if (unit !== bound.unit) return null;
    }
    lo = Math.max(lo, bound.lo);
  }
  if (axis === null) return null;
  return { axis, lo, unit: unit ?? 'zero' };
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
 * Container names are retained as identity for the caller's resolver. Returns the reduced blocks in
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
    if (depth > 0) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          "A nested @container rule is outside the adapter's top-level safe subset and was refused.",
          { path: ['@container', 'nested'], severity: 'error' },
        ),
      );
      continue;
    }

    const braceIdx = blanked.indexOf('{', CONTAINER_MARKER.lastIndex);
    if (braceIdx === -1) break;

    const preludeView = cssCommentParsingView(normalized.slice(CONTAINER_MARKER.lastIndex, braceIdx));
    const rawPrelude = preludeView.raw.trim();
    const parsedPrelude = preludeView.parsed;
    const bodyEnd = skipSegment(normalized, braceIdx); // consume the balanced body
    const bodyContainsNestedContainer = /@container(?![a-zA-Z0-9_-])/i.test(blanked.slice(braceIdx + 1, bodyEnd));

    // Split an optional leading container name off the parenthesized condition.
    const parenAt = parsedPrelude.indexOf('(');
    const nameText = (parenAt === -1 ? parsedPrelude : parsedPrelude.slice(0, parenAt)).trim();
    const parsedCondition = parenAt === -1 ? '' : parsedPrelude.slice(parenAt);
    const rawCondition = parenAt === -1 ? '' : preludeView.raw.slice(parenAt).trim();

    let name = '';
    if (nameText !== '') {
      // `not` / `and` / `or` are query keywords, never container names — a
      // leading `not` negates the whole query, which is not a contiguous range.
      const reserved = /^(not|and|or)$/i.test(nameText);
      if (CONTAINER_NAME.test(nameText) && !reserved) {
        name = nameText;
      } else {
        // `not`, a style() query, or other non-name prelude text — unrepresentable.
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unsupportedAtRule,
            `@container prelude "${rawPrelude}" is not a single-axis width/height range and was dropped.`,
            { path: [rawPrelude], severity: 'error' },
          ),
        );
        CONTAINER_MARKER.lastIndex = bodyEnd;
        depthFrom = bodyEnd;
        depth = 0;
        continue;
      }
    }

    if (bodyContainsNestedContainer) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@container "${name || '(anonymous)'}" contains a nested @container rule; nested query semantics were refused atomically.`,
          { path: name ? [name, rawCondition] : [rawCondition || rawPrelude], severity: 'error' },
        ),
      );
      CONTAINER_MARKER.lastIndex = bodyEnd;
      depthFrom = bodyEnd;
      depth = 0;
      continue;
    }

    const reduced = parsedCondition.trim() === '' ? null : reduceCondition(parsedCondition);
    if (!reduced) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@container condition "${rawCondition || '(empty)'}" is not a single-axis width/height range and was dropped.`,
          { path: name ? [name, rawCondition] : [rawCondition || rawPrelude], severity: 'error' },
        ),
      );
    } else {
      blocks.push({ name, axis: reduced.axis, lo: reduced.lo, unit: reduced.unit, condition: rawCondition });
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

/** Group key isolating one source-container identity and axis. */
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
 * Every top-level `@container [name] (<condition>) { … }` block is reduced to
 * a single-axis width/height range. The caller must preserve container identity
 * by resolving each name/axis pair onto an explicit LiteShip input. Blocks sharing an
 * axis range-merge into one boundary whose ascending thresholds are the blocks'
 * lower bounds. State names are synthesized as `<statePrefix>-<threshold>`
 * (default prefix `bp`). Lossy/dropped cases are accumulated as diagnostics; a
 * `defineBoundary` `ValidationError` is caught and surfaced as an `error`
 * diagnostic rather than thrown.
 *
 * @example
 * ```ts
 * const { boundaries } = fromContainerQueries(`
 *   @container card (min-width: 0) { .card { grid-template-columns: 1fr; } }
 *   @container card (min-width: 768px) { .card { grid-template-columns: 1fr 1fr; } }
 *   @container card (min-width: 1024px) { .card { grid-template-columns: 1fr 1fr 1fr; } }
 * `, {
 *   resolveInput: ({ name, axis }) => `custom:container.${name}.${axis}`,
 * });
 * // boundaries[0].input === 'custom:container.card.width'
 * // boundaries[0].thresholds === [0, 768, 1024]
 * // boundaries[0].states === ['bp-0', 'bp-768', 'bp-1024']
 * ```
 */
export function fromContainerQueries(css: string, options?: FromContainerQueriesOptions): MigrationResult {
  const prefix = options?.statePrefix ?? 'bp';
  const { blocks, diagnostics: readDiagnostics } = readContainerBlocks(css);
  const diagnostics: MigrationDiagnostic[] = [...readDiagnostics];
  const boundaries: Boundary[] = [];

  // Preserve first-seen source-container/axis order. Unit compatibility is a
  // property of the complete state chain, so choose one effective unit before
  // asking the host for its one matching signal.
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
    const nonzeroUnits = new Set(bucket.flatMap((block) => (block.unit === 'zero' ? [] : [block.unit])));
    if (nonzeroUnits.size > 1) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@container blocks for "${first.name || '(anonymous)'}" (${axis}) mix incompatible authored units (${[...nonzeroUnits].join(', ')}); the complete state chain was refused before input resolution.`,
          { path, severity: 'error' },
        ),
      );
      continue;
    }
    const effectiveUnit = nonzeroUnits.values().next().value ?? 'zero';
    const input = options?.resolveInput?.({
      ...(first.name ? { name: first.name } : {}),
      axis,
      unit: effectiveUnit,
    });
    if (!input) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@container "${first.name || '(anonymous)'}" (${axis}, ${effectiveUnit}) has no explicit LiteShip input mapping; the complete state chain was refused rather than measured against the viewport.`,
          { path, severity: 'error' },
        ),
      );
      continue;
    }

    // Only a strictly ascending, collision-free source chain is faithful. CSS
    // cascade order is observable, so sorting or collapsing would change it.
    const sourceLos = bucket.map((block) => block.lo);
    if (new Set(sourceLos).size !== sourceLos.length) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.ambiguousBreakpoint,
          `@container blocks for "${first.name || '(anonymous)'}" (${axis}) declare duplicate inclusive thresholds [${sourceLos.join(', ')}]; the group was refused.`,
          { path, severity: 'error' },
        ),
      );
      continue;
    }
    const nonAscending = sourceLos.some((value, index) => index > 0 && value < sourceLos[index - 1]!);
    if (nonAscending) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.nonAscendingThresholds,
          `@container thresholds for "${first.name || '(anonymous)'}" (${axis}) are not strictly ascending in source order [${sourceLos.join(', ')}]; the group was refused rather than reordered.`,
          { path, severity: 'error' },
        ),
      );
      continue;
    }

    const stateNames = sourceLos.map((value) => `${prefix}-${Math.round(value)}`);
    if (new Set(stateNames).size !== stateNames.length) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.ambiguousBreakpoint,
          `@container thresholds for "${first.name || '(anonymous)'}" (${axis}) synthesize colliding state names [${stateNames.join(', ')}]; the group was refused.`,
          { path, severity: 'error' },
        ),
      );
      continue;
    }

    // A lower-bound query is false below its first positive threshold. Boundary
    // evaluation, however, selects its first state below the first threshold.
    // Make that region explicit instead of turning the first active query into
    // the default state. A source threshold at zero already covers the complete
    // non-negative size domain and therefore needs no synthetic state.
    const activeAt = sourceLos.map((t, index) => [t, stateNames[index]!] as const);
    const at = sourceLos[0]! > 0 ? ([[0, `${prefix}-inactive`], ...activeAt] as const) : activeAt;

    try {
      const boundary = defineBoundary({ input, at: at as unknown as AtPairs });
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
