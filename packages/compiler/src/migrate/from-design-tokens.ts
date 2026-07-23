/**
 * `migrate/from-design-tokens` — lower the explicitly supported scalar/mode
 * subset of a Design Tokens Format 2025.10 document into ordinary
 * `@liteship/core` primitives.
 *
 * The input is a Design Tokens Community Group JSON document: nested GROUPS
 * (plain objects) that bottom out in TOKENS (objects carrying a `$value`, an
 * optional `$type`, and DTCG metadata `$description`/`$extensions`/`$deprecated`).
 * The 2025.10 `$root` group token is processed as a real token and keeps `$root`
 * in its dotted path. Structured values are emitted only when the adapter has a
 * faithful scalar CSS representation; unsupported composites are refused with
 * an error diagnostic rather than leaking `[object Object]`.
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
 *  - a plain token (`$value` has a faithful scalar CSS form) → a single `defineToken`,
 *    its `TokenCategory` resolved from an explicit or inherited `$type`;
 *  - a MODE token (`$value` is an object whose keys are all in the configured
 *    mode set, default `['light', 'dark']`) → an entry in ONE emitted
 *    `defineTheme`, cross-filled to completeness (a missing mode reuses a sibling
 *    value and is flagged `incomplete-theme-variant`).
 *
 * Alias resolution and `$extends` inheritance are deliberately outside this
 * adapter's supported subset. They are refused with stable error diagnostics;
 * typeless tokens are also refused because DTCG 2025.10 forbids guessing a type
 * from value syntax.
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
import { stringifyCSSValue } from '../css-utils.js';
import type { MigrationDiagnostic, MigrationResult } from './types.js';
import { makeMigrationDiagnostic, MIGRATE_CODES } from './diagnostics.js';

/** The exact Design Tokens Format revision this adapter implements. */
export const DTCG_FORMAT_VERSION = '2025.10' as const;

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
 * and recognized legacy categories fold onto the seven-category LiteShip
 * vocabulary when their value has a faithful scalar CSS representation.
 * Structured composites are still refused before token construction. A `$type`
 * outside this table is treated as absent (best-effort classification via
 * {@link inferSyntax} takes over).
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
  number: 'effect',
};

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
  return /^\{.+\}$/.test(s) || s.toLowerCase().includes('calc(');
}

type LoweredDtcgValue =
  { readonly ok: true; readonly value: string | number } | { readonly ok: false; readonly reason: string };

const FONT_WEIGHT_NAMES = new Set([
  'thin',
  'hairline',
  'extra-light',
  'ultra-light',
  'light',
  'normal',
  'regular',
  'book',
  'medium',
  'semi-bold',
  'demi-bold',
  'bold',
  'extra-bold',
  'ultra-bold',
  'black',
  'heavy',
  'extra-black',
  'ultra-black',
]);

/** Validate one supported DTCG 2025.10 scalar and lower it to faithful CSS. */
function lowerDtcgValue(value: unknown, type: string): LoweredDtcgValue {
  if (type === 'fontFamily') {
    if (typeof value === 'string' && value.length > 0) return { ok: true, value };
    if (
      !Array.isArray(value) ||
      value.length === 0 ||
      !value.every((part) => typeof part === 'string' && part.length > 0)
    ) {
      return { ok: false, reason: 'fontFamily requires a non-empty font name or non-empty array of font names' };
    }
    const generics = new Set([
      'serif',
      'sans-serif',
      'monospace',
      'cursive',
      'fantasy',
      'system-ui',
      'ui-serif',
      'ui-sans-serif',
      'ui-monospace',
      'ui-rounded',
      'emoji',
      'math',
      'fangsong',
    ]);
    return {
      ok: true,
      value: value.map((part) => (generics.has(part.toLowerCase()) ? part : JSON.stringify(part))).join(', '),
    };
  }
  if (type === 'fontWeight') {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 1000) {
      return { ok: true, value };
    }
    if (typeof value === 'string' && FONT_WEIGHT_NAMES.has(value)) return { ok: true, value };
    return { ok: false, reason: 'fontWeight requires a number in [1, 1000] or an exact DTCG font-weight name' };
  }
  if (type === 'cubicBezier') {
    if (
      !Array.isArray(value) ||
      value.length !== 4 ||
      !value.every((part) => typeof part === 'number' && Number.isFinite(part)) ||
      (value[0] as number) < 0 ||
      (value[0] as number) > 1 ||
      (value[2] as number) < 0 ||
      (value[2] as number) > 1
    ) {
      return { ok: false, reason: 'cubicBezier requires four finite numbers with both x coordinates in [0, 1]' };
    }
    return { ok: true, value: `cubic-bezier(${value.join(', ')})` };
  }
  if (type === 'number') {
    return typeof value === 'number' && Number.isFinite(value)
      ? { ok: true, value }
      : { ok: false, reason: 'number requires a finite JSON number' };
  }
  if (type === 'dimension' || type === 'duration') {
    const units = type === 'dimension' ? new Set(['px', 'rem']) : new Set(['ms', 's']);
    if (
      !isPlainObject(value) ||
      typeof value['value'] !== 'number' ||
      !Number.isFinite(value['value']) ||
      typeof value['unit'] !== 'string' ||
      !units.has(value['unit'])
    ) {
      return { ok: false, reason: `${type} requires { value: finite number, unit: ${[...units].join('|')} }` };
    }
    return { ok: true, value: `${value['value']}${value['unit']}` };
  }
  if (type === 'color') {
    if (
      !isPlainObject(value) ||
      typeof value['colorSpace'] !== 'string' ||
      !Array.isArray(value['components']) ||
      value['components'].length !== 3 ||
      !value['components'].every(
        (component) => (typeof component === 'number' && Number.isFinite(component)) || component === 'none',
      )
    ) {
      return { ok: false, reason: 'color requires a structured colorSpace/components value' };
    }
    const colorFunctionSpaces = new Set([
      'srgb',
      'srgb-linear',
      'display-p3',
      'a98-rgb',
      'prophoto-rgb',
      'rec2020',
      'xyz-d50',
      'xyz-d65',
    ]);
    const colorSpace = value['colorSpace'].toLowerCase();
    const alpha = value['alpha'];
    if (!colorFunctionSpaces.has(colorSpace)) return { ok: false, reason: `unsupported color space "${colorSpace}"` };
    if (
      alpha !== undefined &&
      alpha !== 'none' &&
      (typeof alpha !== 'number' || !Number.isFinite(alpha) || alpha < 0 || alpha > 1)
    ) {
      return { ok: false, reason: 'color alpha must be "none" or a finite number in [0, 1]' };
    }
    const hex = value['hex'];
    if (hex !== undefined && (typeof hex !== 'string' || !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(hex))) {
      return { ok: false, reason: 'color hex fallback must be a 6- or 8-digit hexadecimal color' };
    }
    return {
      ok: true,
      value:
        typeof hex === 'string'
          ? hex
          : `color(${colorSpace} ${value['components'].join(' ')}${alpha === undefined ? '' : ` / ${alpha}`})`,
    };
  }
  return { ok: false, reason: `${type} is not in the adapter's supported scalar DTCG subset` };
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
 *   color: { primary: { $type: 'color', $value: { colorSpace: 'srgb', components: [0, .4, .8] } } },
 *   space: { sm: { $type: 'dimension', $value: { value: 8, unit: 'px' } } },
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

  const refuseUnresolvedValue = (value: unknown, path: readonly string[]): boolean => {
    if (isLossyValue(value)) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.lossyTokenConversion,
          `Token "${path.join('.')}" value ${stringifyCSSValue(value)} is an alias/calc reference that this DTCG ${DTCG_FORMAT_VERSION} migration subset cannot resolve; the token was refused.`,
          { path, severity: 'error' },
        ),
      );
      return true;
    }
    return false;
  };

  /** Resolve the already-validated explicit/inherited DTCG type to its LiteShip category. */
  const resolveCategory = (type: string): TokenCategory => DTCG_TYPE_TO_CATEGORY[type]!;

  /**
   * Validate and lower one mode value using the same type-specific DTCG 2025.10
   * rules as a plain token. Invalid values refuse the complete mode token.
   */
  const toModeCssValue = (
    value: unknown,
    type: string | undefined,
    name: string,
    valuePath: readonly string[],
  ): { readonly ok: true; readonly value: unknown } | { readonly ok: false } => {
    const lowered =
      type === undefined ? { ok: false as const, reason: 'missing DTCG type' } : lowerDtcgValue(value, type);
    if (lowered.ok) return lowered;
    const code =
      type === 'shadow' || type === 'typography' || type === 'borderRadius'
        ? MIGRATE_CODES.lossyTokenConversion
        : MIGRATE_CODES.malformedInput;
    diagnostics.push(
      makeMigrationDiagnostic(
        code,
        `Token "${name}" has a value incompatible with DTCG ${DTCG_FORMAT_VERSION} type "${type ?? '(missing)'}": ${lowered.reason}; the token was refused.`,
        { path: valuePath, severity: 'error' },
      ),
    );
    return { ok: false };
  };

  /** A mode token → one theme entry, cross-filled to completeness across `modeSet`. */
  const processModeToken = (
    value: Record<string, unknown>,
    type: string,
    name: string,
    path: readonly string[],
  ): void => {
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

    // Serialize each present mode value the SAME way the plain-token path does
    // (scalar structured → CSS string; composite → refused with an error) and flag
    // alias/calc verbatim values, BEFORE cross-filling — otherwise a structured
    // scalar mode value ({value,unit}) would reach the compiler as `[object Object]`.
    const converted: Record<string, unknown> = {};
    for (const mode of presentModes) {
      if (refuseUnresolvedValue(present[mode], [...path, mode])) return;
      const conversion = toModeCssValue(present[mode], type, name, [...path, mode]);
      if (!conversion.ok) return;
      converted[mode] = conversion.value;
    }

    const fallback = converted[presentModes[0]!];
    const perVariant: Record<string, unknown> = {};
    for (const mode of modeSet) {
      if (mode in converted) {
        perVariant[mode] = converted[mode];
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
  const processPlainToken = (value: unknown, type: string, name: string, path: readonly string[]): void => {
    if (refuseUnresolvedValue(value, path)) return;
    const category = resolveCategory(type);
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
    if (Object.hasOwn(node, '$extends')) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `DTCG ${DTCG_FORMAT_VERSION} token "${path.join('.')}" uses $extends, which is not valid token syntax in this migration subset; the token was refused.`,
          { path: [...path, '$extends'], severity: 'error' },
        ),
      );
      return;
    }
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

    if (type === undefined) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unknownTokenCategory,
          `Token "${name}" declares no $type and inherits none; DTCG ${DTCG_FORMAT_VERSION} forbids guessing the type from its value, so the token was refused.`,
          { path, severity: 'error' },
        ),
      );
      return;
    }
    if (!Object.hasOwn(DTCG_TYPE_TO_CATEGORY, type)) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unknownTokenCategory,
          `Token "${name}" declares unsupported DTCG ${DTCG_FORMAT_VERSION} $type "${type}"; the token was refused rather than guessed.`,
          { path, severity: 'error' },
        ),
      );
      return;
    }

    if (refuseUnresolvedValue(value, path)) return;

    // A mode token: $value is an object whose keys are ALL in the mode set (so a
    // shadow/typography composite — keys `color`/`offsetX`/… — is NOT a mode map).
    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      if (keys.length > 0 && keys.every((k) => modeKeys.has(k))) {
        processModeToken(value, type, name, path);
        return;
      }
    }
    const lowered = lowerDtcgValue(value, type);
    if (!lowered.ok) {
      const code =
        type === 'shadow' || type === 'typography' || type === 'borderRadius'
          ? MIGRATE_CODES.lossyTokenConversion
          : MIGRATE_CODES.malformedInput;
      diagnostics.push(
        makeMigrationDiagnostic(
          code,
          `Token "${name}" has a value incompatible with DTCG ${DTCG_FORMAT_VERSION} type "${type}": ${lowered.reason}; the token was refused.`,
          { path, severity: 'error' },
        ),
      );
      return;
    }
    processPlainToken(lowered.value, type, name, path);
  };

  // -------------------------------------------------------------------------
  // Recursive walk: flatten nested groups to dotted names; a group-level $type
  // is inherited by descendant tokens lacking their own.
  // -------------------------------------------------------------------------
  const walk = (node: Record<string, unknown>, prefix: readonly string[], inheritedType: string | undefined): void => {
    if (Object.hasOwn(node, '$extends')) {
      diagnostics.push(
        makeMigrationDiagnostic(
          MIGRATE_CODES.unsupportedAtRule,
          `DTCG ${DTCG_FORMAT_VERSION} group "${prefix.join('.') || '(root)'}" uses $extends, which this migration subset does not resolve; the group was refused.`,
          { path: [...prefix, '$extends'], severity: 'error' },
        ),
      );
      return;
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      const path = [...prefix, key];
      // DTCG 2025.10 reserves `$root` as a real token name inside a group. It is
      // included in the path (`color.accent.$root`) to stay unambiguous.
      if (key === '$root') {
        if (isTokenNode(child)) {
          processToken(child, path, inheritedType);
        } else {
          diagnostics.push(
            makeMigrationDiagnostic(
              MIGRATE_CODES.malformedInput,
              `DTCG ${DTCG_FORMAT_VERSION} root token "${path.join('.')}" must be an object with a $value; skipped.`,
              { path, severity: 'error' },
            ),
          );
        }
        continue;
      }
      if (key.startsWith('$')) continue; // DTCG group metadata ($type/$description/$extensions/…)
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
    try {
      themes.push(
        defineTheme({
          name: themeName,
          variants: modeSet as unknown as readonly [string, ...string[]],
          tokens: themeTokens as Record<string, Record<string, unknown>>,
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
