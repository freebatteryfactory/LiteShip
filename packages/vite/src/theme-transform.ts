/**
 * `@theme` CSS block parser and compiler.
 *
 * Parses custom `@theme name { token: value; ... }` blocks from CSS
 * source and compiles them into `html[data-theme]` selector blocks
 * plus transition declarations using resolved `ThemeDef` definitions.
 *
 * @module
 */

import type { Theme } from '@liteship/core';
import { ThemeCSSCompiler } from '@liteship/compiler';
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
 * Parsed `@theme` block: the theme to apply and any inline token
 * overrides declared on the block itself.
 */
export interface ThemeBlock {
  /** Named theme (resolved against exported `ThemeDef` values). */
  readonly themeName: string;
  /** Inline token overrides (`{ tokenName: value }`). */
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
 * Parse every `@theme` block from CSS source text.
 *
 * Grammar (the block may collapse onto a single line and may sit
 * mid-line, e.g. inside compiler-re-serialized CSS):
 *
 * ```css
 * @theme name {
 *   tokenName: value;
 * }
 * ```
 *
 * At-rule markers are located on a comment- and string-blanked copy of
 * the source (same offsets) so neither commented-out blocks nor marker
 * text inside string values or data URLs ever match; declarations are
 * parsed character-by-character from the original source, so real
 * string values are preserved. Token names additionally accept
 * underscores (e.g. `accent_color`).
 */
export function parseThemeBlocks(css: string, sourceFile: string): readonly ThemeBlock[] {
  const normalized = normalizeCssLineEndings(css);
  const blanked = blankCssCommentsAndStrings(normalized);
  const blocks: ThemeBlock[] = [];

  const atRule = /@theme\s+([a-zA-Z_][a-zA-Z0-9_-]*)\s*\{/g;
  const themePropPattern = /^[a-zA-Z-][a-zA-Z0-9_-]*$/;

  let match: RegExpExecArray | null;
  while ((match = atRule.exec(blanked)) !== null) {
    const themeName = match[1]!;
    const blockStartLine = lineOfOffset(normalized, match.index);

    const { props, end } = parseFlatDeclarations(normalized, match.index + match[0].length, themePropPattern);

    blocks.push({ themeName, declarations: props, sourceFile, line: blockStartLine });
    atRule.lastIndex = end;
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Compiler (delegates to @liteship/compiler ThemeCSSCompiler)
// ---------------------------------------------------------------------------

/**
 * Compile a parsed {@link ThemeBlock} plus a resolved `ThemeDef` into
 * `html[data-theme]` selector blocks and transition declarations.
 * Delegates to the canonical `ThemeCSSCompiler` to avoid duplicating
 * theme-to-CSS logic.
 */
export function compileThemeBlock(block: ThemeBlock, theme: Theme): string {
  const result = ThemeCSSCompiler.compile(theme);
  const parts: string[] = [];

  if (result.selectors) {
    parts.push(result.selectors);
  }
  if (result.transitions) {
    parts.push(result.transitions);
  }

  if (Object.keys(block.declarations).length > 0) {
    const overrides = Object.entries(block.declarations)
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join('\n');
    parts.push(`html {\n${overrides}\n}`);
  }

  return parts.join('\n\n');
}
