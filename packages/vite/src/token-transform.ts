/**
 * `@token` CSS block parser and compiler.
 *
 * Parses custom `@token name { prop: value; ... }` blocks from CSS
 * source and compiles them into CSS custom properties plus
 * `@property` registrations using resolved `TokenDef` definitions.
 *
 * @module
 */

import type { Token } from '@liteship/core';
import { TokenCSSCompiler } from '@liteship/compiler';
import {
  normalizeCssLineEndings,
  blankCssCommentsAndStrings,
  lineOfOffset,
  parseFlatDeclarations,
} from '@liteship/compiler/parse';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Parsed `@token` block: the token to emit and any inline overrides.
 */
export interface TokenBlock {
  /** Named token (resolved against exported `TokenDef` values). */
  readonly tokenName: string;
  /** Inline overrides (`{ cssProp: value }`). */
  readonly declarations: Record<string, string>;
  /** Absolute source file path. */
  readonly sourceFile: string;
  /** 1-based line where the block begins. */
  readonly line: number;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse every `@token` block from CSS source text.
 *
 * Grammar (the block may collapse onto a single line and may sit
 * mid-line, e.g. inside compiler-re-serialized CSS):
 *
 * ```css
 * @token name {
 *   property: value;
 * }
 * ```
 *
 * At-rule markers are located on a comment- and string-blanked copy of
 * the source (same offsets) so neither commented-out blocks nor marker
 * text inside string values or data URLs ever match; declarations are
 * parsed character-by-character from the original source, so real
 * string values are preserved.
 */
export function parseTokenBlocks(css: string, sourceFile: string): readonly TokenBlock[] {
  const normalized = normalizeCssLineEndings(css);
  const blanked = blankCssCommentsAndStrings(normalized);
  const blocks: TokenBlock[] = [];

  const atRule = /@token\s+([a-zA-Z_][a-zA-Z0-9_-]*)\s*\{/g;

  let match: RegExpExecArray | null;
  while ((match = atRule.exec(blanked)) !== null) {
    const tokenName = match[1]!;
    const blockStartLine = lineOfOffset(normalized, match.index);

    const { props, end } = parseFlatDeclarations(normalized, match.index + match[0].length);

    blocks.push({ tokenName, declarations: props, sourceFile, line: blockStartLine });
    atRule.lastIndex = end;
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Compiler (delegates to @liteship/compiler TokenCSSCompiler)
// ---------------------------------------------------------------------------

/**
 * Compile a parsed {@link TokenBlock} plus a resolved `TokenDef` into
 * CSS custom property declarations. Delegates to the canonical
 * `TokenCSSCompiler` to avoid duplicating token-to-CSS logic.
 */
export function compileTokenBlock(block: TokenBlock, token: Token): string {
  const result = TokenCSSCompiler.compile(token);
  const parts: string[] = [];

  if (result.customProperties) {
    parts.push(result.customProperties);
  }
  if (result.themed) {
    parts.push(result.themed);
  }

  if (Object.keys(block.declarations).length > 0) {
    const overrides = Object.entries(block.declarations)
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join('\n');
    parts.push(`:root {\n${overrides}\n}`);
  }

  return parts.join('\n\n');
}
