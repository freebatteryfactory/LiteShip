/**
 * `migrate/from-css-custom-properties` — lower a stylesheet's `:root { --x: y }`
 * and `html[data-theme="variant"] { --x: y }` custom-property rules into ordinary
 * `@liteship/core` primitives.
 *
 * This is the exact inverse of the compiler's own CSS emit surface: `token-css.ts`
 * writes a token's fallback to `:root { --liteship-<name>: … }` and its per-variant
 * overrides to `html[data-theme="<variant>"] { --liteship-<name>: … }`, and
 * `theme-css.ts` does the same for a whole `defineTheme`. This adapter reads that
 * shape back:
 *
 *  - A THIN selector-prelude reader (NEW — the shared `parse` scanner gives at-rule
 *    and flat-declaration reading but no rule-SELECTOR splitter) walks the top-level
 *    `<selector> { … }` rules, reusing `skipSegment` to step over each balanced block
 *    and reading structural characters off the comment/string-blanked copy.
 *  - `:root` is the base (`'default'`) variant; each `html[data-theme="X"]` is variant
 *    `X`. Declarations are grouped per token name into a variant map.
 *  - When more than one variant is present the group lowers to a single `defineTheme`
 *    (`tokens: Record<name, Record<variant, value>>`); `defineTheme` requires every
 *    token to have a value for every variant, so a token missing in some variant is
 *    filled from its base (`:root`) value — or, when it has no base value at all,
 *    dropped — with a `migrate/incomplete-theme-variant` diagnostic either way.
 *  - When only one variant is present each token lowers to a `defineToken`, its
 *    `TokenCategory` inferred from the value's CSS syntax (`inferSyntax`).
 *
 * The `define*` constructors ARE the validation gate: a pathological declaration
 * (an empty token name from a bare `--liteship-:` property) reaches the constructor,
 * whose thrown `ValidationError` is caught and surfaced as a `severity:'error'`
 * diagnostic rather than escaping.
 *
 * @module
 */

import { defineToken, defineTheme } from '@liteship/core';
import type { Boundary, Token, Theme, TokenCategory } from '@liteship/core';
import { hasTag } from '@liteship/error';
import type { DiagnosticCodeFor } from '@liteship/error';
import {
  blankCssCommentsAndStrings,
  parseFlatDeclarations,
  skipWsAndComments,
  skipSegment,
} from '@liteship/compiler/parse';
import { inferSyntax } from '../css-utils.js';
import type { MigrationDiagnostic, MigrationResult } from './types.js';
import { makeMigrationDiagnostic, MIGRATE_CODES } from './diagnostics.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/** Options for {@link fromCSSCustomProperties}. */
export interface FromCSSCustomPropertiesOptions {
  /** Name for the produced `defineTheme` (multi-variant case). Defaults to `'theme'`. */
  readonly themeName?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The compiler's own custom-property prefix (`token-css.ts` / `theme-css.ts` emit `--liteship-<name>`). */
const LITESHIP_PREFIX = '--liteship-';

/** The base/default variant contributed by a `:root { … }` rule. */
const DEFAULT_VARIANT = 'default';

/**
 * Recognize an `html[data-theme="X"]` (or bare `[data-theme="X"]`) selector and
 * capture the variant name `X` — the exact inverse of the `theme-css.ts` /
 * `token-css.ts` emit selector. Accepts single-, double-, or un-quoted values.
 */
const DATA_THEME_RE = /^(?:html)?\s*\[\s*data-theme\s*=\s*(?:"([^"]*)"|'([^']*)'|([\w-]+))\s*\]$/;

/** Recognized migrated variants carried by one comma-separated selector list. */
function variantsOfSelector(selector: string): readonly string[] {
  const variants: string[] = [];
  for (const member of selector.split(',').map((part) => part.trim())) {
    if (member === ':root') {
      if (!variants.includes(DEFAULT_VARIANT)) variants.push(DEFAULT_VARIANT);
      continue;
    }
    const match = DATA_THEME_RE.exec(member);
    const variant = match?.[1] ?? match?.[2] ?? match?.[3];
    if (variant !== undefined && !variants.includes(variant)) variants.push(variant);
  }
  return variants;
}

// ---------------------------------------------------------------------------
// Selector-prelude reader (NEW — `parse` has no rule-selector splitter)
// ---------------------------------------------------------------------------

/** One top-level style rule: its raw selector prelude and the offset just after its `{`. */
interface RawRule {
  readonly selector: string;
  readonly bodyStart: number;
}

/** Where the current rule's prelude ends, scanning the blanked copy at paren depth 0. */
type PreludeEnd =
  | { readonly kind: 'block'; readonly at: number }
  | { readonly kind: 'statement'; readonly at: number }
  | { readonly kind: 'close'; readonly at: number }
  | { readonly kind: 'eof'; readonly at: number };

/**
 * From `pos`, scan the blanked copy (comments/strings already spaces, offsets
 * preserved) for the first top-level `{` (block rule), `;` (at-rule statement),
 * or `}` (stray close) at paren depth 0. Parens are tracked so a `{` inside a
 * functional/selector notation is never mistaken for a block open.
 */
function findPreludeEnd(blanked: string, pos: number, len: number): PreludeEnd {
  let parenDepth = 0;
  while (pos < len) {
    const ch = blanked[pos];
    if (ch === '(') parenDepth++;
    else if (ch === ')') {
      if (parenDepth > 0) parenDepth--;
    } else if (parenDepth === 0) {
      if (ch === '{') return { kind: 'block', at: pos };
      if (ch === ';') return { kind: 'statement', at: pos };
      if (ch === '}') return { kind: 'close', at: pos };
    }
    pos++;
  }
  return { kind: 'eof', at: len };
}

/**
 * Split a stylesheet into its top-level `<selector> { … }` rules. Reuses
 * `skipWsAndComments` to advance to each rule and `skipSegment` to step over each
 * balanced block; selector text is sliced from the ORIGINAL source (so real
 * quoted `data-theme` values survive) while structural scanning runs on the
 * blanked copy. At-rule statements (`@import …;`) and stray closes are skipped;
 * nested rules inside an at-rule block (e.g. `@media`) are intentionally NOT
 * descended into — those are other adapters' concern.
 */
function readTopLevelRules(css: string): RawRule[] {
  const blanked = blankCssCommentsAndStrings(css);
  const len = css.length;
  const rules: RawRule[] = [];
  let pos = 0;

  while (pos < len) {
    pos = skipWsAndComments(blanked, pos);
    if (pos >= len) break;

    const start = pos;
    const end = findPreludeEnd(blanked, pos, len);

    if (end.kind === 'block') {
      rules.push({ selector: css.slice(start, end.at).trim(), bodyStart: end.at + 1 });
      // Step over the whole balanced block; `skipSegment` at a `{` returns the
      // offset immediately after the matching `}`.
      pos = skipSegment(css, end.at);
    } else if (end.kind === 'statement' || end.kind === 'close') {
      pos = end.at + 1;
    } else {
      break; // EOF with no more rules
    }
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Custom-property → token-name inversion + category inference
// ---------------------------------------------------------------------------

/**
 * Recover a token name from a custom-property declaration, inverting the
 * `--liteship-<name>` emit convention. A plain `--<name>` custom property is
 * accepted too (its bare name). Returns `null` for a non-custom property.
 */
function tokenNameOf(prop: string): string | null {
  if (prop.startsWith(LITESHIP_PREFIX)) return prop.slice(LITESHIP_PREFIX.length);
  if (prop.startsWith('--')) return prop.slice(2);
  return null;
}

/**
 * Infer a {@link TokenCategory} from a raw CSS value, plus the diagnostic (if any)
 * the inference warrants. A `var()` / `calc()` reference cannot be represented
 * losslessly (`lossyTokenConversion`); a value whose syntax does not classify into
 * a category is kept under the catch-all `effect` category (`unknownTokenCategory`).
 */
function classifyValue(value: string): {
  readonly category: TokenCategory;
  readonly code?: DiagnosticCodeFor<'migrate'>;
} {
  if (/var\(|calc\(/.test(value)) return { category: 'effect', code: MIGRATE_CODES.lossyTokenConversion };
  switch (inferSyntax(value)) {
    case '<color>':
      return { category: 'color' };
    case '<length>':
      return { category: 'spacing' };
    case '<time>':
      return { category: 'animation' };
    default:
      // <number> / <percentage> / <angle> / <frequency> / keyword — no clean category.
      return { category: 'effect', code: MIGRATE_CODES.unknownTokenCategory };
  }
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Lower `:root { … }` and `html[data-theme="X"] { … }` custom-property rules into
 * `@liteship/core` definitions.
 *
 * Produces one `defineTheme` (variants ordered `default` first, then each
 * `data-theme` variant in first-seen order) when more than one variant is present,
 * or one `defineToken` per token when only a single variant is present. Every
 * lossy (`var()`/`calc()`), unclassifiable, incomplete-variant, or
 * constructor-rejected declaration is recorded as a {@link MigrationDiagnostic}
 * instead of throwing.
 *
 * @example
 * ```ts
 * const { themes } = fromCSSCustomProperties(`
 *   :root { --liteship-bg: #ffffff; }
 *   html[data-theme="dark"] { --liteship-bg: #111111; }
 * `);
 * // themes[0]: variants ['default', 'dark'],
 * //            tokens { bg: { default: '#ffffff', dark: '#111111' } }
 * ```
 */
export function fromCSSCustomProperties(css: string, options?: FromCSSCustomPropertiesOptions): MigrationResult {
  const diagnostics: MigrationDiagnostic[] = [];
  const tokens: Token[] = [];
  let themes: readonly Theme[] = [];
  const boundaries: readonly Boundary[] = []; // no boundaries from custom-property rules

  // -------------------------------------------------------------------------
  // Read every recognized rule into: token name → (variant → value).
  // -------------------------------------------------------------------------
  const byToken = new Map<string, Map<string, string>>();
  const tokenOrder: string[] = [];
  const variantOrder: string[] = [];
  const variantSeen = new Set<string>();

  const recordVariant = (variant: string): void => {
    if (!variantSeen.has(variant)) {
      variantSeen.add(variant);
      variantOrder.push(variant);
    }
  };

  for (const rule of readTopLevelRules(css)) {
    const ruleVariants = variantsOfSelector(rule.selector);
    if (ruleVariants.length === 0) continue; // selector we do not migrate
    for (const variant of ruleVariants) recordVariant(variant);
    const { props } = parseFlatDeclarations(css, rule.bodyStart);
    for (const [prop, value] of Object.entries(props)) {
      const name = tokenNameOf(prop);
      if (name === null) continue;
      let vm = byToken.get(name);
      if (!vm) {
        vm = new Map();
        byToken.set(name, vm);
        tokenOrder.push(name);
      }
      for (const variant of ruleVariants) vm.set(variant, value);
    }
  }

  // Variant ordering: base (:root) first when present, then data-theme variants
  // in first-seen order.
  const variants = variantSeen.has(DEFAULT_VARIANT)
    ? [DEFAULT_VARIANT, ...variantOrder.filter((v) => v !== DEFAULT_VARIANT)]
    : [...variantOrder];

  if (variants.length === 0) {
    return { boundaries, tokens, themes, diagnostics };
  }

  // -------------------------------------------------------------------------
  // Single variant → one defineToken per token.
  // -------------------------------------------------------------------------
  if (variants.length === 1) {
    const only = variants[0]!;
    if (only !== DEFAULT_VARIANT) {
      // A lone `[data-theme="X"]` sheet with no `:root` base: the values migrate to
      // GLOBAL tokens (a single variant carries no theme variance to encode), which
      // does NOT preserve the `data-theme` scope. Single variant -> tokens is the
      // deliberate design (see the "produces defineTokens (not a theme)" test), so the
      // fix is not to change the shape but to surface the scope collapse rather than
      // let it happen silently.
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.lossyTokenConversion,
          `Only the "[data-theme=\\"${only}\\"]" variant is present (no :root base); its custom properties migrate to GLOBAL tokens — the theme (data-theme) scope is not preserved.`,
          { path: [only] },
        ),
      );
    }
    for (const name of tokenOrder) {
      const value = byToken.get(name)!.get(only)!;
      const { category, code } = classifyValue(value);
      if (code === MIGRATE_CODES.lossyTokenConversion) {
        diagnostics.push(
          makeMigrationDiagnostic(
            code,
            `Custom property "--liteship-${name}" value "${value}" references/computes another value; kept verbatim (not resolved).`,
            { path: [name] },
          ),
        );
      } else if (code === MIGRATE_CODES.unknownTokenCategory) {
        diagnostics.push(
          makeMigrationDiagnostic(
            code,
            `Custom property "--liteship-${name}" value "${value}" has no CSS syntax that maps to a TokenCategory; categorized as "effect".`,
            { path: [name] },
          ),
        );
      }
      try {
        tokens.push(defineToken({ name, category, value }));
      } catch (e) {
        if (!hasTag(e, 'ValidationError')) throw e;
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.malformedInput,
            `Custom property could not form a valid token: ${(e as { detail?: string }).detail ?? String(e)}`,
            { path: [name], severity: 'error', cause: e },
          ),
        );
      }
    }
    return { boundaries, tokens, themes, diagnostics };
  }

  // -------------------------------------------------------------------------
  // Multiple variants → one defineTheme (cross-variant completeness enforced).
  // -------------------------------------------------------------------------
  const themeTokens: Record<string, Record<string, unknown>> = {};

  for (const name of tokenOrder) {
    const vm = byToken.get(name)!;
    const baseValue = vm.get(DEFAULT_VARIANT);
    const entry: Record<string, unknown> = {};
    let dropped = false;

    for (const variant of variants) {
      const val = vm.get(variant);
      if (val !== undefined) {
        entry[variant] = val;
        continue;
      }
      // Missing for this variant: fill from base, else the token cannot complete.
      if (baseValue !== undefined) {
        entry[variant] = baseValue;
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.incompleteThemeVariant,
            `Token "${name}" has no value for variant "${variant}"; filled from the base (:root) value "${baseValue}".`,
            { path: [name, variant] },
          ),
        );
      } else {
        dropped = true;
        break;
      }
    }

    if (dropped) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.incompleteThemeVariant,
          `Token "${name}" has no base (:root) value and is absent from at least one variant; cannot satisfy defineTheme completeness — dropped.`,
          { path: [name], severity: 'error' },
        ),
      );
      continue;
    }

    // Inspect EVERY authored variant. A literal base must not hide a lossy
    // `var()`/`calc()` override from the migration report.
    for (const [variant, value] of vm) {
      if (/var\(|calc\(/.test(value)) {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.lossyTokenConversion,
            `Token "${name}" variant "${variant}" value "${value}" references/computes another value; kept verbatim (not resolved).`,
            { path: [name, variant] },
          ),
        );
      }
    }

    themeTokens[name] = entry;
  }

  if (Object.keys(themeTokens).length > 0) {
    const themeName = options?.themeName ?? 'theme';
    try {
      themes = [
        defineTheme({
          name: themeName,
          variants: variants as [string, ...string[]],
          tokens: themeTokens,
        }),
      ];
    } catch (e) {
      if (!hasTag(e, 'ValidationError')) throw e;
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.malformedInput,
          `Custom-property rules could not form a valid theme: ${(e as { detail?: string }).detail ?? String(e)}`,
          { severity: 'error', cause: e },
        ),
      );
    }
  }

  return { boundaries, tokens, themes, diagnostics };
}
