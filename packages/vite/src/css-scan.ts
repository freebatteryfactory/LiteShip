/**
 * Shared character-level CSS scanning helpers for the at-rule block
 * parsers (`@token`, `@theme`, `@quantize`).
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

/**
 * Blank out block comments while preserving every newline AND every
 * character offset (non-newline comment characters become spaces).
 * Lets callers find at-rule markers without matching commented-out
 * blocks, while keeping offsets valid against the original source.
 */
export function blankCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
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
export function parseFlatDeclarations(
  css: string,
  pos: number,
  propPattern: RegExp = DEFAULT_PROP_PATTERN,
): { props: Record<string, string>; end: number } {
  const props: Record<string, string> = {};
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

    // Accumulate a full declaration: collect until `;` at paren-depth 0,
    // or until `}` that closes this block, whichever comes first.
    let declBuf = '';
    let parenDepth = 0;

    while (pos < css.length) {
      const dc = css[pos]!;

      // Skip block comments inside declaration
      if (dc === '/' && css[pos + 1] === '*') {
        pos += 2;
        while (pos < css.length - 1 && !(css[pos] === '*' && css[pos + 1] === '/')) pos++;
        pos += 2;
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

      // Semicolon at paren-depth 0 ends the declaration
      if (dc === ';' && parenDepth === 0) {
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
        props[propName] = propValue;
      }
    }
  }

  return { props, end: pos };
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
