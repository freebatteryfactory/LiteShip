/**
 * `@quantize` CSS block parser and compiler.
 *
 * Parses custom `@quantize boundaryName { state { prop: value } }` blocks
 * from CSS source and compiles them into native `@container` queries using
 * resolved `BoundaryDef` thresholds.
 *
 * @module
 */

import { Diagnostics, type Boundary } from '@czap/core';
import { CSSCompiler, type CSSRule, type CSSStateInput } from '@czap/compiler';
import { normalizeCssLineEndings } from './normalize-css-eol.js';
import {
  blankCssCommentsAndStrings,
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
 * The parsed body of one `@quantize` state: bare declarations that apply
 * to the boundary element selector (the documented flat form) plus
 * nested per-selector rules (the adaptive per-element form).
 */
export interface QuantizeStateBody {
  /** Declarations written directly inside the state (flat form). */
  readonly bareProps: Record<string, string>;
  /** Nested `<selector> { ... }` rules written inside the state. */
  readonly rules: readonly QuantizeNestedRule[];
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
      return { body: { bareProps, rules }, end: pos };
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
      const { props, end } = parseFlatDeclarations(css, pos);
      pos = end;
      if (selector.length > 0) {
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

  return { body: { bareProps, rules }, end: pos };
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

  let match: RegExpExecArray | null;
  while ((match = atRule.exec(blanked)) !== null) {
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
    // re-matched as new at-rules.
    atRule.lastIndex = pos;
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
 * Whether the boundary measures the viewport WIDTH — the only signal the
 * auto-emitted `:root` containment can honestly serve: containment is
 * `container-type: inline-size` (inline size = width) and the compiler
 * serializes thresholds as `(width ...)` queries. `viewport.height` must
 * NOT match: width-based containment plus width queries would make height
 * breakpoints silently track the wrong dimension.
 */
function isWidthViewportInput(input: string): boolean {
  return input === 'viewport' || input === 'viewport.width';
}

/**
 * Build the single `:root` containment rule for a sheet's viewport-based
 * boundaries: `container-type: inline-size` plus every collected
 * container name in CSS's space-separated multi-name form, so each
 * compiled `@container <name> (...)` query finds its container.
 *
 * Returns `null` when no viewport container names were collected
 * (non-viewport boundaries declare their own containers; see the
 * `container-not-declared` diagnostic).
 */
export function viewportContainmentRule(names: Iterable<string>): string | null {
  const unique = [...new Set(names)];
  if (unique.length === 0) return null;
  return `:root {\n  container-type: inline-size;\n  container-name: ${unique.join(' ')};\n}`;
}

/**
 * Account for the containment a block's compiled queries need: a
 * `@container <name> (...)` query only fires inside an ancestor that
 * declares `container-type` and a matching `container-name` — nothing
 * in the runtime emits one.
 *
 * For `viewport.*` boundaries the root element is the natural container
 * (its inline size IS the viewport width), so the container name is
 * recorded on the sheet context (aggregated emission) or returned as a
 * standalone `:root` rule (no context). For other inputs there is no
 * element the compiler can safely claim as the container, so a
 * {@link Diagnostics.warn} teaches the literal declaration to add.
 */
function containmentRule(block: QuantizeBlock, boundary: Boundary.Shape, sheet?: QuantizeSheetContext): string | null {
  const containerName = containerNameOf(boundary);

  if (isWidthViewportInput(boundary.input)) {
    if (sheet) {
      sheet.viewportContainerNames.add(containerName);
      return null; // caller emits the aggregated rule once per sheet
    }
    return viewportContainmentRule([containerName]);
  }

  if (boundary.input.startsWith('viewport.')) {
    // viewport.height (or any non-width viewport axis): the compiled
    // queries are width-based and `container-type: inline-size` measures
    // width, so auto-containment would silently track the wrong dimension.
    Diagnostics.warn({
      source: 'czap/vite.css-quantize',
      code: 'container-not-declared',
      message:
        `@quantize ${block.boundaryName} (${block.sourceFile}:${block.line}) measures "${boundary.input}", ` +
        `but compiled \`@container\` queries are width-based today — auto-declaring a container would make ` +
        `these breakpoints track the viewport WIDTH, not the height. ` +
        `Fix: use the runtime satellite path for height-driven styling ` +
        `(satelliteAttrs({ boundary }) + [data-czap-state="..."] selectors), ` +
        `or re-author the boundary on viewport.width.`,
      detail: { sourceFile: block.sourceFile, line: block.line, input: boundary.input },
    });
    return null;
  }

  Diagnostics.warn({
    source: 'czap/vite.css-quantize',
    code: 'container-not-declared',
    message:
      `@quantize ${block.boundaryName} (${block.sourceFile}:${block.line}) compiles to ` +
      `\`@container ${containerName} (...)\` queries, but boundary input "${boundary.input}" is not viewport-based, ` +
      `so no element was auto-declared as the query container and the compiled rules will match nothing. ` +
      `Fix: declare \`container-type: inline-size; container-name: ${containerName};\` on the ancestor element ` +
      `whose size the boundary measures.`,
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
