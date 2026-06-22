/**
 * The shared comment/string stripper — the honest Slice-A "is this CODE?" floor.
 *
 * A line scanner that matches a token anywhere in a source file flags its own
 * docstrings and fixture strings — exactly the false positives a qualified gate
 * must not have (a gate with a dirty green floor never earns blocking authority).
 * {@link codeOnly} blanks out comment and string-literal CONTENTS (replacing them
 * with spaces, preserving every newline so line numbers still align), leaving
 * only code for the line scanner to test.
 *
 * Every gate whose target token could appear in a comment or string imports this
 * ONE implementation — never a copy. A real per-token oracle arrives with Slice
 * B's LanguageService; this char-level state machine is the shared floor until
 * then.
 *
 * The companion {@link stringsBlanked} blanks ONLY string literals (leaving
 * comments intact) — the floor a gate whose target IS a comment directive needs:
 * a real ts-ignore directive comment survives, but the same text written inside a
 * fixture STRING vanishes, so the gate does not flag its own descriptive fixtures.
 *
 * @module
 */

/**
 * Blank out comment and string-literal CONTENTS (replace with spaces, preserving
 * every newline so line numbers still align), leaving only code. A char-level
 * state machine over the five string/comment states plus code; handles escapes
 * inside strings so a `\'` does not prematurely close a single-quoted literal.
 */
export function codeOnly(src: string): string {
  let out = '';
  type State = 'code' | 'line' | 'block' | 'single' | 'double' | 'template';
  let state: State = 'code';
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    const next = src[i + 1];
    const keep = c === '\n' ? '\n' : ' ';
    if (state === 'code') {
      if (c === '/' && next === '/') {
        state = 'line';
        out += '  ';
        i++;
        continue;
      }
      if (c === '/' && next === '*') {
        state = 'block';
        out += '  ';
        i++;
        continue;
      }
      if (c === "'") {
        state = 'single';
        out += ' ';
        continue;
      }
      if (c === '"') {
        state = 'double';
        out += ' ';
        continue;
      }
      if (c === '`') {
        state = 'template';
        out += ' ';
        continue;
      }
      out += c;
      continue;
    }
    if (state === 'line') {
      if (c === '\n') state = 'code';
      out += keep;
      continue;
    }
    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code';
        out += '  ';
        i++;
        continue;
      }
      out += keep;
      continue;
    }
    // string states (single / double / template)
    if (c === '\\') {
      out += '  ';
      i++;
      continue;
    } // escape — consume the next char too
    const closer = state === 'single' ? "'" : state === 'double' ? '"' : '`';
    if (c === closer) state = 'code';
    out += keep;
  }
  return out;
}

/**
 * Blank out string-literal CONTENTS only, leaving COMMENTS and code intact
 * (newlines preserved, so line numbers still align). The floor for a gate whose
 * target is a comment directive: scanning this lets a genuine ts-ignore directive
 * comment survive while the identical text written inside a STRING (a fixture or a
 * description) is erased — so the gate does not flag its own prose. Comments are
 * NOT blanked here (that is {@link codeOnly}'s job).
 */
export function stringsBlanked(src: string): string {
  let out = '';
  type State = 'code' | 'line' | 'block' | 'single' | 'double' | 'template';
  let state: State = 'code';
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    const next = src[i + 1];
    const keep = c === '\n' ? '\n' : ' ';
    if (state === 'code') {
      // Comments are passed THROUGH verbatim (we only blank strings here), but we
      // still enter the comment states so a string opener inside a comment is not
      // mistaken for a real string literal.
      if (c === '/' && next === '/') {
        state = 'line';
        out += '//';
        i++;
        continue;
      }
      if (c === '/' && next === '*') {
        state = 'block';
        out += '/*';
        i++;
        continue;
      }
      if (c === "'") {
        state = 'single';
        out += ' ';
        continue;
      }
      if (c === '"') {
        state = 'double';
        out += ' ';
        continue;
      }
      if (c === '`') {
        state = 'template';
        out += ' ';
        continue;
      }
      out += c;
      continue;
    }
    if (state === 'line') {
      if (c === '\n') state = 'code';
      out += c; // verbatim — comments are kept
      continue;
    }
    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code';
        out += '*/';
        i++;
        continue;
      }
      out += c; // verbatim — comments are kept
      continue;
    }
    // string states (single / double / template) — these we blank
    if (c === '\\') {
      out += '  ';
      i++;
      continue;
    } // escape — consume the next char too
    const closer = state === 'single' ? "'" : state === 'double' ? '"' : '`';
    if (c === closer) state = 'code';
    out += keep;
  }
  return out;
}

/**
 * Blank out COMMENT CONTENTS only, leaving STRING LITERALS and code intact
 * (newlines preserved, so line numbers still align). The complement of
 * {@link stringsBlanked}: the floor for a scanner whose target is a string-literal
 * VALUE (e.g. a benchmark's registered name in `bench('name', …)`) that must
 * survive while a commented-out copy (`// bench('name', …)`) vanishes. A genuine
 * registration's name is preserved; a commented-out registration is erased, so a
 * disabled bench does not count as registered.
 *
 * Same five-state char machine as {@link codeOnly}; only the disposition differs —
 * strings pass through verbatim, comment contents are replaced with spaces.
 */
export function commentsBlanked(src: string): string {
  let out = '';
  type State = 'code' | 'line' | 'block' | 'single' | 'double' | 'template';
  let state: State = 'code';
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    const next = src[i + 1];
    const keep = c === '\n' ? '\n' : ' ';
    if (state === 'code') {
      if (c === '/' && next === '/') {
        state = 'line';
        out += '  ';
        i++;
        continue;
      }
      if (c === '/' && next === '*') {
        state = 'block';
        out += '  ';
        i++;
        continue;
      }
      if (c === "'") {
        state = 'single';
        out += c;
        continue;
      }
      if (c === '"') {
        state = 'double';
        out += c;
        continue;
      }
      if (c === '`') {
        state = 'template';
        out += c;
        continue;
      }
      out += c;
      continue;
    }
    if (state === 'line') {
      if (c === '\n') state = 'code';
      out += keep; // comment content blanked
      continue;
    }
    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code';
        out += '  ';
        i++;
        continue;
      }
      out += keep; // comment content blanked
      continue;
    }
    // string states — passed through verbatim (the value must survive)
    if (c === '\\') {
      out += c;
      out += src[i + 1] ?? '';
      i++;
      continue;
    } // escape — keep both chars
    const closer = state === 'single' ? "'" : state === 'double' ? '"' : '`';
    if (c === closer) state = 'code';
    out += c;
  }
  return out;
}
