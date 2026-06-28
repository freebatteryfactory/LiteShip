/**
 * `@quantize` CSS block parser and compiler.
 *
 * Parses custom `@quantize boundaryName { state { prop: value } }` blocks
 * from CSS source and compiles them into native `@container` queries using
 * resolved `BoundaryDef` thresholds.
 *
 * @module
 */

import { Diagnostics, inputToSource, type Boundary } from '@czap/core';
import { CSSCompiler, type CSSRule, type CSSStateInput } from '@czap/compiler';
import { normalizeCssLineEndings } from './normalize-css-eol.js';
import {
  blankCssCommentsAndStrings,
  braceDepthDelta,
  lineOfOffset,
  parseFlatDeclarations,
  skipSegment,
  skipWsAndComments,
} from './css-scan.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A nested rule inside a `@quantize` state: a CSS selector plus the
 * property map applied to it when the state is active.
 */
export interface QuantizeNestedRule {
  /** CSS selector exactly as authored (e.g. `.grid`, `.hero__title`). */
  readonly selector: string;
  /** `{ cssProp: value }` declarations inside the nested rule. */
  readonly props: Record<string, string>;
}

/**
 * The non-CSS cast targets authored as nested `@<target> { … }` segments
 * inside a `@quantize` state. Each is a sibling of the CSS body
 * (`bareProps` / `rules`) and routes through its own compiler arm in the
 * build cast loop:
 *
 * - `aria` — `aria-*` / `role` attributes → `ARIACompiler`.
 * - `glsl` — numeric GLSL uniforms → `GLSLCompiler`.
 * - `wgsl` — numeric WGSL uniforms → `WGSLCompiler`.
 *
 * The marker name (`@aria` / `@glsl` / `@wgsl`) names the target; the nested
 * declarations are that target's per-state attribute/uniform map.
 */
export type CastTarget = 'aria' | 'glsl' | 'wgsl';

/** Ordered cast targets parsed from `@<target> { … }` segments. */
export const CAST_TARGETS: readonly CastTarget[] = ['aria', 'glsl', 'wgsl'];

/**
 * Accepted attribute/uniform key pattern inside a cast segment. Broader than
 * the CSS property-name pattern: allows underscores (GLSL/WGSL uniform names
 * are snake_case) alongside the hyphenated `aria-*` keys. The target's compiler
 * arm validates/coerces the keys it actually accepts downstream.
 */
const CAST_PROP_PATTERN = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;

/** True when `marker` (e.g. `@glsl`) names a cast target; narrows to it. */
function castTargetOf(marker: string): CastTarget | null {
  const name = marker.slice(1);
  return (CAST_TARGETS as readonly string[]).includes(name) ? (name as CastTarget) : null;
}

/**
 * The parsed body of one `@quantize` state: bare declarations that apply
 * to the boundary element selector (the documented flat form) plus
 * nested per-selector rules (the adaptive per-element form).
 */
export interface QuantizeStateBody {
  /** Declarations written directly inside the state (flat form). */
  readonly bareProps: Record<string, string>;
  /** Nested `<selector> { ... }` rules written inside the state. */
  readonly rules: readonly QuantizeNestedRule[];
  /**
   * Authored per-state non-CSS cast attributes, keyed by cast target. Each
   * entry holds the raw `{ key: value }` declarations from a nested
   * `@<target> { … }` segment (quotes stripped). Generalized from the
   * original `@aria`-only form so adding a cast target is a registration in
   * {@link CAST_TARGETS}, not a new field. Targets the state did not author
   * are absent; the field itself is absent when no cast segment was authored.
   *
   * Downstream each target routes through its compiler arm via `dispatch`
   * (ARIA → `ARIACompiler`, GLSL → `GLSLCompiler`, WGSL → `WGSLCompiler`).
   */
  readonly castAttrs?: Partial<Record<CastTarget, Record<string, string>>>;
  /**
   * Authored per-state ARIA/data attributes from a nested `@aria { … }`
   * segment (e.g. `aria-expanded: false; role: button`). Quotes are stripped.
   * Validated downstream by `ARIACompiler` against `BoundaryAttribute.isAllowedKey`
   * (`aria-*` / `role`). Absent when the state declares no `@aria` block.
   *
   * Derived from `castAttrs.aria` and kept as a parallel field so existing
   * ARIA consumers/tests read it unchanged.
   */
  readonly ariaAttrs?: Record<string, string>;
}

/**
 * A single parsed `@quantize` block: the boundary being quantised, the
 * per-state bodies, and provenance info so HMR can emit
 * source-mapped warnings.
 */
export interface QuantizeBlock {
  /** Boundary name referenced in the at-rule preamble. */
  readonly boundaryName: string;
  /** `{ stateName: { bareProps, rules } }` mapping. */
  readonly states: Record<string, QuantizeStateBody>;
  /** Absolute path of the CSS source file. */
  readonly sourceFile: string;
  /** 1-based source line where the block begins. */
  readonly line: number;
}

// ---------------------------------------------------------------------------
// Parser helpers
// ---------------------------------------------------------------------------

/**
 * Parse the full body of a state block starting at `pos` (the character
 * immediately after the opening `{` of the state block).
 *
 * The body may interleave two segment kinds:
 *
 * - bare declarations (`prop: value;`) collected into `bareProps`
 * - nested rules (`<selector> { prop: value; }`) collected into `rules`,
 *   their inner declarations parsed with the shared flat-declaration scanner
 *
 * Segments are gathered character-by-character until a `{` (nested rule
 * opens), `;` (declaration ends), or `}` (state closes) at paren depth 0;
 * the trailing `{` is what disambiguates a selector from a malformed
 * declaration. Quoted strings, block comments, and functional notation
 * (`var()`, `calc()`, ...) are skipped so delimiters inside them never
 * terminate a segment.
 *
 * Returns the parsed body and the position immediately after the closing
 * `}` of the state block.
 */
function parseStateBody(css: string, pos: number): { body: QuantizeStateBody; end: number } {
  const bareProps: Record<string, string> = {};
  const rules: QuantizeNestedRule[] = [];
  // Per-target cast attribute maps, populated lazily as `@<target> { … }`
  // segments are parsed. `aria` is mirrored onto the parallel `ariaAttrs`
  // field below so existing ARIA consumers stay unchanged.
  const castAttrs: Partial<Record<CastTarget, Record<string, string>>> = {};

  // Assemble the body, omitting `castAttrs` / `ariaAttrs` entirely when no
  // cast segment was authored (keeps the common shape minimal and stable for
  // snapshots). `ariaAttrs` is derived from `castAttrs.aria`.
  const makeBody = (): QuantizeStateBody => {
    const hasCasts = Object.keys(castAttrs).length > 0;
    if (!hasCasts) return { bareProps, rules };
    return castAttrs.aria
      ? { bareProps, rules, castAttrs, ariaAttrs: castAttrs.aria }
      : { bareProps, rules, castAttrs };
  };

  while (pos < css.length) {
    // Skip whitespace between segments
    while (pos < css.length && /\s/.test(css[pos]!)) pos++;
    if (pos >= css.length) break;

    const ch = css[pos]!;

    // Skip block comments
    if (ch === '/' && css[pos + 1] === '*') {
      pos += 2;
      while (pos < css.length - 1 && !(css[pos] === '*' && css[pos + 1] === '/')) pos++;
      pos += 2;
      continue;
    }

    // Closing brace of the state block
    if (ch === '}') {
      pos++;
      return { body: makeBody(), end: pos };
    }

    // Collect one segment until `{`, `;`, or `}` at paren depth 0.
    let buf = '';
    let parenDepth = 0;
    let terminator = '';

    while (pos < css.length) {
      const sc = css[pos]!;

      // A block comment inside the segment is WHITESPACE per CSS —
      // dropping it outright would fuse adjacent value tokens.
      if (sc === '/' && css[pos + 1] === '*') {
        pos += 2;
        while (pos < css.length - 1 && !(css[pos] === '*' && css[pos + 1] === '/')) pos++;
        pos += 2;
        buf += ' ';
        continue;
      }

      // Skip quoted strings
      if (sc === '"' || sc === "'") {
        const quote = sc;
        buf += sc;
        pos++;
        while (pos < css.length && css[pos] !== quote) {
          if (css[pos] === '\\') {
            buf += css[pos]!;
            pos++;
          }
          buf += css[pos] ?? '';
          pos++;
        }
        if (pos < css.length) {
          buf += css[pos]!;
          pos++;
        }
        continue;
      }

      if (sc === '(') {
        parenDepth++;
        buf += sc;
        pos++;
        continue;
      }
      if (sc === ')') {
        parenDepth--;
        buf += sc;
        pos++;
        continue;
      }

      if (parenDepth === 0 && sc === '{' && /^\s*--[^:{};]*:/.test(buf)) {
        // A custom-property declaration taking a block-token value
        // (`--theme: { color: red; };`) — only `--*` properties may hold
        // block values in CSS, while selectors (which can contain `:` via
        // pseudo-classes) never start with `--`. Consume the balanced
        // block into the declaration instead of opening a nested rule,
        // skipping braces inside comments and quoted strings (a literal
        // `content: "}"` must not close the block early).
        let blockDepth = 0;
        while (pos < css.length) {
          const bc = css[pos]!;
          if (bc === '/' && css[pos + 1] === '*') {
            while (pos < css.length - 1 && !(css[pos] === '*' && css[pos + 1] === '/')) {
              buf += css[pos]!;
              pos++;
            }
            buf += css[pos] ?? '';
            buf += css[pos + 1] ?? '';
            pos += 2;
            continue;
          }
          if (bc === '"' || bc === "'") {
            buf += bc;
            pos++;
            while (pos < css.length && css[pos] !== bc) {
              if (css[pos] === '\\') {
                buf += css[pos]!;
                pos++;
              }
              buf += css[pos] ?? '';
              pos++;
            }
            buf += css[pos] ?? '';
            pos++;
            continue;
          }
          buf += bc;
          if (bc === '{') blockDepth++;
          if (bc === '}') {
            blockDepth--;
            if (blockDepth === 0) {
              pos++;
              break;
            }
          }
          pos++;
        }
        continue;
      }

      if (parenDepth === 0 && (sc === '{' || sc === ';' || sc === '}')) {
        terminator = sc;
        break;
      }

      buf += sc;
      pos++;
    }

    // `<selector> {` opens a nested rule whose body holds flat declarations.
    if (terminator === '{') {
      const selector = buf.trim();
      pos++; // consume '{'
      const target = selector.startsWith('@') ? castTargetOf(selector) : null;
      // Cast segments carry attribute/uniform keys, not CSS properties: GLSL
      // and WGSL uniform names are snake_case (underscores), and `aria-*` keys
      // are hyphenated. Accept that broader identifier shape so the default
      // CSS property-name pattern (no underscores) does not silently drop
      // `blur_radius`-style uniforms. CSS nested rules keep the default.
      const { props, end } = parseFlatDeclarations(css, pos, target ? CAST_PROP_PATTERN : undefined);
      pos = end;
      if (target) {
        // Authored per-state cast attributes for one target. Strip surrounding
        // quotes so `role: "button"` and `aria-expanded: false` (and numeric
        // GLSL/WGSL uniform values) all yield clean values; the target's
        // compiler arm coerces/validates downstream.
        const bucket = (castAttrs[target] ??= {});
        for (const [k, v] of Object.entries(props)) {
          bucket[k] = v.replace(/^["']|["']$/g, '');
        }
      } else if (selector.length > 0) {
        rules.push({ selector, props });
      }
      continue;
    }

    if (terminator === ';') pos++; // consume ';' (`}` is handled at the loop top)

    const decl = buf.trim();
    if (decl.length === 0) continue;

    // Match `property-name: value` (property names are [a-zA-Z-][a-zA-Z0-9-]*)
    const colonIdx = decl.indexOf(':');
    if (colonIdx > 0) {
      const propName = decl.slice(0, colonIdx).trim();
      const propValue = decl.slice(colonIdx + 1).trim();
      if (/^[a-zA-Z-][a-zA-Z0-9-]*$/.test(propName) && propValue.length > 0) {
        bareProps[propName] = propValue;
      }
    }
  }

  return { body: makeBody(), end: pos };
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse every `@quantize` block from CSS source text.
 *
 * Grammar (states accept bare declarations, nested selector rules, or
 * both):
 *
 * ```css
 * @quantize boundaryName {
 *   stateName {
 *     property: value;
 *     .selector {
 *       property: value;
 *     }
 *   }
 * }
 * ```
 *
 * Parsing is fully character-level: upstream compilers (e.g. the Astro
 * compiler re-serializing a `<style>` block) emit at-rules mid-line and
 * collapse whole sheets onto a single line, so no line structure is
 * assumed. At-rule markers are located on a comment- and string-blanked
 * copy of the source (same offsets) so neither commented-out blocks nor
 * marker text inside string values or data URLs ever match; bodies are
 * parsed from the original source with comment / string / functional-
 * notation awareness, including multi-line values and nested
 * `<selector> { ... }` rules.
 */
export function parseQuantizeBlocks(css: string, sourceFile: string): readonly QuantizeBlock[] {
  const normalized = normalizeCssLineEndings(css);
  const blanked = blankCssCommentsAndStrings(normalized);
  const blocks: QuantizeBlock[] = [];

  const atRule = /@quantize\s+([a-zA-Z_][a-zA-Z0-9_-]*)\s*\{/g;
  const statePattern = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*\{/y;

  // Running depth from the last accepted scan position -- markers are only
  // at-rules at the sheet's top level; `@quantize name {` text inside a
  // declaration value (e.g. a custom property holding a snippet) is value
  // text, and splicing it would corrupt the surrounding declaration.
  let depthFrom = 0;
  let depth = 0;

  let match: RegExpExecArray | null;
  while ((match = atRule.exec(blanked)) !== null) {
    depth = braceDepthDelta(blanked, depthFrom, match.index, depth);
    depthFrom = match.index;
    if (depth > 0) continue;
    const boundaryName = match[1]!;
    const blockStartLine = lineOfOffset(normalized, match.index);
    const states: Record<string, QuantizeStateBody> = {};

    let pos = match.index + match[0].length;

    while (pos < normalized.length) {
      pos = skipWsAndComments(normalized, pos);
      if (pos >= normalized.length) break;

      // Closing brace of the @quantize block
      if (normalized[pos] === '}') {
        pos++;
        break;
      }

      // State block opening: `stateName {`
      statePattern.lastIndex = pos;
      const stateMatch = statePattern.exec(normalized);
      if (stateMatch) {
        const stateName = stateMatch[1]!;
        const { body, end } = parseStateBody(normalized, statePattern.lastIndex);
        states[stateName] = body;
        pos = end;
        continue;
      }

      // Anything else (nested non-state wrappers, stray declarations):
      // skip one balanced segment and keep scanning for states.
      pos = skipSegment(normalized, pos);
    }

    blocks.push({
      boundaryName,
      states,
      sourceFile,
      line: blockStartLine,
    });

    // Resume marker search after this block so state bodies are never
    // re-matched as new at-rules. The block just consumed is balanced, so
    // the depth at `pos` is the depth where it began (top level).
    atRule.lastIndex = pos;
    depthFrom = pos;
    depth = 0;
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Compiler (delegates to @czap/compiler CSSCompiler)
// ---------------------------------------------------------------------------

/**
 * Sheet-level aggregation context shared across every
 * {@link compileQuantizeBlock} call for one stylesheet.
 *
 * `container-name` is a replaced (non-accumulating) property: when two
 * viewport-based boundaries in the same sheet each emitted their own
 * `:root { container-name: X }` rule, the last rule won and the earlier
 * boundary's `@container` queries matched nothing. Aggregating the
 * names here lets the caller emit ONE `:root` rule in the
 * space-separated multi-name form
 * (`container-name: viewport-width viewport-height`) via
 * {@link viewportContainmentRule}, so every query keeps a matching
 * container.
 */
export interface QuantizeSheetContext {
  /** Viewport container names collected across the sheet's blocks. */
  readonly viewportContainerNames: Set<string>;
}

/** Sanitize a boundary input identifier into its CSS container name. */
function containerNameOf(boundary: Boundary.Shape): string {
  return boundary.input.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/**
 * The container-query axis a viewport input compiles to, or `null` when
 * the input is not a dimension the auto-emitted `:root` containment can
 * honestly serve: `viewport` / `viewport.width` compile to `(width ...)`
 * queries and `viewport.height` to `(height ...)` queries (the compiler
 * derives the same axis from the input). Any other `viewport.*` path and
 * every non-viewport input return `null` — there is no dimension query
 * that measures them.
 */
export function viewportQueryAxis(input: string): 'width' | 'height' | null {
  // Axis derived from the SOURCE OF TRUTH (inputToSource) — `viewport` and
  // `viewport.width` both normalize to axis 'width', `viewport.height' to
  // 'height'; any other input is not a viewport dimension.
  const source = inputToSource(input);
  if (source?.type !== 'viewport') return null;
  return source.axis ?? 'width';
}

/**
 * Build the single `:root` containment rule for a sheet's viewport-based
 * boundaries: a `container-type` declaration plus every collected
 * container name in CSS's space-separated multi-name form, so each
 * compiled `@container <name> (...)` query finds its container.
 *
 * Width-only sheets keep `container-type: inline-size`. The
 * `viewport-height` name — the only height-axis name the containment
 * path can collect (sanitized from `viewport.height`) — upgrades the
 * rule to `container-type: size`, because `inline-size` containment
 * leaves `(height ...)` queries unevaluable. Size containment computes
 * `:root`'s block size as if it had no content, so the rule pins it to
 * `100dvh` — the same dynamic-viewport measure the runtime's
 * `readSignalValue('viewport.height')` reads.
 *
 * Returns `null` when no viewport container names were collected
 * (non-viewport boundaries declare their own containers; see the
 * `container-not-declared` diagnostic).
 *
 * `selector` is the element the containment is declared on — `:root` by
 * default. A host whose layout can't have `:root` be a container (a
 * size-contained `:root` removes it from its parent's size calc, which a
 * fixed/absolute viewport-locked wrapper conflicts with) sets the plugin's
 * `quantize.container` to a named selector (e.g. `.czap-vp`) and is then
 * responsible for sizing that element to the viewport. Width-only sheets
 * stay `inline-size`; a `viewport-height` name upgrades to `size` + a
 * `100dvh` block-size on the chosen selector.
 */
export function viewportContainmentRule(names: Iterable<string>, selector: string = ':root'): string | null {
  const unique = [...new Set(names)];
  if (unique.length === 0) return null;
  // A blank/whitespace-only override would emit an invalid rule head — fall back
  // to `:root` rather than break the sheet's containment.
  const sel = selector.trim() === '' ? ':root' : selector;
  if (!unique.includes('viewport-height')) {
    return `${sel} {\n  container-type: inline-size;\n  container-name: ${unique.join(' ')};\n}`;
  }
  return `${sel} {\n  container-type: size;\n  block-size: 100dvh;\n  container-name: ${unique.join(' ')};\n}`;
}

/**
 * Account for the containment a block's compiled queries need: a
 * `@container <name> (...)` query only fires inside an ancestor that
 * declares `container-type` and a matching `container-name` — nothing
 * in the runtime emits one.
 *
 * For dimension-measuring viewport boundaries (width or height axis,
 * see {@link viewportQueryAxis}) the root element is the natural
 * container (its inline size IS the viewport width; its block size is
 * pinned to the viewport height by {@link viewportContainmentRule}), so
 * the container name is recorded on the sheet context (aggregated
 * emission) or returned as a standalone `:root` rule (no context). For
 * other inputs there is no element the compiler can safely claim as the
 * container, so a {@link Diagnostics.warn} teaches the literal
 * declaration to add.
 */
function containmentRule(block: QuantizeBlock, boundary: Boundary.Shape, sheet?: QuantizeSheetContext): string | null {
  const containerName = containerNameOf(boundary);

  if (viewportQueryAxis(boundary.input) !== null) {
    if (sheet) {
      sheet.viewportContainerNames.add(containerName);
      return null; // caller emits the aggregated rule once per sheet
    }
    return viewportContainmentRule([containerName]);
  }

  if (boundary.input.startsWith('viewport.')) {
    // An unrecognized viewport axis (e.g. viewport.aspect): NOT a vocabulary
    // parse — `viewportQueryAxis` already consulted the source of truth and
    // returned null above. This namespace prefix detects an AUTHORING mistake
    // inside the viewport family (a non-dimension axis) to teach a better
    // message; container queries only measure width and height, so
    // auto-containment would claim a dimension this signal does not have.
    Diagnostics.warn({
      source: 'czap/vite.css-quantize',
      code: 'container-not-declared',
      message:
        `@quantize ${block.boundaryName} (${block.sourceFile}:${block.line}) measures "${boundary.input}", ` +
        `which is not a dimension \`@container\` queries can evaluate — only viewport.width and ` +
        `viewport.height compile to (width ...) / (height ...) conditions, so no container was ` +
        `auto-declared and the compiled rules will match nothing. ` +
        `Fix: re-author the boundary on viewport.width or viewport.height, or use the runtime ` +
        `satellite path (satelliteAttrs({ boundary }) + [data-czap-state="..."] selectors).`,
      detail: { sourceFile: block.sourceFile, line: block.line, input: boundary.input },
    });
    return null;
  }

  // Mirrors the compiler's queryAxisOf inference (compiler/src/css.ts): the
  // suggested containment must be able to evaluate the axis the compiled
  // queries actually use — inline-size containment cannot evaluate the
  // (height ...) conditions a height-axis boundary compiles to.
  const heightAxis = boundary.input === 'height' || boundary.input.endsWith('.height');
  const containment = heightAxis ? 'size' : 'inline-size';
  Diagnostics.warn({
    source: 'czap/vite.css-quantize',
    code: 'container-not-declared',
    message:
      `@quantize ${block.boundaryName} (${block.sourceFile}:${block.line}) compiles to ` +
      `\`@container ${containerName} (...)\` queries, but boundary input "${boundary.input}" is not viewport-based, ` +
      `so no element was auto-declared as the query container and the compiled rules will match nothing. ` +
      `Fix: declare \`container-type: ${containment}; container-name: ${containerName};\` on the ancestor element ` +
      `whose size the boundary measures${heightAxis ? ' (size, not inline-size: the compiled (height ...) queries need block-axis containment)' : ''}.`,
    detail: { sourceFile: block.sourceFile, line: block.line, input: boundary.input },
  });
  return null;
}

/**
 * Compile a parsed {@link QuantizeBlock} plus its resolved
 * {@link Boundary.Shape} into CSS `@container` query rules. Delegates
 * to the canonical `CSSCompiler` to avoid duplicating threshold-to-query
 * logic.
 *
 * Bare declarations keep the default `.czap-boundary` selector; nested
 * rules each compile to their own selector inside the state's
 * `@container` block.
 *
 * Containment: pass a shared {@link QuantizeSheetContext} when
 * compiling multiple blocks from one stylesheet — viewport container
 * names are collected on it and the caller emits ONE aggregated `:root`
 * rule via {@link viewportContainmentRule} (`container-name` is a
 * replaced property, so per-block `:root` rules would overwrite each
 * other). Without a context, a viewport-based block inlines its own
 * `:root` rule (single-block convenience form). Non-viewport inputs
 * emit a `container-not-declared` diagnostic naming the declaration to
 * add.
 */
export function compileQuantizeBlock(
  block: QuantizeBlock,
  boundary: Boundary.Shape,
  sheet?: QuantizeSheetContext,
): string {
  const states: Record<string, CSSStateInput> = {};
  for (const [stateName, body] of Object.entries(block.states)) {
    const rules: CSSRule[] = body.rules.map((rule) => ({ selector: rule.selector, properties: rule.props }));
    states[stateName] = { bareProps: body.bareProps, rules };
  }

  const result = CSSCompiler.compile(boundary, states);
  if (result.containerRules.length === 0) {
    return CSSCompiler.serialize(result);
  }

  const containment = containmentRule(block, boundary, sheet);
  const serialized = CSSCompiler.serialize(result);
  return containment ? `${containment}\n\n${serialized}` : serialized;
}
