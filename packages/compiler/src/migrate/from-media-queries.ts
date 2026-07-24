/**
 * `migrate/from-media-queries` — lower a foreign CSS `@media` stylesheet into
 * ordinary `@liteship/core` primitives.
 *
 * The inclusive-min dimensional media features (`min-width` and `min-height`)
 * are the ones with a first-class LiteShip signal: they
 * fold into a `defineBoundary` on `viewport.width` / `viewport.height`. This is
 * the exact inverse of the compiler's own emit convention (`css.ts`
 * `buildContainerQuery`: `(width < T1)`, `(width >= Ti) and (width < Ti+1)`,
 * `(width >= Tlast)`; `queryAxisOf`: `.height` → height else width) — a
 * `min-width: T` block applies at `width >= T`, so `T` is a boundary threshold.
 * Finite-upper and exact predicates are refused because an unbounded threshold
 * state cannot represent them faithfully.
 *
 * The discrete features are routed structurally:
 *  - `prefers-color-scheme: light|dark` → a `defineTheme` whose `light`/`dark`
 *    variants collect the custom-property overrides inside each block (with the
 *    top-level `:root` declarations as the shared light defaults).
 *  - every other discrete feature (`prefers-reduced-motion`, `prefers-contrast`,
 *    `forced-colors`, `prefers-reduced-transparency`, and the long tail) has no
 *    numeric signal to lower onto, so it is kept verbatim as a two-state boundary
 *    on a `media:<query>` input (recognized features — see `@liteship/detect`) or
 *    a `custom:<id>` input (everything else), and flagged `unmappable-media-feature`.
 *
 * The `define*` constructors ARE the validation gate: the adapter parses
 * optimistically and lets a pathological value (a non-finite threshold, say)
 * reach the constructor, catching the thrown `ValidationError` and surfacing it
 * as a `severity:'error'` diagnostic rather than letting it escape.
 *
 * @module
 */

import { defineBoundary, defineTheme, sourceToInput, VIEWPORT } from '@liteship/core';
import type { Boundary, Token, Theme } from '@liteship/core';
import { hasTag } from '@liteship/error';
import { blankCssCommentsAndStrings, cssCommentParsingView } from '@liteship/compiler/parse';
import {
  serializeCSSDeclarationValue,
  splitCSSSelectorList,
  winsCSSCascade,
  type CSSDeclarationValue,
} from '../parse/css-cascade.js';
import { parseFlatDeclarationValues } from '../parse/css-scan.js';
import type { MigrationDiagnostic, MigrationResult, FromMediaQueriesOptions } from './types.js';
import { makeMigrationDiagnostic, MIGRATE_CODES } from './diagnostics.js';
import { parseQueryLength } from './query-length.js';

// ---------------------------------------------------------------------------
// Feature vocabulary
// ---------------------------------------------------------------------------

/**
 * Discrete media features `@liteship/detect` already probes at runtime
 * (`detect.ts`). A block gated by one of these is kept as a first-party
 * `media:<query>` boundary input; anything outside this set falls back to an
 * opaque `custom:<id>` input. `prefers-color-scheme` is handled separately (it
 * lowers to a theme, not a boundary).
 */
const RECOGNIZED_DISCRETE_FEATURES: ReadonlySet<string> = new Set([
  'prefers-reduced-motion',
  'prefers-contrast',
  'forced-colors',
  'prefers-reduced-transparency',
]);

/**
 * Discrete media features whose valued alternatives are mutually exclusive for
 * one evaluation. A conjunction that requires two distinct normalized values
 * of one of these features is unsatisfiable and must not create an always-live
 * LiteShip definition.
 *
 * Deliberately excludes implication-shaped features such as `color-gamut` and
 * multi-device summaries such as `any-pointer`, where multiple values may match
 * at once.
 */
const MUTUALLY_EXCLUSIVE_DISCRETE_FEATURES: ReadonlySet<string> = new Set([
  'prefers-color-scheme',
  'orientation',
  'prefers-reduced-motion',
  'prefers-reduced-data',
  'prefers-reduced-transparency',
  'prefers-contrast',
  'forced-colors',
  'inverted-colors',
  'pointer',
  'hover',
  'update',
  'overflow-block',
  'overflow-inline',
  'scripting',
  'display-mode',
]);

/** `viewport.width` breakpoint features and their axis. */
const WIDTH_FEATURES: ReadonlySet<string> = new Set(['min-width', 'max-width', 'width']);
const HEIGHT_FEATURES: ReadonlySet<string> = new Set(['min-height', 'max-height', 'height']);
/** Standard or custom media-feature identifier accepted by this parser. */
const MEDIA_FEATURE_NAME = /^(?:[a-z][a-z0-9-]*|--[a-z0-9-]+)$/;

// ---------------------------------------------------------------------------
// Low-level parsing helpers (NEW: no importable inverse of the private emit fns)
// ---------------------------------------------------------------------------

/** One `(feature: value)` / `(feature)` group parsed out of a media prelude. */
interface ParsedFeature {
  readonly feature: string;
  readonly value: string | null;
}

/**
 * Extract every top-level parenthesized feature group from a media prelude.
 * `screen and (min-width: 768px)` → `[{feature:'min-width', value:'768px'}]`;
 * `(monochrome)` → `[{feature:'monochrome', value:null}]`. Media types
 * (`screen`, `print`), combinators (`and`, `or`, `not`, `only`, `,`) carry no
 * parentheses and are ignored — a prelude that yields zero groups is a bare
 * media-type query with no boundary lowering.
 */
function parseFeatures(prelude: string): ParsedFeature[] {
  const feats: ParsedFeature[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < prelude.length; i++) {
    const c = prelude[i]!;
    if (c === '(') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (c === ')') {
      depth--;
      if (depth === 0 && start !== -1) {
        const inner = prelude.slice(start, i);
        const colon = inner.indexOf(':');
        if (colon === -1) {
          feats.push({ feature: inner.trim().toLowerCase(), value: null });
        } else {
          feats.push({ feature: inner.slice(0, colon).trim().toLowerCase(), value: inner.slice(colon + 1).trim() });
        }
        start = -1;
      }
    }
  }
  return feats;
}

/**
 * Validate the supported positive conjunction grammar structurally. The
 * prelude is an optional neutral `all` media type followed by
 * `feature (and feature)*`; adjacent groups, stray/duplicated connectives,
 * foreign text, and unbalanced groups are refused atomically.
 */
function hasValidPositiveFeatureSequence(prelude: string): boolean {
  const source = prelude.trim();
  let offset = 0;
  const neutral = /^(?:(?:only\s+)?all\s+and)\b/i.exec(source);
  if (neutral) offset = neutral[0].length;

  let groups = 0;
  while (offset < source.length) {
    while (/\s/.test(source[offset] ?? '')) offset++;
    if (source[offset] !== '(') return false;

    let depth = 0;
    let closed = false;
    for (; offset < source.length; offset++) {
      const char = source[offset]!;
      if (char === '(') depth++;
      else if (char === ')') {
        depth--;
        if (depth < 0) return false;
        if (depth === 0) {
          offset++;
          closed = true;
          groups++;
          break;
        }
      }
    }
    if (!closed || depth !== 0) return false;
    while (/\s/.test(source[offset] ?? '')) offset++;
    if (offset === source.length) return groups > 0;

    const connective = /^and\b/i.exec(source.slice(offset));
    if (!connective) return false;
    offset += connective[0].length;
    const beforeNext = offset;
    while (/\s/.test(source[offset] ?? '')) offset++;
    if (offset === beforeNext || source[offset] !== '(') return false;
  }
  return false;
}

/** Index of the `}` that closes the block whose `{` is at `openIdx` (on the blanked copy). */
function matchBrace(blanked: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < blanked.length; i++) {
    const ch = blanked[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return blanked.length;
}

/**
 * Whether a selector list targets `:root` — one of its comma-separated
 * components, with block braces stripped, is exactly `:root`. A custom property
 * is a theme-wide token ONLY when declared on `:root`; a scoped selector's custom
 * property stays scoped, so harvesting it would silently widen its scope to the
 * whole migrated theme.
 */
function selectorTargetsRoot(selector: string): boolean {
  return splitCSSSelectorList(selector).some((part) => part.toLowerCase() === ':root');
}

interface RootCustomPropertyRule {
  readonly props: Readonly<Record<string, CSSDeclarationValue>>;
}

interface RootCustomPropertyCollection {
  readonly rules: readonly RootCustomPropertyRule[];
  readonly unsupportedSelectors: readonly string[];
}

/**
 * Collect the `:root` custom-property declarations (`--name: value`) inside a
 * source range, walking each nested rule block with the shared
 * declaration scanner. Names are returned WITHOUT the leading `--`. Only
 * `:root` blocks contribute. A scoped or mixed selector carrying custom
 * properties is returned as unsupported so the caller can refuse the complete
 * media block before any theme accumulator changes. Used to read the
 * `:root { … }` overrides inside a `prefers-color-scheme` media block.
 */
function collectRootCustomPropertyRules(css: string, start: number, end: number): RootCustomPropertyCollection {
  const out: RootCustomPropertyRule[] = [];
  const unsupportedSelectors: string[] = [];
  const structural = blankCssCommentsAndStrings(css);
  let i = start;
  let selStart = start;
  while (i < end) {
    if (structural[i] === '{') {
      const selector = css.slice(selStart, i);
      const { props, end: blockEnd } = parseFlatDeclarationValues(css, i + 1);
      const customProperties = Object.entries(props).filter(([name]) => name.startsWith('--'));
      const selectorMembers = splitCSSSelectorList(selector);
      const targetsOnlyRoot =
        selectorMembers.length > 0 && selectorMembers.every((part) => part.toLowerCase() === ':root');
      if (customProperties.length > 0 && targetsOnlyRoot) {
        out.push({
          props: Object.fromEntries(customProperties.map(([name, value]) => [name.slice(2), value])),
        });
      } else if (customProperties.length > 0) {
        unsupportedSelectors.push(selector.trim() || '(unknown selector)');
      }
      i = blockEnd > i ? blockEnd : i + 1;
      selStart = i;
    } else {
      i++;
    }
  }
  return { rules: out, unsupportedSelectors };
}

/**
 * The prelude text OUTSIDE every parenthesized feature group, lowercased — the
 * media combinators. `not` / `or` / a comma query-list separator change the
 * query's boolean meaning in a way a flat positive feature list cannot preserve
 * (`not (prefers-color-scheme: dark)` is the NEGATION), so their presence marks
 * the whole `@media` block unrepresentable.
 */
function preludeConnective(prelude: string): string {
  let out = '';
  let depth = 0;
  for (let i = 0; i < prelude.length; i++) {
    const c = prelude[i]!;
    if (c === '(') depth++;
    else if (c === ')') {
      if (depth > 0) depth--;
    } else if (depth === 0) {
      out += c;
    }
  }
  return out.toLowerCase();
}

/**
 * Explicit media types outside parenthesized feature groups. LiteShip's
 * viewport inputs carry feature values, not the carrier/media-type predicate,
 * so `print and (...)` / `screen and (...)` cannot be reproduced faithfully.
 * `all` is the neutral media type and may be discarded without changing the
 * condition.
 */
function restrictedMediaTypes(connective: string): readonly string[] {
  return connective
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word !== '' && word !== 'and' && word !== 'only' && word !== 'all');
}

// ---------------------------------------------------------------------------
// State-name synthesis
// ---------------------------------------------------------------------------

/** Reverse-lookup of the shared {@link VIEWPORT} px constants → their label. */
const VIEWPORT_LABEL: ReadonlyMap<number, string> = new Map(
  Object.entries(VIEWPORT).map(([label, px]) => [px, label] as const),
);

/**
 * Synthesize a boundary state name for a width/height threshold. With an
 * explicit `statePrefix` every state is `${prefix}-${threshold}` (deterministic,
 * matches the documented `bp` → `bp-0`, `bp-768` shape). Without one, `0` is the
 * base state and thresholds that coincide with a {@link VIEWPORT} constant reuse
 * its semantic label (`768` → `tablet`), falling back to `w-${threshold}`. The
 * mapping is injective over a strictly-ascending threshold list, so state names
 * stay unique (which `defineBoundary` requires).
 */
function stateNameFor(threshold: number, prefix: string | undefined): string {
  if (prefix !== undefined) return `${prefix}-${threshold}`;
  if (threshold === 0) return 'base';
  const label = VIEWPORT_LABEL.get(threshold);
  return label ?? `w-${threshold}`;
}

// ---------------------------------------------------------------------------
// Threshold folding
// ---------------------------------------------------------------------------

/** Non-empty `[threshold, stateName]` tuple list — the shape `defineBoundary` wants. */
type AtPairs = readonly [readonly [number, string], ...(readonly [number, string])[]];

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Lower a foreign `@media` stylesheet into `@liteship/core` definitions.
 *
 * Produces one boundary per faithfully resolved dimensional input (the built-in
 * viewport inputs for px/unitless-zero; host-resolved inputs for em/rem), one two-state boundary per
 * distinct discrete feature, and one light/dark `defineTheme` when any
 * `prefers-color-scheme` block is present. Every lossy or dropped construct is
 * recorded as a {@link MigrationDiagnostic} instead of throwing.
 *
 * @example
 * ```ts
 * const { boundaries } = fromMediaQueries(`
 *   @media (min-width: 768px)  { .card { padding: 2rem; } }
 *   @media (min-width: 1280px) { .card { padding: 4rem; } }
 * `);
 * // boundaries[0].input === 'viewport.width'
 * // boundaries[0].states === ['base', 'tablet', 'desktop']
 * // boundaries[0].thresholds === [0, 768, 1280]
 * ```
 */
export function fromMediaQueries(css: string, options?: FromMediaQueriesOptions): MigrationResult {
  const prefix = options?.statePrefix;
  const blanked = blankCssCommentsAndStrings(css);
  const len = css.length;

  const diagnostics: MigrationDiagnostic[] = [];
  const boundaries: Boundary[] = [];
  const themes: Theme[] = [];

  // Dimensional breakpoints, grouped by their actual measured input and kept in
  // source order (base 0 is prepended later).
  interface DimensionBucket {
    readonly axis: 'width' | 'height';
    readonly values: number[];
  }
  const dimensionValues = new Map<string, DimensionBucket>();

  // Distinct discrete-feature boundaries, keyed by their resolved input string.
  interface DiscreteConfig {
    readonly input: string;
    readonly slug: string;
    readonly feature: string;
  }
  const discreteConfigs: DiscreteConfig[] = [];
  const discreteInputs = new Set<string>();

  interface SchemeCandidate {
    readonly declaration: CSSDeclarationValue;
    readonly specificity: 100;
    readonly sourceOrder: number;
  }
  type SchemeVariant = 'light' | 'dark';

  // Cascade candidates retain importance and source order. A top-level :root
  // declaration participates in both variants; a color-scheme block contributes
  // only to its selected variant.
  const schemeCandidates: Record<SchemeVariant, Map<string, SchemeCandidate[]>> = {
    light: new Map(),
    dark: new Map(),
  };
  let schemeSourceOrder = 0;
  let sawColorScheme = false;

  const cloneSchemeCandidates = (): Record<SchemeVariant, Map<string, SchemeCandidate[]>> => ({
    light: new Map([...schemeCandidates.light].map(([name, candidates]) => [name, [...candidates]])),
    dark: new Map([...schemeCandidates.dark].map(([name, candidates]) => [name, [...candidates]])),
  });

  const restoreSchemeCandidates = (snapshot: Record<SchemeVariant, Map<string, SchemeCandidate[]>>): void => {
    for (const variant of ['light', 'dark'] as const) {
      schemeCandidates[variant].clear();
      for (const [name, candidates] of snapshot[variant]) schemeCandidates[variant].set(name, candidates);
    }
  };

  const recordSchemeDeclarations = (
    variants: readonly SchemeVariant[],
    props: Readonly<Record<string, CSSDeclarationValue>>,
  ): void => {
    const sourceOrder = schemeSourceOrder++;
    for (const variant of variants) {
      for (const [name, declaration] of Object.entries(props)) {
        const candidates = schemeCandidates[variant].get(name) ?? [];
        candidates.push({ declaration, specificity: 100, sourceOrder });
        schemeCandidates[variant].set(name, candidates);
      }
    }
  };

  const resolveSchemeValue = (variant: SchemeVariant, name: string): CSSDeclarationValue | undefined => {
    let winner: SchemeCandidate | undefined;
    for (const candidate of schemeCandidates[variant].get(name) ?? []) {
      if (
        winner === undefined ||
        winsCSSCascade(
          { ...candidate, important: candidate.declaration.important },
          { ...winner, important: winner.declaration.important },
        )
      ) {
        winner = candidate;
      }
    }
    return winner?.declaration;
  };

  const addDiscrete = (feat: ParsedFeature): string => {
    const normalizedValue =
      feat.value !== null && MUTUALLY_EXCLUSIVE_DISCRETE_FEATURES.has(feat.feature)
        ? feat.value.trim().toLowerCase()
        : feat.value;
    const query = normalizedValue !== null ? `(${feat.feature}: ${normalizedValue})` : `(${feat.feature})`;
    const recognized = RECOGNIZED_DISCRETE_FEATURES.has(feat.feature);
    const input = recognized
      ? (sourceToInput({ type: 'media', query }) as string)
      : (sourceToInput({ type: 'custom', id: query }) as string);
    diagnostics.push(
      makeMigrationDiagnostic(
        MIGRATE_CODES.unmappableMediaFeature,
        `Media feature "${feat.feature}" has no viewport-signal lowering; kept as ${
          recognized ? 'media' : 'custom'
        } input "${input}".`,
        { path: [feat.feature] },
      ),
    );
    if (discreteInputs.has(input)) return input;
    discreteInputs.add(input);
    discreteConfigs.push({ input, slug: feat.feature.replace(/[^a-z0-9]+/gi, '-'), feature: feat.feature });
    return input;
  };

  const processMedia = (rawPrelude: string, bodyStart: number, bodyEnd: number): void => {
    const parsedPrelude = cssCommentParsingView(rawPrelude).parsed;
    const diagnosticPrelude = rawPrelude.trim();
    // not / or / a comma query-list separator change the query's boolean meaning
    // (`not (prefers-color-scheme: dark)` is the NEGATION). A flat positive
    // feature fold cannot preserve that, so reject the whole block rather than
    // silently inverting its semantics or over-collecting its overrides.
    const connective = preludeConnective(parsedPrelude);
    if (/\bnot\b/.test(connective) || /\bor\b/.test(connective) || connective.includes(',')) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@media "${diagnosticPrelude}" uses boolean logic (not/or/comma) that a positive feature lowering cannot preserve; skipped rather than silently inverted.`,
          { path: ['@media', diagnosticPrelude], severity: 'error' },
        ),
      );
      return;
    }

    const mediaTypes = restrictedMediaTypes(connective);
    if (mediaTypes.length > 0) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@media "${diagnosticPrelude}" is restricted to media type ${mediaTypes
            .map((type) => `"${type}"`)
            .join(
              ', ',
            )}; LiteShip boundaries do not carry media-type identity, so the block was skipped rather than widened to every runtime surface.`,
          { path: ['@media', diagnosticPrelude], severity: 'error' },
        ),
      );
      return;
    }

    if (!hasValidPositiveFeatureSequence(parsedPrelude)) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@media "${diagnosticPrelude}" is outside the supported feature (and feature)* grammar; the complete block was refused.`,
          { path: ['@media', diagnosticPrelude], severity: 'error' },
        ),
      );
      return;
    }

    const feats = parseFeatures(parsedPrelude);
    if (feats.length === 0 || feats.some((feature) => !MEDIA_FEATURE_NAME.test(feature.feature))) {
      // Bare media-type query (`@media screen`, `@media print`) — no condition
      // to lower onto a boundary.
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@media "${diagnosticPrelude}" has no valid lowerable feature condition; skipped.`,
          { path: ['@media', diagnosticPrelude], severity: 'error' },
        ),
      );
      return;
    }

    // Closed discrete alternatives describe one selected value. Requiring two
    // distinct values of the same feature in one conjunction is therefore
    // unsatisfiable. Refuse before touching any boundary/theme accumulator;
    // lowering the alternatives independently would turn an impossible source
    // predicate into active runtime definitions.
    const closedValues = new Map<string, Set<string>>();
    for (const feat of feats) {
      if (!MUTUALLY_EXCLUSIVE_DISCRETE_FEATURES.has(feat.feature) || feat.value === null) continue;
      const values = closedValues.get(feat.feature) ?? new Set<string>();
      values.add(feat.value.trim().toLowerCase());
      closedValues.set(feat.feature, values);
    }
    const contradiction = [...closedValues].find(([, values]) => values.size > 1);
    if (contradiction !== undefined) {
      const [feature, values] = contradiction;
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@media "${diagnosticPrelude}" requires mutually exclusive values of "${feature}" (${[...values].join(
            ', ',
          )}); the unsatisfiable block emitted no definitions.`,
          { path: ['@media', diagnosticPrelude, feature], severity: 'error' },
        ),
      );
      return;
    }

    // A color-scheme theme can preserve only :root-scoped custom properties.
    // Preflight the whole block before mutating any shared accumulator so a
    // mixed/scoped selector never yields a partial theme plus a warning.
    const colorSchemeRules = new Map<string, readonly RootCustomPropertyRule[]>();
    for (const feat of feats) {
      if (feat.feature !== 'prefers-color-scheme') continue;
      const variant = (feat.value ?? '').toLowerCase();
      if (variant !== 'light' && variant !== 'dark') continue;
      const collected = collectRootCustomPropertyRules(css, bodyStart, bodyEnd);
      if (collected.unsupportedSelectors.length > 0) {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unsupportedSelector,
            `@media "${diagnosticPrelude}" contains custom-property declarations under unrepresentable selector scope (${collected.unsupportedSelectors.join(
              ', ',
            )}); the complete block was refused.`,
            { path: ['@media', diagnosticPrelude, collected.unsupportedSelectors[0]!], severity: 'error' },
          ),
        );
        return;
      }
      colorSchemeRules.set(variant, collected.rules);
    }

    // Preflight dimensional features before mutating any shared accumulator.
    // Only inclusive min predicates are faithful. Multiple min predicates on
    // the same axis intersect at their maximum lower bound.
    const dimensionThresholds = new Map<'width' | 'height', { readonly input: string; readonly value: number }>();
    for (const feat of feats) {
      const f = feat.feature;
      if (!WIDTH_FEATURES.has(f) && !HEIGHT_FEATURES.has(f)) continue;
      const length = parseQueryLength(feat.value ?? '');
      if (length === null) {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unmappableMediaFeature,
            `Media feature "${f}" value "${feat.value ?? ''}" is not a supported CSS length; the complete block was refused.`,
            { path: ['@media', diagnosticPrelude, f], severity: 'error' },
          ),
        );
        return;
      }
      if (!f.startsWith('min-')) {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unsupportedAtRule,
            `Media feature "${f}: ${feat.value ?? ''}" is a finite-upper or exact predicate that an unbounded LiteShip threshold cannot preserve; the complete block was refused.`,
            { path: ['@media', diagnosticPrelude, f], severity: 'error' },
          ),
        );
        return;
      }
      const axis = WIDTH_FEATURES.has(f) ? 'width' : 'height';
      const input =
        length.unit === 'px' || length.unit === 'zero'
          ? (sourceToInput({ type: 'viewport', axis }) as string)
          : options?.resolveLengthInput?.({ axis, unit: length.unit });
      if (!input) {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unmappableMediaFeature,
            `Media feature "${f}: ${feat.value ?? ''}" uses ${length.unit}, but no host input measured in that unit was provided; the complete block was refused.`,
            { path: ['@media', diagnosticPrelude, f], severity: 'error' },
          ),
        );
        return;
      }
      const prior = dimensionThresholds.get(axis);
      if (prior !== undefined && prior.input !== input) {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unsupportedAtRule,
            `@media "${diagnosticPrelude}" compares one ${axis} axis through multiple host inputs; the complete block was refused.`,
            { path: ['@media', diagnosticPrelude, axis], severity: 'error' },
          ),
        );
        return;
      }
      dimensionThresholds.set(axis, {
        input,
        value: Math.max(prior?.value ?? -Infinity, length.value),
      });
    }

    // The adapter mutates shared accumulators while lowering one block. Keep a
    // transaction checkpoint so an unsupported cross-target conjunction can be
    // refused as a WHOLE rather than returning independently active definitions.
    const checkpoint = {
      diagnostics: diagnostics.length,
      discrete: discreteConfigs.length,
      discreteInputs: new Set(discreteInputs),
      sawColorScheme,
      schemes: cloneSchemeCandidates(),
    };

    // Distinct lowering targets in THIS block. An `and` conjoining features that
    // lower to DIFFERENT targets loses the "only together" semantics — each
    // target becomes an independent definition matched on its own.
    const targets = new Set<string>();
    for (const [axis, threshold] of dimensionThresholds) targets.add(`${axis}-axis:${threshold.input}`);
    for (const feat of feats) {
      const f = feat.feature;
      if (WIDTH_FEATURES.has(f) || HEIGHT_FEATURES.has(f)) {
        continue; // committed once per axis after conjunction validation
      } else if (f === 'prefers-color-scheme') {
        const variant = (feat.value ?? '').toLowerCase();
        if (variant !== 'light' && variant !== 'dark') {
          targets.add(addDiscrete(feat));
          continue;
        }
        sawColorScheme = true;
        for (const rule of colorSchemeRules.get(variant) ?? []) {
          recordSchemeDeclarations([variant], rule.props);
        }
        targets.add('color-scheme');
      } else {
        targets.add(addDiscrete(feat));
      }
    }

    // Multiple features folding into the SAME single target (e.g. two width
    // breakpoints → one width boundary) preserve their meaning. But an `and`
    // across DISTINCT targets (a width boundary AND a discrete feature, or the
    // width AND height axes) cannot be represented — each lowers independently and
    // is matched separately, so the "only together" conjunction is silently lost.
    if (targets.size > 1) {
      discreteConfigs.length = checkpoint.discrete;
      discreteInputs.clear();
      for (const input of checkpoint.discreteInputs) discreteInputs.add(input);
      sawColorScheme = checkpoint.sawColorScheme;
      restoreSchemeCandidates(checkpoint.schemes);
      diagnostics.length = checkpoint.diagnostics;
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@media "${diagnosticPrelude}" conjoins ${targets.size} independent targets with "and" (${[...targets].join(
            ', ',
          )}); no independent definitions were emitted because that would lose the conjunction.`,
          { path: ['@media', diagnosticPrelude], severity: 'error' },
        ),
      );
      return;
    }

    for (const [axis, threshold] of dimensionThresholds) {
      const bucket = dimensionValues.get(threshold.input);
      if (bucket) bucket.values.push(threshold.value);
      else dimensionValues.set(threshold.input, { axis, values: [threshold.value] });
    }
  };

  // -------------------------------------------------------------------------
  // Top-level walk: at-rules + selector rules at brace depth 0.
  // -------------------------------------------------------------------------
  let i = 0;
  while (i < len) {
    while (i < len && /\s/.test(blanked[i]!)) i++;
    if (i >= len) break;

    const ch = blanked[i]!;

    if (ch === '}') {
      i++; // stray close
      continue;
    }

    if (ch === '@') {
      let j = i + 1;
      while (j < len && /[a-zA-Z-]/.test(blanked[j]!)) j++;
      const name = css.slice(i + 1, j).toLowerCase();

      // Prelude runs to the next `{` or `;` at this level.
      let k = j;
      while (k < len && blanked[k] !== '{' && blanked[k] !== ';') k++;
      if (k >= len) break;

      if (blanked[k] === ';') {
        // Statement at-rule (`@charset`, `@import`, `@namespace`, statement
        // `@layer`) — irrelevant to migration, skipped silently.
        i = k + 1;
        continue;
      }

      const prelude = css.slice(j, k);
      const bodyStart = k + 1;
      const bodyEnd = matchBrace(blanked, k);

      if (name === 'media') {
        processMedia(prelude, bodyStart, bodyEnd);
      } else {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unsupportedAtRule,
            `@${name} is not representable as a boundary; skipped.`,
            { path: [`@${name}`] },
          ),
        );
      }
      i = bodyEnd + 1;
      continue;
    }

    // Top-level selector rule — harvest custom properties as the shared light
    // defaults for a potential prefers-color-scheme theme, but ONLY from :root
    // (a scoped selector's custom props stay scoped, never theme-wide).
    let k = i;
    while (k < len && blanked[k] !== '{' && blanked[k] !== '}' && blanked[k] !== ';') k++;
    if (k >= len) break;
    if (blanked[k] !== '{') {
      i = k + 1;
      continue;
    }
    const selector = css.slice(i, k);
    const bodyStart = k + 1;
    const bodyEnd = matchBrace(blanked, k);
    if (selectorTargetsRoot(selector)) {
      const { props } = parseFlatDeclarationValues(css, bodyStart);
      recordSchemeDeclarations(
        ['light', 'dark'],
        Object.fromEntries(Object.entries(props).flatMap(([p, v]) => (p.startsWith('--') ? [[p.slice(2), v]] : []))),
      );
    }
    i = bodyEnd + 1;
  }

  // -------------------------------------------------------------------------
  // Fold dimensional breakpoints into ascending boundaries.
  // -------------------------------------------------------------------------
  const buildDimensionBoundary = (input: string, values: readonly number[], axis: 'width' | 'height'): void => {
    if (values.length === 0) return;

    if (new Set(values).size !== values.length) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.ambiguousBreakpoint,
          `Duplicate ${axis} breakpoints in source order [${values.join(', ')}] cannot preserve CSS cascade identity; the boundary was refused.`,
          { path: [input], severity: 'error' },
        ),
      );
      return;
    }
    const seq = values[0] === 0 ? [...values] : [0, ...values]; // base 0 is implicit unless explicitly authored

    if (seq.some((value, index) => index > 0 && value <= seq[index - 1]!)) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.nonAscendingThresholds,
          `${axis} breakpoints are not strictly ascending in source order [${seq.join(', ')}]; the boundary was refused rather than reordered.`,
          { path: [input], severity: 'error' },
        ),
      );
      return;
    }

    const pairs = seq.map((t) => [t, stateNameFor(t, prefix)] as const);
    try {
      boundaries.push(defineBoundary({ input, at: pairs as unknown as AtPairs }));
    } catch (e) {
      if (!hasTag(e, 'ValidationError')) throw e;
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `${axis} breakpoints could not form a valid boundary: ${(e as { detail?: string }).detail ?? String(e)}`,
          { path: [input], severity: 'error', cause: e },
        ),
      );
    }
  };

  for (const [input, bucket] of dimensionValues) buildDimensionBoundary(input, bucket.values, bucket.axis);

  // -------------------------------------------------------------------------
  // Discrete-feature boundaries (two-state on/off).
  // -------------------------------------------------------------------------
  for (const dc of discreteConfigs) {
    const pairs: AtPairs = [
      [0, `${dc.slug}-off`],
      [1, `${dc.slug}-on`],
    ];
    try {
      boundaries.push(defineBoundary({ input: dc.input, at: pairs }));
    } catch (e) {
      if (!hasTag(e, 'ValidationError')) throw e;
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `Discrete feature "${dc.feature}" could not form a valid boundary: ${
            (e as { detail?: string }).detail ?? String(e)
          }`,
          { path: [dc.feature], severity: 'error', cause: e },
        ),
      );
    }
  }

  // -------------------------------------------------------------------------
  // prefers-color-scheme → light/dark theme.
  // -------------------------------------------------------------------------
  if (sawColorScheme) {
    const names = [...new Set([...schemeCandidates.light.keys(), ...schemeCandidates.dark.keys()])];
    if (names.length > 0) {
      const tokens: Record<string, Record<'light' | 'dark', unknown>> = {};
      for (const name of names) {
        // Cross-fill so the theme is complete (defineTheme validates every
        // variant is present); a variant-only token reuses its sibling value.
        // A property present under only ONE color scheme has its OTHER variant
        // fabricated from the sibling — silently widening its scope — so flag it.
        const lightDeclaration = resolveSchemeValue('light', name);
        const darkDeclaration = resolveSchemeValue('dark', name);
        const lightMissing = lightDeclaration === undefined;
        const darkMissing = darkDeclaration === undefined;
        if (lightMissing || darkMissing) {
          const present = lightMissing ? 'dark' : 'light';
          const absent = lightMissing ? 'light' : 'dark';
          diagnostics.push(
            makeMigrationDiagnostic(
              MIGRATE_CODES.incompleteThemeVariant,
              `Custom property "--${name}" is defined only under the "${present}" color scheme; its "${absent}" variant is filled from the sibling value (scope widened).`,
              { path: [name] },
            ),
          );
        }
        tokens[name] = {
          light: serializeCSSDeclarationValue(lightDeclaration ?? darkDeclaration!),
          dark: serializeCSSDeclarationValue(darkDeclaration ?? lightDeclaration!),
        };
      }
      try {
        themes.push(
          defineTheme({
            name: 'migrated-color-scheme',
            variants: ['light', 'dark'] as const,
            tokens,
          }),
        );
      } catch (e) {
        if (!hasTag(e, 'ValidationError')) throw e;
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unsupportedAtRule,
            `prefers-color-scheme could not form a valid theme: ${(e as { detail?: string }).detail ?? String(e)}`,
            { path: ['prefers-color-scheme'], severity: 'error', cause: e },
          ),
        );
      }
    }
  }

  const tokens: readonly Token[] = [];
  return { boundaries, tokens, themes, diagnostics };
}
