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
 *    `X`. Declarations are grouped per token and resolved through the supported
 *    selector cascade: specificity first, then source order. Base declarations
 *    participate in every named variant because `:root` still matches the themed
 *    root element.
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
import { blankCssCommentsAndStrings, skipWsAndComments, skipSegment } from '@liteship/compiler/parse';
import {
  serializeCSSDeclarationValue,
  splitCSSSelectorList,
  winsCSSCascade,
  type CSSDeclarationValue,
} from '../parse/css-cascade.js';
import { containsCustomPropertyDeclaration, parseFlatDeclarationValues } from '../parse/css-scan.js';
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
const DEFAULT_VARIANT = Symbol('liteship.migrate.css-root');
type VariantKey = typeof DEFAULT_VARIANT | string;

function publicVariantName(variant: VariantKey): string {
  return variant === DEFAULT_VARIANT ? 'default' : variant;
}

/**
 * Recognize an `html[data-theme="X"]` (or bare `[data-theme="X"]`) selector and
 * capture the variant name `X` — the exact inverse of the `theme-css.ts` /
 * `token-css.ts` emit selector. Accepts single-, double-, or un-quoted values.
 */
const DATA_THEME_RE = /^(?:html)?\s*\[\s*data-theme\s*=\s*(?:"([^"]*)"|'([^']*)'|([\w-]+))\s*\]$/i;

interface SupportedSelector {
  readonly variant: VariantKey;
  /** CSS specificity for the supported selector subset, encoded as class * 100 + type. */
  readonly specificity: number;
}

function supportedSelectorOf(member: string): SupportedSelector | null {
  if (member.toLowerCase() === ':root') return { variant: DEFAULT_VARIANT, specificity: 100 };
  const match = DATA_THEME_RE.exec(member);
  const variant = match?.[1] ?? match?.[2] ?? match?.[3];
  if (variant === undefined) return null;
  return { variant, specificity: /^html\b/i.test(member) ? 101 : 100 };
}

/** Recognized selectors carried by one comma-separated selector list. */
function supportedSelectorsOf(selector: string): readonly SupportedSelector[] {
  const selectors: SupportedSelector[] = [];
  for (const member of splitCSSSelectorList(selector)) {
    const supported = supportedSelectorOf(member);
    if (supported !== null) selectors.push(supported);
  }
  return selectors;
}

/**
 * True when any member of a selector list falls outside the Token/Theme scope
 * model. `:host` is a compatible companion only when the same list also has a
 * `:root` arm; the root arm already establishes the global authored value, while
 * a lone `:host` would be an unfaithful scope widening.
 */
function hasUnsupportedSelectorMember(selector: string): boolean {
  const members = splitCSSSelectorList(selector);
  const hasRoot = members.some((member) => supportedSelectorOf(member)?.variant === DEFAULT_VARIANT);
  return (
    members.length === 0 ||
    members.some((member) => supportedSelectorOf(member) === null && !(hasRoot && member.toLowerCase() === ':host'))
  );
}

// ---------------------------------------------------------------------------
// Selector-prelude reader (NEW — `parse` has no rule-selector splitter)
// ---------------------------------------------------------------------------

/** One top-level style rule: its raw selector prelude and the offset just after its `{`. */
interface RawRule {
  readonly selector: string;
  readonly bodyStart: number;
  readonly bodyEnd: number;
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
 * nested rules inside an at-rule block are retained as one opaque body range.
 * The adapter refuses a sheet when that range contains custom-property
 * declarations, because flattening `@layer`, `@supports`, `@media`, or `@scope`
 * would discard cascade or conditional semantics.
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
      // Step over the whole balanced block; `skipSegment` at a `{` returns the
      // offset immediately after the matching `}`.
      const blockEnd = skipSegment(css, end.at);
      rules.push({
        selector: css.slice(start, end.at).trim(),
        bodyStart: end.at + 1,
        bodyEnd: Math.max(end.at + 1, blockEnd - 1),
      });
      pos = blockEnd;
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
  const blanked = blankCssCommentsAndStrings(css);
  const topLevelRules = readTopLevelRules(css);

  const wrappedDefinition = topLevelRules.find(
    (rule) => rule.selector.startsWith('@') && containsCustomPropertyDeclaration(blanked, rule.bodyStart, rule.bodyEnd),
  );
  if (wrappedDefinition !== undefined) {
    const wrapper = wrappedDefinition.selector.split(/[\s(]/, 1)[0] ?? wrappedDefinition.selector;
    diagnostics.push(
      makeMigrationDiagnostic(
        MIGRATE_CODES.unsupportedAtRule,
        `${wrapper} contains custom-property definitions whose wrapper semantics cannot be preserved; the stylesheet was refused.`,
        { path: [wrapper], severity: 'error' },
      ),
    );
    return { boundaries, tokens, themes, diagnostics };
  }

  const scopedDefinition = topLevelRules.find(
    (rule) =>
      !rule.selector.startsWith('@') &&
      hasUnsupportedSelectorMember(rule.selector) &&
      containsCustomPropertyDeclaration(blanked, rule.bodyStart, rule.bodyEnd),
  );
  if (scopedDefinition !== undefined) {
    diagnostics.push(
      makeMigrationDiagnostic(
        MIGRATE_CODES.unsupportedSelector,
        `Selector "${scopedDefinition.selector}" scopes custom-property definitions more narrowly than Token/Theme can preserve; the stylesheet was refused.`,
        { path: [scopedDefinition.selector], severity: 'error' },
      ),
    );
    return { boundaries, tokens, themes, diagnostics };
  }

  // -------------------------------------------------------------------------
  // Read every recognized rule into cascade candidates. A :root declaration
  // applies to the root element in every named theme; a named selector applies
  // only to that variant. Resolution happens after the complete variant set is
  // known so specificity and source order are preserved across those selectors.
  // -------------------------------------------------------------------------
  interface CascadeCandidate {
    readonly sourceVariant: VariantKey;
    readonly declaration: CSSDeclarationValue;
    readonly specificity: number;
    readonly sourceOrder: number;
  }

  const byToken = new Map<string, CascadeCandidate[]>();
  const tokenOrder: string[] = [];
  const variantOrder: VariantKey[] = [];
  const variantSeen = new Set<VariantKey>();

  const recordVariant = (variant: VariantKey): void => {
    if (!variantSeen.has(variant)) {
      variantSeen.add(variant);
      variantOrder.push(variant);
    }
  };

  for (const [sourceOrder, rule] of topLevelRules.entries()) {
    const selectors = supportedSelectorsOf(rule.selector);
    if (selectors.length === 0) continue; // no custom-property declaration (preflight refused scoped definitions)
    for (const { variant } of selectors) recordVariant(variant);
    const { props } = parseFlatDeclarationValues(css, rule.bodyStart);
    for (const [prop, declaration] of Object.entries(props)) {
      const name = tokenNameOf(prop);
      if (name === null) continue;
      let candidates = byToken.get(name);
      if (!candidates) {
        candidates = [];
        byToken.set(name, candidates);
        tokenOrder.push(name);
      }
      for (const selector of selectors) {
        candidates.push({
          sourceVariant: selector.variant,
          declaration,
          specificity: selector.specificity,
          sourceOrder,
        });
      }
    }
  }

  // Variant ordering: base (:root) first when present, then data-theme variants
  // in first-seen order.
  const variants: VariantKey[] = variantSeen.has(DEFAULT_VARIANT)
    ? [DEFAULT_VARIANT, ...variantOrder.filter((v) => v !== DEFAULT_VARIANT)]
    : [...variantOrder];

  if (variants.length === 0) {
    return { boundaries, tokens, themes, diagnostics };
  }

  const publicVariants = variants.map(publicVariantName);
  if (new Set(publicVariants).size !== publicVariants.length) {
    diagnostics.push(
      makeMigrationDiagnostic(
        MIGRATE_CODES.malformedInput,
        'A named data-theme="default" collides with the internal :root base variant; the theme was refused.',
        { path: ['default'], severity: 'error' },
      ),
    );
    return { boundaries, tokens, themes, diagnostics };
  }

  const applicableCandidates = (name: string, variant: VariantKey): readonly CascadeCandidate[] =>
    byToken.get(name)!.filter(({ sourceVariant }) => sourceVariant === DEFAULT_VARIANT || sourceVariant === variant);

  const resolveCascade = (name: string, variant: VariantKey): CSSDeclarationValue | undefined => {
    let winner: CascadeCandidate | undefined;
    for (const candidate of applicableCandidates(name, variant)) {
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

  const hasAuthoredVariant = (name: string, variant: VariantKey): boolean =>
    byToken.get(name)!.some(({ sourceVariant }) => sourceVariant === variant);

  // -------------------------------------------------------------------------
  // Single variant → one defineToken per token.
  // -------------------------------------------------------------------------
  if (variants.length === 1) {
    const only = variants[0]!;
    if (only !== DEFAULT_VARIANT) {
      // A lone named variant cannot become a global token without widening its
      // selector scope. Refuse the whole sheet shape rather than globalizing it.
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.lossyTokenConversion,
          `Only the "[data-theme=\\"${only}\\"]" variant is present (no :root base); the rule was refused because global tokens cannot preserve its theme scope.`,
          { path: [only], severity: 'error' },
        ),
      );
      return { boundaries, tokens, themes, diagnostics };
    }
    for (const name of tokenOrder) {
      const declaration = resolveCascade(name, only)!;
      const value = serializeCSSDeclarationValue(declaration);
      const { category, code } = classifyValue(declaration.value);
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
    const candidates = byToken.get(name)!;
    const baseDeclaration = resolveCascade(name, DEFAULT_VARIANT);
    const entry: Record<string, unknown> = {};
    let dropped = false;

    for (const variant of variants) {
      const declaration = resolveCascade(name, variant);
      const publicVariant = publicVariantName(variant);
      if (declaration !== undefined) {
        const value = serializeCSSDeclarationValue(declaration);
        entry[publicVariant] = value;
        if (variant !== DEFAULT_VARIANT && !hasAuthoredVariant(name, variant) && baseDeclaration !== undefined) {
          diagnostics.push(
            makeMigrationDiagnostic(
              MIGRATE_CODES.incompleteThemeVariant,
              `Token "${name}" has no value for variant "${publicVariant}"; filled from the base (:root) value "${serializeCSSDeclarationValue(baseDeclaration)}".`,
              { path: [name, publicVariant] },
            ),
          );
        }
        continue;
      }
      dropped = true;
      break;
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
    for (const { sourceVariant, declaration } of candidates) {
      const value = serializeCSSDeclarationValue(declaration);
      const publicVariant = publicVariantName(sourceVariant);
      if (/var\(|calc\(/.test(declaration.value)) {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.lossyTokenConversion,
            `Token "${name}" variant "${publicVariant}" value "${value}" references/computes another value; kept verbatim (not resolved).`,
            { path: [name, publicVariant] },
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
          variants: publicVariants as [string, ...string[]],
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
