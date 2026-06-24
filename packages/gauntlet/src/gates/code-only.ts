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
 * The last significant CODE char after which a `/` is DIVISION, never a regex —
 * a VALUE-ender: an identifier/number end, a closing `)`/`]`/`}`, or a `.`. When
 * the preceding significant char matches this, `/` is treated as the division
 * operator (unless the preceding WORD is a regex-allowing keyword; see below).
 */
const DIVISION_PRECEDER = /[A-Za-z0-9_$)\].}]/;

/**
 * Keywords after which a `/` BEGINS a regex literal even though the previous
 * significant char is a letter — e.g. `return /re/`, `typeof /x/`, `case /y/`.
 * Without this exception the `n` of `return` would look like a value-ender and
 * the `/re/` would be mis-read as division.
 */
const REGEX_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'yield',
  'await',
  'case',
  'do',
  'else',
  'throw',
]);

/** The identifier WORD ending at `pos` (walk back over `[A-Za-z0-9_$]`). */
function precedingWord(src: string, pos: number): string {
  let start = pos;
  while (start >= 0 && /[A-Za-z0-9_$]/.test(src[start]!)) start--;
  return src.slice(start + 1, pos + 1);
}

/**
 * Conservative, lookahead-based regex-literal recognizer. Given a `/` at `start`
 * and the last significant CODE char (`lastSig`, at `lastSigPos`), decide whether
 * the `/` opens a SINGLE-LINE regex literal — and if so, return the index AFTER
 * the literal (past any trailing flags). Returns `undefined` when the `/` is
 * NOT a regex (⇒ the caller treats it as division).
 *
 * It is a regex-POSITION iff there is no preceding value to divide:
 *  - `lastSig === undefined` (statement / file start), OR
 *  - the preceding significant char is NOT a value-ender, OR
 *  - it IS an identifier char but the preceding WORD is a regex-allowing keyword
 *    (`return /re/` etc.).
 *
 * The SAME-LINE-close lookahead is what makes this SAFE: a bare division like
 * `a / b` (no second `/` on the line) never finds a closer and falls through to
 * division, so it is never mis-blanked. Inside the literal `\` escapes the next
 * char, a `[`/`]` pair toggles a character class (a `/` inside `[...]` does NOT
 * close), a newline before the closer aborts (regex literals are single-line),
 * and the body must be non-empty (so `//` is a line comment, handled earlier).
 */
function regexLiteralEnd(
  src: string,
  start: number,
  lastSig: string | undefined,
  lastSigPos: number,
): number | undefined {
  const isRegexPosition =
    lastSig === undefined ||
    !DIVISION_PRECEDER.test(lastSig) ||
    (/[A-Za-z0-9_$]/.test(lastSig) && REGEX_KEYWORDS.has(precedingWord(src, lastSigPos)));
  if (!isRegexPosition) return undefined;

  let inClass = false;
  let body = 0;
  for (let j = start + 1; j < src.length; j++) {
    const ch = src[j]!;
    if (ch === '\n') return undefined; // single-line only — abort to division
    if (ch === '\\') {
      j++; // escape — skip the next char
      body++;
      continue;
    }
    if (ch === '[') {
      inClass = true;
      body++;
      continue;
    }
    if (ch === ']') {
      inClass = false;
      body++;
      continue;
    }
    if (ch === '/' && !inClass) {
      if (body === 0) return undefined; // empty `//` is a line comment, not a regex
      // consume trailing flags
      let k = j + 1;
      while (k < src.length && /[dgimsuvy]/.test(src[k]!)) k++;
      return k;
    }
    body++;
  }
  return undefined; // no closer on the line — treat `/` as division
}

/**
 * Blank out comment and string-literal CONTENTS (replace with spaces, preserving
 * every newline so line numbers still align), leaving only code. A char-level
 * state machine over the five string/comment states plus code; handles escapes
 * inside strings so a `\'` does not prematurely close a single-quoted literal.
 *
 * Regex literals are recognized (lookahead-based, conservative) and blanked to
 * spaces too — an opaque literal for every dependent gate. Blanking them prevents
 * a quote char inside a character class (`/(['"`])/`) from DESYNCing the
 * string/comment state machine for the rest of the file.
 */
export function codeOnly(src: string): string {
  let out = '';
  type State = 'code' | 'line' | 'block' | 'single' | 'double' | 'template';
  let state: State = 'code';
  let lastSig: string | undefined;
  let lastSigPos = -1;
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
      if (c === '/') {
        const end = regexLiteralEnd(src, i, lastSig, lastSigPos);
        if (end !== undefined) {
          for (let k = i; k < end; k++) out += src[k] === '\n' ? '\n' : ' ';
          lastSig = ')';
          lastSigPos = end - 1;
          i = end - 1;
          continue;
        }
        // else: division — fall through and treat `/` as a code char
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
      if (c.trim() !== '') {
        lastSig = c;
        lastSigPos = i;
      }
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
    if (c === closer) {
      state = 'code';
      // A closed string is a VALUE → a following `/` is division.
      lastSig = ')';
      lastSigPos = i;
    }
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
  let lastSig: string | undefined;
  let lastSigPos = -1;
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
      if (c === '/') {
        const end = regexLiteralEnd(src, i, lastSig, lastSigPos);
        if (end !== undefined) {
          for (let k = i; k < end; k++) out += src[k] === '\n' ? '\n' : ' ';
          lastSig = ')';
          lastSigPos = end - 1;
          i = end - 1;
          continue;
        }
        // else: division — fall through and treat `/` as a code char
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
      if (c.trim() !== '') {
        lastSig = c;
        lastSigPos = i;
      }
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
    if (c === closer) {
      state = 'code';
      // A closed string is a VALUE → a following `/` is division.
      lastSig = ')';
      lastSigPos = i;
    }
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
  let lastSig: string | undefined;
  let lastSigPos = -1;
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
      if (c === '/') {
        const end = regexLiteralEnd(src, i, lastSig, lastSigPos);
        if (end !== undefined) {
          for (let k = i; k < end; k++) out += src[k] === '\n' ? '\n' : ' ';
          lastSig = ')';
          lastSigPos = end - 1;
          i = end - 1;
          continue;
        }
        // else: division — fall through and treat `/` as a code char
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
      if (c.trim() !== '') {
        lastSig = c;
        lastSigPos = i;
      }
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
    if (c === closer) {
      state = 'code';
      // A closed string is a VALUE → a following `/` is division.
      lastSig = ')';
      lastSigPos = i;
    }
    out += c;
  }
  return out;
}
