/**
 * CSS Compiler -- `BoundaryDef` to `@container` query rules.
 *
 * Takes a boundary definition and state-specific CSS property maps,
 * generates `@container` query rules using boundary thresholds as
 * breakpoints.
 *
 * @module
 */

import type { Boundary, StateUnion } from '@liteship/core';
import { Diagnostics } from '@liteship/core';
import { inferSyntax } from './css-utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single CSS rule — a selector plus a property map.
 *
 * Emitted inside a {@link CSSContainerRule} by {@link CSSCompiler.compile}.
 */
export interface CSSRule {
  /** CSS selector (e.g. `.card`, `[data-state="open"]`). */
  readonly selector: string;
  /** Flat property map applied inside the selector block. */
  readonly properties: Record<string, string>;
}

/**
 * A nested `@supports` / `@media` group inside a state's container block.
 * Nested groups are preserved recursively (#110 — never silent-drop depth ≥ 2).
 */
export interface CSSAtRuleGroup {
  /** The at-rule prelude exactly as authored. */
  readonly prelude: string;
  /** Declarations authored directly inside the at-rule. */
  readonly bareProps?: Record<string, string>;
  /** Nested selector rules inside the at-rule. */
  readonly rules?: readonly CSSRule[];
  /** Nested conditional at-rule groups. */
  readonly atRuleGroups?: readonly CSSAtRuleGroup[];
}

/**
 * A `@container` at-rule grouping rules that apply at a given container query.
 *
 * Produced per-state by {@link CSSCompiler.compile}; the container `name`
 * is derived from the boundary's `input` identifier.
 */
export interface CSSContainerRule {
  /** Container name (sanitized from the boundary input). */
  readonly name: string;
  /** Condition text like `(width >= 768px)`. */
  readonly query: string;
  /** Rules evaluated inside the container query. */
  readonly rules: readonly CSSRule[];
  /** Nested `@supports` / `@media` groups inside the container block. */
  readonly atRuleGroups?: readonly CSSAtRuleGroup[];
}

/**
 * Structured per-state input for {@link CSSCompiler.compile}: bare
 * properties that style the boundary selector itself, plus nested rules
 * that each carry their own selector (the `@quantize` nested-selector
 * authoring form).
 */
export interface CSSStateBody {
  /** Properties applied to the boundary selector (the `selector` param, default `.liteship-boundary`). */
  readonly bareProps?: Record<string, string>;
  /** Per-selector rules emitted verbatim into the state's `@container` block. */
  readonly rules?: readonly CSSRule[];
  /** Nested `@supports` / `@media` groups inside the state (#110). */
  readonly atRuleGroups?: readonly CSSAtRuleGroup[];
}

/**
 * Per-state input accepted by {@link CSSCompiler.compile}: either a flat
 * property map (the documented bare-props form, back-compat) or a
 * {@link CSSStateBody} carrying nested selector rules.
 */
export type CSSStateInput = Record<string, string> | CSSStateBody;

/**
 * Output of {@link CSSCompiler.compile}.
 *
 * `raw` is the serialized form of `containerRules`, pre-joined so most
 * consumers can inject it directly into a `<style>` element without a
 * separate serialize call.
 */
export interface CSSCompileResult {
  /** Structured container rules, one per non-empty state. */
  readonly containerRules: readonly CSSContainerRule[];
  /** Pre-serialized CSS text ready for injection. */
  readonly raw: string;
  /**
   * The boundary selector this result was compiled against (mirrors the
   * `selector` argument to {@link CSSCompiler.compile}; default
   * `.liteship-boundary`). Carried so {@link CSSCompiler.serialize} re-wraps
   * conditional-group bare declarations with the same selector as `raw`.
   * Optional for back-compat with hand-constructed results, which fall back
   * to the default selector.
   */
  readonly selector?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Default selector bare properties are wrapped in when {@link compile} is
 * called without an explicit `selector`. Single source of truth: both the
 * compile-time wrapping and the {@link serialize} round-trip fall back to it.
 */
const DEFAULT_BOUNDARY_SELECTOR = '.liteship-boundary';

/**
 * Serialize a `Record<string, string>` of CSS properties into a declaration block.
 */
function serializeDeclarations(props: Record<string, string>): string {
  const entries = Object.entries(props);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `  ${k}: ${v};`).join('\n');
}

/**
 * Serialize a single CSSRule into its textual form.
 */
function serializeRule(rule: CSSRule): string {
  const decls = serializeDeclarations(rule.properties);
  if (!decls) return `${rule.selector} {}`;
  return `${rule.selector} {\n${decls}\n}`;
}

function serializeAtRuleGroup(group: CSSAtRuleGroup, selector: string): string {
  const inner: string[] = [];
  // Bare declarations whose only ancestor is a conditional group
  // (`@supports` / `@media` / `@container`) are INVALID CSS — the CSS parser
  // discards a declaration that is not inside a style rule. Wrap them in the
  // active boundary selector, mirroring how state-level bareProps are wrapped
  // in `compile()`, so the declarations actually take effect.
  if (group.bareProps && Object.keys(group.bareProps).length > 0) {
    inner.push(serializeRule({ selector, properties: group.bareProps }));
  }
  for (const rule of group.rules ?? []) {
    if (Object.keys(rule.properties).length > 0) {
      inner.push(serializeRule(rule));
    }
  }
  for (const nested of group.atRuleGroups ?? []) {
    inner.push(serializeAtRuleGroup(nested, selector));
  }
  if (inner.length === 0) return `${group.prelude} {}`;
  return `${group.prelude} {\n${inner.join('\n')}\n}`;
}

/**
 * The container-query size axis a boundary input measures: inputs whose
 * final dot-segment is `height` (`viewport.height`, bare `height`)
 * compile to `(height ...)` conditions; every other input keeps the
 * width axis. Height containers must declare `container-type: size` —
 * `inline-size` containment leaves block-axis queries unevaluable.
 */
function queryAxisOf(input: string): 'width' | 'height' {
  return input === 'height' || input.endsWith('.height') ? 'height' : 'width';
}

/**
 * Build the `@container` query string for a given state index based on
 * the boundary thresholds array and the boundary's size axis.
 *
 * For N states and N-1 thresholds (first threshold is always 0 and
 * is implicitly the lower bound):
 *   - First state:  `(<axis> < thresholds[1])`
 *   - Middle state: `(<axis> >= thresholds[i]) and (<axis> < thresholds[i+1])`
 *   - Last state:   `(<axis> >= thresholds[last])`
 *
 * The thresholds array from BoundaryDef has length = `states.length`.
 * `thresholds[0]` is the start of the first state, `thresholds[1]` is
 * the boundary between state 0 and state 1, etc.
 */
function buildContainerQuery(
  thresholds: readonly number[],
  stateIndex: number,
  stateCount: number,
  axis: 'width' | 'height',
): string {
  if (stateCount === 1) return `(${axis} >= 0px)`;

  // The threshold at index `i` is the lower bound for state `i`.
  // State 0: axis < thresholds[1]
  // State i (middle): axis >= thresholds[i] and axis < thresholds[i+1]
  // State last: axis >= thresholds[last]

  if (stateIndex === 0) {
    const upper = thresholds[1];
    return `(${axis} < ${upper}px)`;
  }

  if (stateIndex === stateCount - 1) {
    const lower = thresholds[stateIndex];
    return `(${axis} >= ${lower}px)`;
  }

  const lower = thresholds[stateIndex];
  const upper = thresholds[stateIndex + 1];
  return `(${axis} >= ${lower}px) and (${axis} < ${upper}px)`;
}

// ---------------------------------------------------------------------------
// CSSCompiler
// ---------------------------------------------------------------------------

/**
 * Distinguish the structured {@link CSSStateBody} form from a flat
 * property map. A flat map only ever carries string values, so an
 * object-valued `bareProps`, array-valued `rules`, or array-valued
 * `atRuleGroups` key is unambiguous. A body carrying ONLY `atRuleGroups`
 * (no bareProps, no rules) is still structured — omitting that arm misreads
 * it as a flat map and silently drops the conditional groups.
 */
function isStateBody(input: CSSStateInput): input is CSSStateBody {
  const candidate = input as CSSStateBody;
  return (
    (candidate.bareProps !== undefined && typeof candidate.bareProps === 'object') ||
    Array.isArray(candidate.rules) ||
    Array.isArray(candidate.atRuleGroups)
  );
}

/**
 * Compile a boundary definition and per-state CSS inputs into
 * `@container` query rules.
 *
 * Each state accepts either a flat property map (applied to `selector`)
 * or a {@link CSSStateBody} whose nested rules each become one
 * {@link CSSRule} with their own selector inside the state's
 * `@container` block.
 *
 * @example
 * ```ts
 * import { Boundary } from '@liteship/core';
 * import { CSSCompiler } from '@liteship/compiler';
 *
 * const boundary = Boundary.make({
 *   input: 'width',
 *   at: [[0, 'sm'], [768, 'lg']],
 * });
 * const result = CSSCompiler.compile(boundary, {
 *   sm: { 'font-size': '14px' },
 *   lg: {
 *     bareProps: { 'font-size': '18px' },
 *     rules: [{ selector: '.grid', properties: { gap: '2rem' } }],
 *   },
 * }, '.card');
 * console.log(result.raw);
 * // @container width (width < 768px) { .card { font-size: 14px; } }
 * // @container width (width >= 768px) { .card { font-size: 18px; } .grid { gap: 2rem; } }
 * ```
 *
 * @param boundary - The boundary definition with states and thresholds
 * @param states   - Per-state CSS inputs (flat property maps or structured bodies)
 * @param selector - Optional CSS selector for bare properties (defaults to `.liteship-boundary`)
 * @returns A {@link CSSCompileResult} with structured rules and raw CSS text
 */
function compile<B extends Boundary>(
  boundary: B,
  states: { readonly [S in StateUnion<B> & string]?: CSSStateInput },
  selector?: string,
): CSSCompileResult {
  const sel = selector ?? DEFAULT_BOUNDARY_SELECTOR;
  const containerName = boundary.input.replace(/[^a-zA-Z0-9_-]/g, '-');
  const axis = queryAxisOf(boundary.input);
  // The state map is keyed by StateUnion<B> & string literals; treat the runtime array
  // as that keyed shape so indexing with boundary.states[i] is exact.
  const stateNames: ReadonlyArray<StateUnion<B> & string> = boundary.states as ReadonlyArray<StateUnion<B> & string>;
  const thresholds = boundary.thresholds as readonly number[];

  const containerRules: CSSContainerRule[] = [];

  for (let i = 0; i < stateNames.length; i++) {
    const stateName = stateNames[i]!;
    const entry: CSSStateInput | undefined = states[stateName];
    if (!entry) continue;

    let bareProps: Record<string, string>;
    let nestedRules: readonly CSSRule[];
    let atRuleGroups: readonly CSSAtRuleGroup[];
    if (isStateBody(entry)) {
      bareProps = entry.bareProps ?? {};
      nestedRules = entry.rules ?? [];
      atRuleGroups = entry.atRuleGroups ?? [];
    } else {
      bareProps = entry;
      nestedRules = [];
      atRuleGroups = [];
    }

    const rules: CSSRule[] = [];
    if (Object.keys(bareProps).length > 0) {
      rules.push({ selector: sel, properties: bareProps });
    }
    for (const rule of nestedRules) {
      if (Object.keys(rule.properties).length > 0) {
        rules.push(rule);
      }
    }
    if (rules.length === 0 && atRuleGroups.length === 0) continue;

    const query = buildContainerQuery(thresholds, i, stateNames.length, axis);

    containerRules.push({
      name: containerName,
      query,
      rules,
      ...(atRuleGroups.length > 0 ? { atRuleGroups } : {}),
    });
  }

  // Compilation iterates boundary.states, so a supplied key that matches no
  // state is never read — via dispatch the states record is untyped, so a
  // case typo silently emits nothing. Warn for every unmatched key.
  const knownStates = new Set<string>(stateNames);
  for (const supplied of Object.keys(states)) {
    if (knownStates.has(supplied)) continue;
    const match = stateNames.find((s) => s.toLowerCase() === supplied.toLowerCase());
    Diagnostics.warn({
      source: 'liteship/compiler.css',
      code: 'unknown-state-key',
      message: `State "${supplied}" is not one of boundary "${boundary.input}" states [${stateNames.join(', ')}]; its CSS was skipped.${match ? ` Did you mean "${match}"?` : ''}`,
    });
  }

  const raw = serializeContainerRules(containerRules, sel);
  return { containerRules, raw, selector: sel };
}

/**
 * Serialize a {@link CSSCompileResult} back to valid CSS text.
 *
 * @example
 * ```ts
 * import { CSSCompiler } from '@liteship/compiler';
 *
 * const result = CSSCompiler.compile(boundary, states);
 * const css = CSSCompiler.serialize(result);
 * document.head.appendChild(
 *   Object.assign(document.createElement('style'), { textContent: css }),
 * );
 * ```
 *
 * @param result - The compile result to serialize
 * @returns A string of valid CSS text
 */
function serialize(result: CSSCompileResult): string {
  return serializeContainerRules(result.containerRules, result.selector ?? DEFAULT_BOUNDARY_SELECTOR);
}

function serializeContainerRules(containerRules: readonly CSSContainerRule[], selector: string): string {
  const blocks: string[] = [];

  for (const cr of containerRules) {
    const innerRules = cr.rules.map(serializeRule).join('\n');
    const innerAtRules = (cr.atRuleGroups ?? []).map((group) => serializeAtRuleGroup(group, selector)).join('\n');
    const inner = [innerRules, innerAtRules].filter((s) => s.length > 0).join('\n');
    blocks.push(`@container ${cr.name} ${cr.query} {\n${inner}\n}`);
  }

  return blocks.join('\n\n');
}

// ---------------------------------------------------------------------------
// @property Registration
// ---------------------------------------------------------------------------

// COLOR_RE, NUMBER_RE, and inferSyntax are imported from ./css-utils.js

function initialValueForSyntax(syntax: string): string {
  switch (syntax) {
    case '<color>':
      return 'transparent';
    case '<length>':
      return '0px';
    case '<time>':
      return '0s';
    case '<angle>':
      return '0deg';
    case '<percentage>':
      return '0%';
    case '<frequency>':
      return '0Hz';
    default:
      return '0';
  }
}

/**
 * Scan all CSS values across all states and emit `@property` declarations
 * for properties whose values parse as numbers or colors. This enables
 * GPU-interpolated transitions on custom properties.
 *
 * @example
 * ```ts
 * import { CSSCompiler } from '@liteship/compiler';
 *
 * const states = {
 *   sm: { '--card-bg': '#ffffff', '--card-radius': '4px' },
 *   lg: { '--card-bg': '#f0f0f0', '--card-radius': '8px' },
 * };
 * const registrations = CSSCompiler.generatePropertyRegistrations(states);
 * // @property --card-bg { syntax: "<color>"; inherits: true; initial-value: transparent; }
 * // @property --card-radius { syntax: "<length>"; inherits: true; initial-value: 0px; }
 * ```
 *
 * @param states - Per-state CSS property maps to scan for custom properties
 * @returns A string of `@property` declarations, or empty string if none found
 */
export function generatePropertyRegistrations(
  states: Record<string, Record<string, string>>,
  initialValues?: Readonly<Record<string, string>>,
): string {
  const propSyntax = new Map<string, string>();

  for (const stateProps of Object.values(states)) {
    for (const [prop, value] of Object.entries(stateProps)) {
      if (!prop.startsWith('--')) continue;
      if (propSyntax.has(prop)) continue;
      const syntax = inferSyntax(value);
      if (syntax) propSyntax.set(prop, syntax);
    }
  }

  if (propSyntax.size === 0) return '';

  const blocks: string[] = [];
  for (const [prop, syntax] of propSyntax) {
    const initial = initialValues?.[prop] ?? initialValueForSyntax(syntax);
    blocks.push(`@property ${prop} {\n  syntax: "${syntax}";\n  inherits: true;\n  initial-value: ${initial};\n}`);
  }
  return blocks.join('\n\n');
}

/**
 * CSS compiler namespace.
 *
 * Compiles boundary definitions into `@container` query rules, serializes
 * compile results to CSS text, and generates `@property` registrations for
 * custom properties that enable GPU-interpolated transitions.
 *
 * @example
 * ```ts
 * import { Boundary } from '@liteship/core';
 * import { CSSCompiler } from '@liteship/compiler';
 *
 * const boundary = Boundary.make({
 *   input: 'width',
 *   at: [[0, 'sm'], [768, 'lg']],
 * });
 * const result = CSSCompiler.compile(boundary, {
 *   sm: { '--gap': '8px' }, lg: { '--gap': '24px' },
 * });
 * const css = CSSCompiler.serialize(result);
 * const props = CSSCompiler.generatePropertyRegistrations({
 *   sm: { '--gap': '8px' }, lg: { '--gap': '24px' },
 * });
 * ```
 */
export const CSSCompiler = { compile, serialize, generatePropertyRegistrations } as const;
