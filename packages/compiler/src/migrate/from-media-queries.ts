/**
 * `migrate/from-media-queries` — lower a foreign CSS `@media` stylesheet into
 * ordinary `@liteship/core` primitives.
 *
 * The dimensional media features (`min-width`, `max-width`, `width`, and their
 * `height` counterparts) are the ones with a first-class LiteShip signal: they
 * fold into a `defineBoundary` on `viewport.width` / `viewport.height`. This is
 * the exact inverse of the compiler's own emit convention (`css.ts`
 * `buildContainerQuery`: `(width < T1)`, `(width >= Ti) and (width < Ti+1)`,
 * `(width >= Tlast)`; `queryAxisOf`: `.height` → height else width) — a
 * `min-width: T` block applies at `width >= T`, so `T` is a boundary threshold;
 * a `max-width: T` block applies at `width <= T`, so the strict boundary sits at
 * `T + 1`. Every threshold is the lower bound of a synthesized state.
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
import { blankCssCommentsAndStrings, parseFlatDeclarations } from '@liteship/compiler/parse';
import type { MigrationDiagnostic, MigrationResult, FromMediaQueriesOptions } from './types.js';
import { makeMigrationDiagnostic, MIGRATE_CODES } from './diagnostics.js';

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

/** `viewport.width` breakpoint features and their axis. */
const WIDTH_FEATURES: ReadonlySet<string> = new Set(['min-width', 'max-width', 'width']);
const HEIGHT_FEATURES: ReadonlySet<string> = new Set(['min-height', 'max-height', 'height']);

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
 * Parse a length feature value to CSS pixels, or `null` when it is not a
 * length (`auto`, a keyword, empty). `rem`/`em` are resolved against the
 * conventional 16px root. `Number('1e400')` is `Infinity` — deliberately NOT
 * rejected here: a non-finite length is a valid parse that the `defineBoundary`
 * constructor gate then legitimately refuses, so the pathological case surfaces
 * as a caught diagnostic instead of a silent drop.
 */
function parseLength(raw: string): number | null {
  const s = raw.trim();
  const unitMatch = s.match(/(px|rem|em)$/i);
  const unit = unitMatch?.[1]?.toLowerCase();
  const numStr = unit ? s.slice(0, s.length - unit.length) : s;
  if (numStr.trim() === '') return null;
  const n = Number(numStr);
  if (Number.isNaN(n)) return null;
  return unit === 'rem' || unit === 'em' ? n * 16 : n;
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
 * Collect every custom-property declaration (`--name: value`) inside a source
 * range by walking each nested rule block with the shared
 * {@link parseFlatDeclarations} scanner. Names are returned WITHOUT the leading
 * `--`. Used to read the `:root { … }` overrides inside a
 * `prefers-color-scheme` media block.
 */
function collectCustomProps(css: string, start: number, end: number): Record<string, string> {
  const out: Record<string, string> = {};
  let i = start;
  while (i < end) {
    if (css[i] === '{') {
      const { props, end: blockEnd } = parseFlatDeclarations(css, i + 1);
      for (const [k, v] of Object.entries(props)) {
        if (k.startsWith('--')) out[k.slice(2)] = v;
      }
      i = blockEnd > i ? blockEnd : i + 1;
    } else {
      i++;
    }
  }
  return out;
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
 * Produces at most one `viewport.width` boundary and one `viewport.height`
 * boundary (folded from every `min-width`/`max-width`/`width` and
 * `*-height`/`height` breakpoint respectively), one two-state boundary per
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

  // Dimensional breakpoints, in SOURCE order (base 0 is prepended later).
  const widthValues: number[] = [];
  const heightValues: number[] = [];

  // Distinct discrete-feature boundaries, keyed by their resolved input string.
  interface DiscreteConfig {
    readonly input: string;
    readonly slug: string;
    readonly feature: string;
  }
  const discreteConfigs: DiscreteConfig[] = [];
  const discreteInputs = new Set<string>();

  // prefers-color-scheme overrides, per variant; top-level :root props are the
  // shared light defaults.
  const baseTokens: Record<string, string> = {};
  const schemeVariants: { light?: Record<string, string>; dark?: Record<string, string> } = {};
  let sawColorScheme = false;

  const addDiscrete = (feat: ParsedFeature): void => {
    const query = feat.value !== null ? `(${feat.feature}: ${feat.value})` : `(${feat.feature})`;
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
    if (discreteInputs.has(input)) return;
    discreteInputs.add(input);
    discreteConfigs.push({ input, slug: feat.feature.replace(/[^a-z0-9]+/gi, '-'), feature: feat.feature });
  };

  const processMedia = (prelude: string, bodyStart: number, bodyEnd: number): void => {
    const feats = parseFeatures(prelude);
    if (feats.length === 0) {
      // Bare media-type query (`@media screen`, `@media print`) — no condition
      // to lower onto a boundary.
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `@media "${prelude.trim()}" has no lowerable feature condition; skipped.`,
          { path: ['@media', prelude.trim()] },
        ),
      );
      return;
    }

    for (const feat of feats) {
      const f = feat.feature;
      if (WIDTH_FEATURES.has(f) || HEIGHT_FEATURES.has(f)) {
        const px = parseLength(feat.value ?? '');
        if (px === null) {
          diagnostics.push(
            makeMigrationDiagnostic(
              MIGRATE_CODES.unmappableMediaFeature,
              `Media feature "${f}" value "${feat.value ?? ''}" is not a length; skipped.`,
              { path: [f] },
            ),
          );
          continue;
        }
        // max-* is inclusive (`<= T`); the strict boundary threshold is `T + 1`.
        const threshold = f.startsWith('max-') ? px + 1 : px;
        (WIDTH_FEATURES.has(f) ? widthValues : heightValues).push(threshold);
      } else if (f === 'prefers-color-scheme') {
        const variant = (feat.value ?? '').toLowerCase();
        if (variant !== 'light' && variant !== 'dark') {
          addDiscrete(feat);
          continue;
        }
        sawColorScheme = true;
        const props = collectCustomProps(css, bodyStart, bodyEnd);
        schemeVariants[variant] = { ...(schemeVariants[variant] ?? {}), ...props };
      } else {
        addDiscrete(feat);
      }
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
    // defaults for a potential prefers-color-scheme theme.
    let k = i;
    while (k < len && blanked[k] !== '{' && blanked[k] !== '}' && blanked[k] !== ';') k++;
    if (k >= len) break;
    if (blanked[k] !== '{') {
      i = k + 1;
      continue;
    }
    const bodyStart = k + 1;
    const bodyEnd = matchBrace(blanked, k);
    const { props } = parseFlatDeclarations(css, bodyStart);
    for (const [p, v] of Object.entries(props)) {
      if (p.startsWith('--')) baseTokens[p.slice(2)] = v;
    }
    i = bodyEnd + 1;
  }

  // -------------------------------------------------------------------------
  // Fold dimensional breakpoints into ascending boundaries.
  // -------------------------------------------------------------------------
  const buildDimensionBoundary = (values: readonly number[], axis: 'width' | 'height'): void => {
    if (values.length === 0) return;

    const seq = [0, ...values]; // base 0 is the implicit lower bound
    const firstOcc = [...new Set(seq)]; // dedupe, first-occurrence order
    const sorted = [...firstOcc].sort((a, b) => a - b);

    const input = sourceToInput({ type: 'viewport', axis }) as string;

    if (firstOcc.length !== seq.length) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.ambiguousBreakpoint,
          `Duplicate ${axis} breakpoints collapsed (${seq.join(', ')} → ${sorted.join(', ')}).`,
          { path: [input] },
        ),
      );
    }
    if (firstOcc.some((v, idx) => v !== sorted[idx])) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.nonAscendingThresholds,
          `${axis} breakpoints were not strictly ascending in source order; sorted (${firstOcc.join(
            ', ',
          )} → ${sorted.join(', ')}).`,
          { path: [input] },
        ),
      );
    }

    const pairs = sorted.map((t) => [t, stateNameFor(t, prefix)] as const);
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

  buildDimensionBoundary(widthValues, 'width');
  buildDimensionBoundary(heightValues, 'height');

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
    const lightMap = { ...baseTokens, ...(schemeVariants.light ?? {}) };
    const darkMap = { ...baseTokens, ...(schemeVariants.dark ?? {}) };
    const names = [...new Set([...Object.keys(lightMap), ...Object.keys(darkMap)])];
    if (names.length > 0) {
      const tokens: Record<string, Record<'light' | 'dark', unknown>> = {};
      for (const name of names) {
        // Cross-fill so the theme is complete (defineTheme validates every
        // variant is present); a variant-only token reuses its sibling value.
        tokens[name] = {
          light: lightMap[name] ?? darkMap[name],
          dark: darkMap[name] ?? lightMap[name],
        };
      }
      try {
        themes.push(
          defineTheme({
            name: 'migrated-color-scheme',
            variants: ['light', 'dark'] as const,
            tokens,
            meta: {
              light: { label: 'Light', mode: 'light' },
              dark: { label: 'Dark', mode: 'dark' },
            },
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
