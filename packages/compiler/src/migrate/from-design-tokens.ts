/**
 * `migrate/from-design-tokens` — lower a W3C / DTCG design-token document into
 * ordinary `@liteship/core` primitives.
 *
 * The input is a Design Tokens Community Group JSON document: nested GROUPS
 * (plain objects) that bottom out in TOKENS (objects carrying a `$value`, an
 * optional `$type`, and DTCG metadata `$description`/`$extensions`/`$deprecated`).
 * A group may declare a `$type` that every descendant token without its own
 * `$type` inherits. There is no CSS to scan here — the source is already
 * structured JSON — so this adapter uses the schema kernel as its trust gate
 * (the exact pattern of `packages/core/src/graph/document-graph-schema.ts`): the
 * whole document is decoded against `schema.record(schema.unknown)` (a non-object
 * input is a fatal `migrate/malformed-input`, its `DecodeIssue[]` folded into a
 * `ParseError`), and every leaf token is decoded against a `schema.brand`ed struct
 * whose refinement throws a `ValidationError` that folds into a `schema/brand`
 * `DecodeIssue`, then re-tagged (message and path preserved) into a migrate
 * diagnostic.
 *
 * Two lowering shapes:
 *  - a plain token (`$value` is a scalar / composite) → a single `defineToken`,
 *    its `TokenCategory` resolved from `$type` (falling back to `inferSyntax` on
 *    the CSS-stringified value, then to `effect` with an
 *    `unknown-token-category` flag);
 *  - a MODE token (`$value` is an object whose keys are all in the configured
 *    mode set, default `['light', 'dark']`) → an entry in ONE emitted
 *    `defineTheme`, cross-filled to completeness (a missing mode reuses a sibling
 *    value and is flagged `incomplete-theme-variant`); mode metadata rides
 *    `meta.<variant>.mode`.
 *
 * The `define*` constructors ARE the validation gate: the adapter builds
 * optimistically and lets a pathological token (an empty name from an empty JSON
 * key, say) reach the constructor, catching the thrown `ValidationError` and
 * surfacing it as a `severity:'error'` diagnostic rather than letting it escape.
 *
 * @module
 */

import { defineToken, defineTheme, decode, schema, parseErrorFromIssues } from '@liteship/core';
import type { Token, Theme, TokenCategory } from '@liteship/core';
import { ValidationError, hasTag } from '@liteship/error';
import { inferSyntax, stringifyCSSValue, type CSSSyntax } from '../css-utils.js';
import type { MigrationDiagnostic, MigrationResult } from './types.js';
import { makeMigrationDiagnostic, MIGRATE_CODES } from './diagnostics.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/** Options for {@link fromDesignTokens}. */
export interface FromDesignTokensOptions {
  /**
   * The mode axis a token's `$value` object may be keyed by — a token whose
   * `$value` is an object with every key in this set lowers to a
   * {@link defineTheme} variant rather than a {@link defineToken}. Default
   * `['light', 'dark']`.
   */
  readonly modes?: readonly string[];
  /** Name for the single emitted `defineTheme`. Default `'migrated-theme'`. */
  readonly themeName?: string;
}

const DEFAULT_MODES: readonly string[] = ['light', 'dark'];
const DEFAULT_THEME_NAME = 'migrated-theme';

// ---------------------------------------------------------------------------
// $type → TokenCategory (NEW: no DTCG↔category table exists anywhere)
// ---------------------------------------------------------------------------

/**
 * Map a DTCG `$type` to a LiteShip {@link TokenCategory}. The DTCG scalar types
 * (`color`, `dimension`, `fontFamily`/`fontWeight`, `duration`, `cubicBezier`)
 * and the composite types (`typography`, `shadow`, `borderRadius`) fold onto the
 * seven-category LiteShip vocabulary. A `$type` outside this table is treated as
 * absent (best-effort classification via {@link inferSyntax} takes over).
 */
const DTCG_TYPE_TO_CATEGORY: Readonly<Record<string, TokenCategory>> = {
  color: 'color',
  dimension: 'spacing',
  fontFamily: 'typography',
  fontWeight: 'typography',
  typography: 'typography',
  shadow: 'shadow',
  borderRadius: 'radius',
  duration: 'animation',
  cubicBezier: 'animation',
};

/**
 * Best-effort {@link TokenCategory} from an inferred CSS syntax. Colors, lengths,
 * and times have a natural category; angles / frequencies do not, so they report
 * `null` (the caller then flags `unknown-token-category`).
 */
function categoryFromSyntax(syntax: CSSSyntax | null): TokenCategory | null {
  switch (syntax) {
    case '<color>':
      return 'color';
    case '<length>':
    case '<number>':
    case '<percentage>':
      return 'spacing';
    case '<time>':
      return 'animation';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Token schema — the per-leaf trust gate (document-graph-schema pattern)
// ---------------------------------------------------------------------------

/**
 * A single DTCG token, branded so a malformed leaf folds into a `schema/brand`
 * `DecodeIssue` (thrown `ValidationError` → issue) rather than a silent accept.
 * The struct pins the DTCG member shapes; the brand enforces the ONE semantic
 * law the shape cannot (`$value` must be present and non-null — a `null` token
 * value can be neither a scalar nor a mode map).
 */
const DtcgTokenSchema = schema.brand(
  schema.struct({
    $value: schema.unknown,
    $type: schema.optional(schema.string),
    $description: schema.optional(schema.string),
    $extensions: schema.optional(schema.unknown),
    $deprecated: schema.optional(schema.unknown),
  }),
  (tok) => {
    if (tok.$value === null || tok.$value === undefined) {
      throw ValidationError('fromDesignTokens', 'a design token must have a non-null $value');
    }
    return tok;
  },
  'DtcgToken',
);

/** The whole document must be a JSON object; a non-object is a fatal decode failure. */
const DtcgDocumentSchema = schema.record(schema.unknown);

// ---------------------------------------------------------------------------
// Structural helpers
// ---------------------------------------------------------------------------

/** Any non-null, non-array object — a DTCG group or token node. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A token node is a plain object carrying an OWN `$value` key. */
function isTokenNode(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && Object.hasOwn(value, '$value');
}

/** An alias reference (`{group.token}`) or a `calc()` expression can't be lowered losslessly. */
function isLossyValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  return /^\{.+\}$/.test(s) || s.includes('calc(');
}

/** Capitalize a variant label (`dark` → `Dark`). */
function labelOf(variant: string): string {
  return variant.length === 0 ? variant : variant[0]!.toUpperCase() + variant.slice(1);
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Lower a W3C / DTCG design-token document into `@liteship/core` definitions.
 *
 * Produces one `defineToken` per plain token (name = the dotted group path),
 * and at most one `defineTheme` collecting every mode token (a token whose
 * `$value` is keyed by the configured mode set). Never emits boundaries (there is
 * no dimensional signal in a token document). Every lossy / dropped / incomplete
 * construct is recorded as a {@link MigrationDiagnostic} instead of throwing.
 *
 * @example
 * ```ts
 * const { tokens } = fromDesignTokens({
 *   color: { primary: { $type: 'color', $value: '#0066cc' } },
 *   space: { sm: { $type: 'dimension', $value: '8px' } },
 * });
 * // tokens[0].name === 'color.primary'; tokens[0].category === 'color'
 * // tokens[1].name === 'space.sm';      tokens[1].category === 'spacing'
 * ```
 */
export function fromDesignTokens(json: unknown, options?: FromDesignTokensOptions): MigrationResult {
  const diagnostics: MigrationDiagnostic[] = [];
  const tokens: Token[] = [];
  const themes: Theme[] = [];

  const modeSet = options?.modes && options.modes.length > 0 ? options.modes : DEFAULT_MODES;
  const modeKeys = new Set(modeSet);
  const themeName = options?.themeName ?? DEFAULT_THEME_NAME;

  // -------------------------------------------------------------------------
  // Trust gate: the whole document must be a JSON object. A non-object input is
  // fatal — fold the DecodeIssue[] into a ParseError and bail (malformed-input).
  // -------------------------------------------------------------------------
  const decoded = decode(DtcgDocumentSchema, json);
  if (!decoded.ok) {
    const parseErr = parseErrorFromIssues(decoded.error, 'fromDesignTokens');
    diagnostics.push(
      makeMigrationDiagnostic(MIGRATE_CODES.malformedInput, parseErr.message, {
        severity: 'error',
        cause: parseErr,
      }),
    );
    return { boundaries: [], tokens, themes, diagnostics };
  }

  // Theme accumulation — one defineTheme for every mode token in the document.
  const themeTokens: Record<string, Record<string, unknown>> = {};
  let sawModeToken = false;

  const flagLossy = (value: unknown, path: readonly string[]): void => {
    if (isLossyValue(value)) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.lossyTokenConversion,
          `Token "${path.join('.')}" value ${stringifyCSSValue(value)} is an alias/calc reference kept verbatim (not resolvable at migration time).`,
          { path },
        ),
      );
    }
  };

  /** Classify a plain (non-mode) token's category, flagging `unknown-token-category` when it can't. */
  const resolveCategory = (type: string | undefined, value: unknown, path: readonly string[]): TokenCategory => {
    if (type !== undefined && Object.hasOwn(DTCG_TYPE_TO_CATEGORY, type)) {
      return DTCG_TYPE_TO_CATEGORY[type]!;
    }
    const category = categoryFromSyntax(inferSyntax(stringifyCSSValue(value)));
    if (category !== null) return category;
    diagnostics.push(
      makeMigrationDiagnostic(
        MIGRATE_CODES.unknownTokenCategory,
        `Token "${path.join('.')}" value ${stringifyCSSValue(value)} has no recognizable CSS syntax and ${
          type !== undefined ? `$type "${type}" is not a known category` : 'declares no $type'
        }; defaulting to "effect".`,
        { path },
      ),
    );
    return 'effect';
  };

  /** A mode token → one theme entry, cross-filled to completeness across `modeSet`. */
  const processModeToken = (value: Record<string, unknown>, name: string, path: readonly string[]): void => {
    // Collect the modes actually present (own key, non-null value).
    const present: Record<string, unknown> = {};
    for (const mode of modeSet) {
      if (Object.hasOwn(value, mode) && value[mode] !== null && value[mode] !== undefined) {
        present[mode] = value[mode];
      }
    }
    const presentModes = Object.keys(present);
    if (presentModes.length === 0) {
      // No usable value in any mode — cannot cross-fill; drop the entry so the
      // rest of the theme stays constructible.
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.incompleteThemeVariant,
          `Mode token "${name}" has no value for any of [${modeSet.join(', ')}]; dropped from the theme.`,
          { path, severity: 'error' },
        ),
      );
      return;
    }

    const fallback = present[presentModes[0]!];
    const perVariant: Record<string, unknown> = {};
    for (const mode of modeSet) {
      if (mode in present) {
        perVariant[mode] = present[mode];
        flagLossy(present[mode], [...path, mode]);
      } else {
        perVariant[mode] = fallback;
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.incompleteThemeVariant,
            `Mode token "${name}" is missing a value for mode "${mode}"; reused "${presentModes[0]}" to keep the theme complete.`,
            { path: [...path, mode] },
          ),
        );
      }
    }
    themeTokens[name] = perVariant;
    sawModeToken = true;
  };

  /** A plain token → one defineToken (constructor is the validation gate). */
  const processPlainToken = (value: unknown, type: string | undefined, name: string, path: readonly string[]): void => {
    const category = resolveCategory(type, value, path);
    flagLossy(value, path);
    try {
      tokens.push(defineToken({ name, category, value }));
    } catch (e) {
      if (!hasTag(e, 'ValidationError')) throw e;
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.malformedInput,
          `Token "${name}" could not be constructed: ${(e as { detail?: string }).detail ?? String(e)}`,
          { path, severity: 'error', cause: e },
        ),
      );
    }
  };

  /** Decode + dispatch one leaf token, projecting decode failures into migrate diagnostics. */
  const processToken = (
    node: Record<string, unknown>,
    path: readonly string[],
    inheritedType: string | undefined,
  ): void => {
    const result = decode(DtcgTokenSchema, node);
    if (!result.ok) {
      // Project each DecodeIssue → a migrate diagnostic, keeping its path and
      // message, re-tagged under migrate/malformed-input (the token is dropped).
      for (const issue of result.error) {
        diagnostics.push(
          makeMigrationDiagnostic(MIGRATE_CODES.malformedInput, issue.message, {
            path: [...path, ...issue.path],
            severity: 'error',
            ...(issue.cause !== undefined ? { cause: issue.cause } : {}),
          }),
        );
      }
      return;
    }

    const tok = result.value;
    const type = tok.$type ?? inheritedType;
    const name = path.join('.');
    const value = tok.$value;

    // A mode token: $value is an object whose keys are ALL in the mode set (so a
    // shadow/typography composite — keys `color`/`offsetX`/… — is NOT a mode map).
    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      if (keys.length > 0 && keys.every((k) => modeKeys.has(k))) {
        processModeToken(value, name, path);
        return;
      }
    }
    processPlainToken(value, type, name, path);
  };

  // -------------------------------------------------------------------------
  // Recursive walk: flatten nested groups to dotted names; a group-level $type
  // is inherited by descendant tokens lacking their own.
  // -------------------------------------------------------------------------
  const walk = (node: Record<string, unknown>, prefix: readonly string[], inheritedType: string | undefined): void => {
    for (const key of Object.keys(node)) {
      if (key.startsWith('$')) continue; // DTCG metadata ($type/$description/$extensions/…)
      const child = node[key];
      const path = [...prefix, key];
      if (isTokenNode(child)) {
        processToken(child, path, inheritedType);
      } else if (isPlainObject(child)) {
        const groupType = typeof child.$type === 'string' ? child.$type : inheritedType;
        walk(child, path, groupType);
      } else {
        diagnostics.push(
          makeMigrationDiagnostic(
            MIGRATE_CODES.malformedInput,
            `"${path.join('.')}" is neither a token (no $value) nor a group (not an object); skipped.`,
            { path, severity: 'error' },
          ),
        );
      }
    }
  };

  const rootType =
    typeof (decoded.value as Record<string, unknown>).$type === 'string'
      ? ((decoded.value as Record<string, unknown>).$type as string)
      : undefined;
  walk(decoded.value as Record<string, unknown>, [], rootType);

  // -------------------------------------------------------------------------
  // Emit the collected mode tokens as ONE defineTheme (constructor validates
  // cross-variant completeness; cross-fill above keeps it satisfiable).
  // -------------------------------------------------------------------------
  if (sawModeToken && Object.keys(themeTokens).length > 0) {
    const meta = Object.fromEntries(
      modeSet.map((variant) => [
        variant,
        { label: labelOf(variant), mode: variant.toLowerCase().includes('dark') ? 'dark' : 'light' },
      ]),
    ) as Record<string, { readonly label: string; readonly mode: 'light' | 'dark' }>;

    try {
      themes.push(
        defineTheme({
          name: themeName,
          variants: modeSet as unknown as readonly [string, ...string[]],
          tokens: themeTokens as Record<string, Record<string, unknown>>,
          meta: meta as never,
        }),
      );
    } catch (e) {
      if (!hasTag(e, 'ValidationError')) throw e;
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.incompleteThemeVariant,
          `The migrated theme could not be constructed: ${(e as { detail?: string }).detail ?? String(e)}`,
          { path: [themeName], severity: 'error', cause: e },
        ),
      );
    }
  }

  return { boundaries: [], tokens, themes, diagnostics };
}
