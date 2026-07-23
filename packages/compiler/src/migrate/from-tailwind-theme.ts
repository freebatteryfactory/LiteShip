/**
 * `migrate/from-tailwind-theme` — lower a Tailwind v4 `@theme { }` block into
 * ordinary `@liteship/core` primitives.
 *
 * Tailwind v4 is CSS-first: a design system lives in `@theme { … }` as flat
 * custom properties whose namespace prefix (`--color-`, `--spacing-`, `--font-`,
 * …) encodes the token category, exactly the emit convention the compiler's own
 * `token-tailwind.ts` produces in reverse. This adapter is that inverse:
 *
 *  - Each `--<namespace>-<name>: value` declaration recovers a
 *    `(TokenCategory, name)` pair from a NEW LOCAL inverse of the (private)
 *    `CATEGORY_PREFIX` table and lowers to a `defineToken`.
 *  - Numeric-suffixed scale vars (`--color-primary-500`, `--color-primary-700`)
 *    are reconstructed into a SINGLE multi-value `defineToken` on a synthesized
 *    `scale` axis, with a co-named bare var (`--color-primary`) used as the
 *    fallback. Multi-axis value keys join per-axis values with `:` in
 *    ALPHABETICAL axis-name order (the `defineToken` contract), so the key
 *    builder sorts axis names even though this adapter synthesizes one axis.
 *  - `--breakpoint-*` vars (and an optional `screens` map) fold into one
 *    ascending `viewport.width` `defineBoundary` — a mapping that exists nowhere
 *    else, authored here.
 *
 * The `define*` constructors ARE the validation gate: the adapter parses
 * optimistically and lets a pathological declaration (an empty token name, a
 * non-finite screen length) reach the constructor, catching the thrown
 * `ValidationError` and surfacing it as a `severity:'error'` diagnostic rather
 * than letting it escape.
 *
 * @module
 */

import { defineBoundary, defineToken, sourceToInput } from '@liteship/core';
import type { Boundary, Token, Theme, TokenCategory } from '@liteship/core';
import { hasTag } from '@liteship/error';
import { blankCssCommentsAndStrings, parseFlatDeclarations } from '@liteship/compiler/parse';
import { inferSyntax } from '../css-utils.js';
import type { MigrationDiagnostic, MigrationResult, FromMediaQueriesOptions } from './types.js';
import { makeMigrationDiagnostic, MIGRATE_CODES } from './diagnostics.js';
import { parseQueryLength } from './query-length.js';

// ---------------------------------------------------------------------------
// Namespace → category inverse (NEW LOCAL table — the emit-side const is private)
// ---------------------------------------------------------------------------

/**
 * The inverse of `token-tailwind.ts`'s private `CATEGORY_PREFIX`. Authored here
 * as a fresh local table (the const cannot be imported). No prefix is a prefix
 * of another, so a first-match scan is unambiguous.
 */
const NAMESPACE_CATEGORY: ReadonlyArray<readonly [string, TokenCategory]> = [
  ['--color-', 'color'],
  ['--spacing-', 'spacing'],
  ['--font-', 'typography'],
  ['--radius-', 'radius'],
  ['--shadow-', 'shadow'],
  ['--animate-', 'animation'],
  ['--effect-', 'effect'],
];

/** Tailwind v4's breakpoint namespace — folded to a `viewport.width` boundary, not a token. */
const BREAKPOINT_PREFIX = '--breakpoint-';

/** Synthesized axis name for a numeric-suffixed scale (`--color-primary-500`). */
const SCALE_AXIS = 'scale';

/** `--<base>-<digits>` → `{ base, scale }`; a name with no numeric tail yields `null`. */
const SCALE_SUFFIX_RE = /^(.+)-(\d+)$/;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Options for {@link fromTailwindTheme}. Extends the shared media-query options
 * (`statePrefix`, used for synthesized breakpoint state names) with an explicit
 * `screens` map for configs that carry breakpoints outside the `@theme` block.
 */
export interface FromTailwindThemeOptions extends FromMediaQueriesOptions {
  /** Explicit `name → length` screen map (e.g. `{ sm: '640px', md: '768px' }`); merged over `--breakpoint-*`. */
  readonly screens?: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/** Index of the `}` closing the block whose `{` is at `openIdx` (on the blanked copy). */
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
 * Collect every `--x: y` declaration from the `@theme { }` block(s) in `css`, in
 * source order (later blocks / later duplicate names override the value but keep
 * their first position). When the input carries no `@theme` at-rule at all AND
 * no rule braces, the whole string is treated as a bare declaration body — so a
 * caller may pass just the block's inner declarations.
 */
function collectThemeDeclarations(css: string): Record<string, string> {
  const blanked = blankCssCommentsAndStrings(css);
  const decls: Record<string, string> = {};
  let found = false;
  let from = 0;

  while (from < blanked.length) {
    const at = blanked.indexOf('@theme', from);
    if (at === -1) break;
    // Reject a longer identifier that merely starts with "@theme".
    const after = blanked[at + 6];
    if (after !== undefined && /[a-zA-Z0-9-]/.test(after)) {
      from = at + 6;
      continue;
    }
    const brace = blanked.indexOf('{', at);
    if (brace === -1) break;
    found = true;
    const { props } = parseFlatDeclarations(css, brace + 1);
    for (const [k, v] of Object.entries(props)) decls[k] = v;
    from = matchBrace(blanked, brace) + 1;
  }

  if (!found && !blanked.includes('{')) {
    const { props } = parseFlatDeclarations(css, 0);
    for (const [k, v] of Object.entries(props)) decls[k] = v;
  }
  return decls;
}

/**
 * Build the `defineToken` `values` key for a per-axis value map, joining one
 * value per axis with `:` in ALPHABETICAL axis-name order — the exact contract
 * `defineToken` enforces. Single-axis tokens (all this adapter synthesizes)
 * reduce to the lone axis value, but the join is written generally so the
 * alphabetical trap is honoured by construction.
 */
function buildValueKey(byAxis: Readonly<Record<string, string>>, axes: readonly string[]): string {
  return [...axes]
    .sort()
    .map((axis) => byAxis[axis] ?? '')
    .join(':');
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Lower a Tailwind v4 `@theme { }` block into `@liteship/core` definitions.
 *
 * Produces one `defineToken` per recovered token (numeric scale steps folded into
 * a single `scale`-axis token) and, when any `--breakpoint-*` custom property or
 * `screens` option is present, one ascending `viewport.width` `defineBoundary`. Every
 * lossy (`var()`/`calc()` reference), unclassifiable (unknown namespace), or
 * dropped (constructor rejection) construct is recorded as a
 * {@link MigrationDiagnostic} instead of throwing.
 *
 * @example
 * ```ts
 * const { tokens, boundaries } = fromTailwindTheme(`
 *   @theme {
 *     --color-primary-500: #6366f1;
 *     --color-primary-700: #4338ca;
 *     --spacing-sm: 0.5rem;
 *     --breakpoint-md: 768px;
 *   }
 * `);
 * // tokens[0]: name 'primary', category 'color', axes ['scale'],
 * //            values { '500': '#6366f1', '700': '#4338ca' }
 * // boundaries[0]: input 'viewport.width', thresholds [0, 768]
 * ```
 */
export function fromTailwindTheme(css: string, options?: FromTailwindThemeOptions): MigrationResult {
  const prefix = options?.statePrefix;
  const diagnostics: MigrationDiagnostic[] = [];
  const tokens: Token[] = [];
  const boundaries: Boundary[] = [];
  const themes: readonly Theme[] = [];

  const decls = collectThemeDeclarations(css);

  // Ordered screen entries: --breakpoint-* first (source order), then the
  // options.screens map merged on top (override in place / append).
  const screenEntries: Array<{ name: string; raw: string }> = [];
  const screenIndex = new Map<string, number>();
  const pushScreen = (name: string, raw: string): void => {
    const at = screenIndex.get(name);
    if (at !== undefined) {
      screenEntries[at]!.raw = raw;
    } else {
      screenIndex.set(name, screenEntries.length);
      screenEntries.push({ name, raw });
    }
  };

  // One grouped token per (category, base name); `scales` holds numeric-suffixed
  // values, `bare` the co-named unsuffixed value (used as fallback).
  interface TokenGroup {
    readonly category: TokenCategory;
    readonly base: string;
    readonly scales: Record<string, string>;
    bare?: string;
  }
  const groups = new Map<string, TokenGroup>();
  const groupOrder: string[] = [];
  const groupFor = (category: TokenCategory, base: string): TokenGroup => {
    const key = `${category} ${base}`;
    let g = groups.get(key);
    if (!g) {
      g = { category, base, scales: {} };
      groups.set(key, g);
      groupOrder.push(key);
    }
    return g;
  };

  // -------------------------------------------------------------------------
  // Classify every declaration.
  // -------------------------------------------------------------------------
  for (const [name, value] of Object.entries(decls)) {
    if (!name.startsWith('--')) continue; // non-custom-property declaration — not a theme var

    if (name.startsWith(BREAKPOINT_PREFIX)) {
      pushScreen(name.slice(BREAKPOINT_PREFIX.length), value);
      continue;
    }

    const match = NAMESPACE_CATEGORY.find(([pfx]) => name.startsWith(pfx));
    if (!match) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unknownTokenCategory,
          `Tailwind var "${name}" has no known category namespace; skipped.`,
          { path: [name] },
        ),
      );
      continue;
    }

    const [pfx, category] = match;
    const rest = name.slice(pfx.length);

    // Flag values that reference / compute rather than state a literal — kept as
    // written, but not losslessly representable. inferSyntax is the sanity gate:
    // only an UNCLASSIFIABLE value that is also a var()/calc() ref is lossy (a
    // multi-token literal like a font-family stack is unclassifiable but fine).
    if (inferSyntax(value) === null && /var\(|calc\(/.test(value)) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.lossyTokenConversion,
          `Tailwind var "${name}" value "${value}" references/computes another value; kept verbatim (not resolved).`,
          { path: [name] },
        ),
      );
    }

    const scaleMatch = SCALE_SUFFIX_RE.exec(rest);
    if (scaleMatch) {
      const [, base, scaleValue] = scaleMatch;
      groupFor(category, base!).scales[scaleValue!] = value;
    } else {
      groupFor(category, rest).bare = value;
    }
  }

  // -------------------------------------------------------------------------
  // Materialize tokens (grouped scale reconstruction).
  // -------------------------------------------------------------------------
  const emitToken = (group: TokenGroup): void => {
    const scaleKeys = Object.keys(group.scales);
    try {
      if (scaleKeys.length === 0) {
        // Plain single-value token.
        tokens.push(defineToken({ name: group.base, category: group.category, value: group.bare }));
        return;
      }
      // Numeric-suffixed scale → one axis token. Fallback prefers a co-named bare
      // var, then the idiomatic `500` step, then the numerically-lowest step.
      const sortedNumeric = [...scaleKeys].sort((a, b) => Number(a) - Number(b));
      const fallback = group.bare ?? group.scales['500'] ?? group.scales[sortedNumeric[0]!];
      const values: Record<string, string> = {};
      for (const [scaleValue, v] of Object.entries(group.scales)) {
        values[buildValueKey({ [SCALE_AXIS]: scaleValue }, [SCALE_AXIS])] = v;
      }
      tokens.push(
        defineToken({
          name: group.base,
          category: group.category,
          axes: [SCALE_AXIS] as const,
          values,
          fallback,
        }),
      );
    } catch (e) {
      if (!hasTag(e, 'ValidationError')) throw e;
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.lossyTokenConversion,
          `Tailwind token "${group.base}" (${group.category}) could not form a valid token: ${
            (e as { detail?: string }).detail ?? String(e)
          }`,
          { path: [group.base], severity: 'error', cause: e },
        ),
      );
    }
  };
  for (const key of groupOrder) emitToken(groups.get(key)!);

  // -------------------------------------------------------------------------
  // Merge the options.screens map and fold every screen into one boundary.
  // -------------------------------------------------------------------------
  if (options?.screens) {
    for (const [name, raw] of Object.entries(options.screens)) pushScreen(name, raw);
  }

  if (screenEntries.length > 0) {
    // Parse each screen without collapsing relative units. A value that is not a supported
    // length (`40vw`, `100%`, a malformed number) cannot become a threshold — it
    // is DROPPED, so surface it as a diagnostic rather than silently losing the
    // breakpoint (the adapter's no-silent-drift contract).
    const parsed: Array<{ name: string; value: number; input: string }> = [];
    let refuseBoundary = false;
    for (const { name, raw } of screenEntries) {
      const length = parseQueryLength(raw);
      if (length === null) {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unsupportedAtRule,
            `Tailwind screen "${name}" value "${raw}" is not a supported length (px/em/rem or unitless zero); dropped from the boundary.`,
            { path: [name] },
          ),
        );
        continue;
      }
      const input =
        length.unit === 'px' || length.unit === 'zero'
          ? (sourceToInput({ type: 'viewport', axis: 'width' }) as string)
          : options?.resolveLengthInput?.({ axis: 'width', unit: length.unit });
      if (!input) {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.unsupportedAtRule,
            `Tailwind screen "${name}" value "${raw}" uses ${length.unit}, but no host input measured in that unit was provided; the complete breakpoint boundary was refused.`,
            { path: [name], severity: 'error' },
          ),
        );
        refuseBoundary = true;
        continue;
      }
      parsed.push({ name, value: length.value, input });
    }

    const inputs = new Set(parsed.map((screen) => screen.input));
    if (inputs.size > 1) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `Tailwind screens resolve through multiple measured inputs (${[...inputs].join(', ')}); one ordered breakpoint boundary cannot preserve that comparison.`,
          { path: ['screens'], severity: 'error' },
        ),
      );
      refuseBoundary = true;
    }

    if (!refuseBoundary && parsed.length > 0) {
      const input = parsed[0]!.input;

      // Base 0 state + one state per screen threshold.
      const sourcePairs: Array<readonly [number, string]> = [
        [0, prefix !== undefined ? `${prefix}-0` : 'base'],
        ...parsed.map((s) => [s.value, prefix !== undefined ? `${prefix}-${s.value}` : s.name] as const),
      ];

      // Dedupe by threshold (first wins) and sort ascending; flag either fixup.
      const byThreshold = new Map<number, string>();
      for (const [t, s] of sourcePairs) if (!byThreshold.has(t)) byThreshold.set(t, s);
      const sorted = [...byThreshold.entries()].map(([t, s]) => [t, s] as const).sort((a, b) => a[0] - b[0]);

      const wasStrictlyAscending =
        byThreshold.size === sourcePairs.length && sourcePairs.every(([t], i) => t === sorted[i]![0]);
      if (!wasStrictlyAscending) {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.nonAscendingThresholds,
            `Tailwind screens were not strictly ascending in source order; sorted/deduped (${sourcePairs
              .map(([t]) => t)
              .join(', ')} → ${sorted.map(([t]) => t).join(', ')}).`,
            { path: [input] },
          ),
        );
      }

      type AtPairs = readonly [readonly [number, string], ...(readonly [number, string])[]];
      try {
        boundaries.push(defineBoundary({ input, at: sorted as unknown as AtPairs }));
      } catch (e) {
        if (!hasTag(e, 'ValidationError')) throw e;
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.nonAscendingThresholds,
            `Tailwind screens could not form a valid boundary: ${(e as { detail?: string }).detail ?? String(e)}`,
            { path: [input], severity: 'error', cause: e },
          ),
        );
      }
    }
  }

  return { boundaries, tokens, themes, diagnostics };
}
