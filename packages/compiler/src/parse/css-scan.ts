/**
 * Shared character-level CSS scanning helpers for the at-rule block
 * parsers (`@token`, `@theme`, `@style`, `@quantize`).
 *
 * Real-world CSS reaching the transform pipeline is often re-serialized
 * by upstream compilers (the Astro compiler emits a whole `<style>` as a
 * single line, with at-rules mid-line and `name{` without spaces), so
 * the parsers cannot rely on line structure. These helpers scan
 * character-by-character with comment / quoted-string / functional-
 * notation awareness.
 *
 * @module
 */

import { parseCSSDeclarationValue, serializeCSSDeclarationValue, type CSSDeclarationValue } from './css-cascade.js';

/**
 * Blank out block comments, quoted-string contents, and unquoted
 * `url(...)` contents while preserving every newline AND every
 * character offset (blanked characters become spaces).
 *
 * This produces the marker-locating copy of a stylesheet: at-rule
 * markers (`@token`, `@theme`, `@style`, `@quantize`) are searched on the blanked
 * copy so neither commented-out blocks nor marker text embedded in
 * string values (`content: "@token accent {"`) nor data URLs
 * (`url(data:...@quantize...)`) ever match as real blocks. Because
 * offsets are preserved, every match index maps 1:1 back onto the
 * original source, which the body parsers then read directly — real
 * string values inside block bodies are never altered.
 *
 * A single character-level pass handles the interleavings a sequential
 * regex approach gets wrong: quote characters inside comments do not
 * open strings, and comment markers inside strings do not open comments.
 */
export function blankCssCommentsAndStrings(css: string): string {
  const out = css.split('');
  let pos = 0;

  /** Blank `out[i]` unless it is a newline (offsets + line numbers stay valid). */
  const blank = (i: number): void => {
    if (css[i] !== '\n') out[i] = ' ';
  };

  while (pos < css.length) {
    const ch = css[pos]!;

    // Block comment: blank the whole comment including its delimiters.
    if (ch === '/' && css[pos + 1] === '*') {
      const start = pos;
      pos += 2;
      while (pos < css.length - 1 && !(css[pos] === '*' && css[pos + 1] === '/')) pos++;
      pos = Math.min(pos + 2, css.length);
      for (let i = start; i < pos; i++) blank(i);
      continue;
    }

    // Quoted string: keep the quote characters, blank the contents
    // (including backslash escapes, so an escaped quote never terminates).
    if (ch === '"' || ch === "'") {
      const quote = ch;
      pos++;
      while (pos < css.length && css[pos] !== quote) {
        if (css[pos] === '\\' && pos + 1 < css.length) {
          blank(pos);
          pos++;
        }
        blank(pos);
        pos++;
      }
      pos++; // past the closing quote (kept)
      continue;
    }

    // Unquoted url(...) token: data URIs may embed at-rule text without
    // quotes. Quoted url("...") values are handled by the string branch.
    if (
      (ch === 'u' || ch === 'U') &&
      css.slice(pos, pos + 4).toLowerCase() === 'url(' &&
      !/[a-zA-Z0-9_-]/.test(css[pos - 1] ?? '')
    ) {
      pos += 4;
      let probe = pos;
      while (probe < css.length && /\s/.test(css[probe]!)) probe++;
      if (css[probe] === '"' || css[probe] === "'") continue; // quoted form
      // Unquoted url tokens cannot contain unescaped parens: blank to ')'.
      while (pos < css.length && css[pos] !== ')') {
        blank(pos);
        pos++;
      }
      continue;
    }

    pos++;
  }

  return out.join('');
}

/** 1-based line number of a character offset. */
export function lineOfOffset(css: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < css.length; i++) {
    if (css[i] === '\n') line++;
  }
  return line;
}

/** Advance past whitespace and block comments, returning the new position. */
export function skipWsAndComments(css: string, pos: number): number {
  while (pos < css.length) {
    const ch = css[pos]!;
    if (/\s/.test(ch)) {
      pos++;
      continue;
    }
    if (ch === '/' && css[pos + 1] === '*') {
      pos += 2;
      while (pos < css.length - 1 && !(css[pos] === '*' && css[pos + 1] === '/')) pos++;
      pos += 2;
      continue;
    }
    break;
  }
  return pos;
}

/**
 * Leading at-rules that must stay at the top of a stylesheet: `@charset`
 * (must be the very first thing), `@import` / `@namespace` (must precede
 * all style rules), and statement-form `@layer` (allowed between
 * imports). The trailing guard rejects longer identifiers such as
 * `@import-fake`.
 */
const PROLOGUE_AT_RULE = /@(?:charset|import|namespace|layer)(?![a-zA-Z0-9_-])/iy;

/**
 * Offset immediately after a stylesheet's leading at-rule prologue: the
 * run of `@charset`, `@import`, `@namespace`, and statement-form
 * `@layer` rules that the CSS spec requires to precede all style rules.
 * Block-form `@layer name { ... }` ends the prologue (a `{` before the
 * terminating `;`), as does any other rule or declaration.
 *
 * Pass the comment/string-blanked copy of the sheet (see
 * {@link blankCssCommentsAndStrings}) so `@import` text inside comments
 * or string values never counts as a prologue rule. Returned offsets map
 * 1:1 onto the original source.
 *
 * Used to insert generated sheet-level rules (e.g. the `:root` viewport
 * containment rule) AFTER the prologue — a style rule placed ahead of
 * `@charset` / `@import` invalidates them (browsers ignore misplaced
 * imports).
 */
export function cssPrologueEnd(blanked: string): number {
  let end = 0;
  let pos = 0;

  for (;;) {
    pos = skipWsAndComments(blanked, pos);
    PROLOGUE_AT_RULE.lastIndex = pos;
    if (PROLOGUE_AT_RULE.exec(blanked) === null) return end;

    // Scan to the rule's terminating `;` at paren depth 0. Hitting `{`
    // or `}` first means a block rule (e.g. `@layer base { ... }`) or
    // malformed input — either way the prologue is over.
    let scan = PROLOGUE_AT_RULE.lastIndex;
    let parenDepth = 0;
    let semi = -1;
    while (scan < blanked.length) {
      const ch = blanked[scan]!;
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      else if (parenDepth === 0) {
        if (ch === ';') {
          semi = scan;
          break;
        }
        if (ch === '{' || ch === '}') break;
      }
      scan++;
    }
    if (semi === -1) return end;

    pos = semi + 1;
    end = pos;
  }
}

/** Default `property-name` pattern: standard and custom CSS properties. */
const DEFAULT_PROP_PATTERN = /^[a-zA-Z-][a-zA-Z0-9-]*$/;

/**
 * Parse all flat property declarations inside a block starting at `pos`
 * (the character immediately after the opening `{`).
 *
 * Uses character-level scanning so multi-line values -- e.g.
 *   background: linear-gradient(
 *     to bottom,
 *     red,
 *     blue
 *   );
 * -- are collected as a single declaration before matching.
 *
 * Tracks paren depth so commas/semicolons inside functional notation
 * (var(), calc(), linear-gradient(), etc.) are not treated as delimiters.
 * Tracks brace depth so values containing braces (e.g. `var(--x, empty)`)
 * do not prematurely close the block. Skips block comments and quoted
 * strings (including escapes).
 *
 * @param css - Full CSS source text
 * @param pos - Position immediately after the block's opening `{`
 * @param propPattern - Override for the accepted property-name pattern
 * @returns The parsed properties and the position immediately after the
 *          closing `}` of the block.
 */
export function parseFlatDeclarationValues(
  css: string,
  pos: number,
  propPattern: RegExp = DEFAULT_PROP_PATTERN,
): { props: Record<string, CSSDeclarationValue>; end: number } {
  const props: Record<string, CSSDeclarationValue> = {};
  let braceDepth = 0;

  while (pos < css.length) {
    // Skip whitespace between declarations
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

    // Closing brace of the block
    if (ch === '}' && braceDepth === 0) {
      pos++;
      return { props, end: pos };
    }

    // Opening brace nested inside a value (e.g. var(--x, {}))
    if (ch === '{') {
      braceDepth++;
      pos++;
      continue;
    }

    if (ch === '}') {
      braceDepth--;
      pos++;
      continue;
    }

    // Accumulate a full declaration: collect until `;` at paren-depth 0
    // AND brace-depth 0, or until `}` that closes this block, whichever
    // comes first. Custom-property values may legally contain balanced
    // block tokens (`--theme: { color: red; };`) whose inner semicolons
    // must not end the declaration.
    let declBuf = '';
    let parenDepth = 0;
    let declBraceDepth = 0;

    while (pos < css.length) {
      const dc = css[pos]!;

      // A block comment inside a declaration is WHITESPACE per CSS —
      // dropping it outright would fuse adjacent tokens (`1fr/*c*/2fr`
      // must read `1fr 2fr`, not `1fr2fr`).
      if (dc === '/' && css[pos + 1] === '*') {
        pos += 2;
        while (pos < css.length - 1 && !(css[pos] === '*' && css[pos + 1] === '/')) pos++;
        pos += 2;
        declBuf += ' ';
        continue;
      }

      // Skip quoted strings
      if (dc === '"' || dc === "'") {
        const quote = dc;
        declBuf += dc;
        pos++;
        while (pos < css.length && css[pos] !== quote) {
          if (css[pos] === '\\') {
            declBuf += css[pos]!;
            pos++;
          }
          declBuf += css[pos] ?? '';
          pos++;
        }
        if (pos < css.length) {
          declBuf += css[pos]!;
          pos++;
        }
        continue;
      }

      if (dc === '(') {
        parenDepth++;
        declBuf += dc;
        pos++;
        continue;
      }
      if (dc === ')') {
        parenDepth--;
        declBuf += dc;
        pos++;
        continue;
      }

      // Balanced block token inside a value (custom properties permit
      // `{ ... }` values) — consume it as part of the declaration.
      if (dc === '{') {
        declBraceDepth++;
        declBuf += dc;
        pos++;
        continue;
      }
      if (dc === '}' && declBraceDepth > 0) {
        declBraceDepth--;
        declBuf += dc;
        pos++;
        continue;
      }

      // Semicolon at paren-depth 0 and brace-depth 0 ends the declaration
      if (dc === ';' && parenDepth === 0 && declBraceDepth === 0) {
        pos++;
        break;
      }

      // Unmatched `}` at paren-depth 0 closes the block --
      // do NOT consume it here; the outer loop will handle it.
      if (dc === '}' && parenDepth === 0) {
        break;
      }

      declBuf += dc;
      pos++;
    }

    const decl = declBuf.trim();
    if (decl.length === 0) continue;

    // Match `property-name: value`
    const colonIdx = decl.indexOf(':');
    if (colonIdx > 0) {
      const propName = decl.slice(0, colonIdx).trim();
      const propValue = decl.slice(colonIdx + 1).trim();
      if (propPattern.test(propName) && propValue.length > 0) {
        const candidate = parseCSSDeclarationValue(propValue);
        const current = props[propName];
        // Within one declaration block, importance wins before source order.
        // Equal-priority declarations retain ordinary CSS last-one-wins order.
        if (current === undefined || candidate.important || !current.important) {
          props[propName] = candidate;
        }
      }
    }
  }

  return { props, end: pos };
}

/**
 * Parse flat declarations and preserve a trailing `!important` marker in the
 * returned authored value. Call {@link parseFlatDeclarationValues} when the
 * cascade priority must be compared separately from the value.
 */
export function parseFlatDeclarations(
  css: string,
  pos: number,
  propPattern: RegExp = DEFAULT_PROP_PATTERN,
): { props: Record<string, string>; end: number } {
  const parsed = parseFlatDeclarationValues(css, pos, propPattern);
  return {
    props: Object.fromEntries(
      Object.entries(parsed.props).map(([name, declaration]) => [name, serializeCSSDeclarationValue(declaration)]),
    ),
    end: parsed.end,
  };
}

/**
 * Skip one non-declaration segment at the current position: scans until
 * `{`, `;`, or `}` at paren depth 0 (comment / string aware). A `{`
 * opens a balanced block that is skipped entirely; a `;` is consumed; a
 * `}` is left for the caller (it closes the enclosing block).
 *
 * Used to step over nested non-state wrappers (e.g. a stray `@supports`
 * block) without aborting the surrounding at-rule parse.
 */
export function skipSegment(css: string, pos: number): number {
  let parenDepth = 0;

  while (pos < css.length) {
    const ch = css[pos]!;

    if (ch === '/' && css[pos + 1] === '*') {
      pos += 2;
      while (pos < css.length - 1 && !(css[pos] === '*' && css[pos + 1] === '/')) pos++;
      pos += 2;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      pos++;
      while (pos < css.length && css[pos] !== quote) {
        if (css[pos] === '\\') pos++;
        pos++;
      }
      pos++;
      continue;
    }

    if (ch === '(') {
      parenDepth++;
      pos++;
      continue;
    }
    if (ch === ')') {
      parenDepth--;
      pos++;
      continue;
    }

    if (parenDepth === 0) {
      if (ch === ';') {
        return pos + 1;
      }
      if (ch === '}') {
        return pos; // caller handles the enclosing close
      }
      if (ch === '{') {
        // Skip the balanced block
        pos++;
        let depth = 1;
        while (pos < css.length && depth > 0) {
          const bc = css[pos]!;
          if (bc === '/' && css[pos + 1] === '*') {
            pos += 2;
            while (pos < css.length - 1 && !(css[pos] === '*' && css[pos + 1] === '/')) pos++;
            pos += 2;
            continue;
          }
          if (bc === '"' || bc === "'") {
            const quote = bc;
            pos++;
            while (pos < css.length && css[pos] !== quote) {
              if (css[pos] === '\\') pos++;
              pos++;
            }
            pos++;
            continue;
          }
          if (bc === '{') depth++;
          else if (bc === '}') depth--;
          pos++;
        }
        return pos;
      }
    }

    pos++;
  }

  return pos;
}

/**
 * Running brace depth over a blanked source range. At-rule scans use this
 * to accept `@token`/`@quantize`/`@style` markers only at the sheet's top
 * level (depth 0): a marker inside a declaration value — e.g. a custom
 * property holding a snippet, `--x: @style card { ... };` — is value text,
 * not an at-rule, and splicing it would corrupt the declaration. Callers
 * advance incrementally (`depth = braceDepthDelta(blanked, from, to, depth)`)
 * so a multi-match scan stays linear. Operates on BLANKED source: braces
 * inside comments and strings are already spaces there.
 */
export function braceDepthDelta(blanked: string, from: number, to: number, depth: number): number {
  for (let i = from; i < to; i++) {
    const ch = blanked[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  return depth;
}
