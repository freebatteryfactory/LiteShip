/**
 * bench-classify — the shared classifier for generated `.bench.ts` files, the
 * sibling of {@link BENCH_NOT_APPLICABLE_RE}'s marker convention. It answers two
 * questions a bench-honesty gate (`capsule-verify`) must ask of EVERY generated
 * bench, and is the ONE definition of those answers so the gate and its tests
 * never drift:
 *
 *  - {@link classifyBenchSource}: does at least one `bench(...)` closure contain
 *    executable code ('real'), or is every body empty/comment-only ('placeholder')?
 *  - {@link benchHonestyError}: is this bench HONEST — a real measurement, or a
 *    typed not-applicable exemption (marker line + premise-guard body + a matching
 *    manifest `benchExemption`) — or a banned lazy placeholder / marker↔manifest
 *    drift?
 *
 * Its semantic owner is `@liteship/core/evidence` (next to `bench-marker.ts`,
 * whose `BENCH_NOT_APPLICABLE_RE` it consumes) rather than the optional
 * fast-check-backed harness. The harness compatibility facade, capsule-verify
 * gate, and tests all re-use this one source of "real vs placeholder vs typed-N/A".
 *
 * @module
 */
import { BENCH_NOT_APPLICABLE_RE } from './bench-marker.js';

/**
 * Classify a generated bench file: 'real' if at least one `bench(...)`
 * closure contains executable code, 'placeholder' if every closure body is
 * empty or comment-only (or no bench call exists at all).
 *
 * The scanner is deliberately linear: comments and string literals are masked,
 * then balanced braces locate each arrow closure. That keeps hostile generated
 * input bounded without mistaking comment text or nested closures for evidence.
 */
export function classifyBenchSource(source: string): 'real' | 'placeholder' {
  const code = maskCommentsAndLiterals(source);
  for (let cursor = 0; cursor < code.length; cursor++) {
    if (!wordAt(code, cursor, 'bench')) continue;
    let at = skipWhitespace(code, cursor + 'bench'.length);
    if (code[at] !== '(') continue;
    const callEnd = matchingDelimiter(code, at, '(', ')');
    if (callEnd < 0) continue;
    const arrow = code.indexOf('=>', at + 1);
    if (arrow < 0 || arrow > callEnd) {
      cursor = callEnd;
      continue;
    }
    at = skipWhitespace(code, arrow + 2);
    if (code[at] !== '{') {
      cursor = callEnd;
      continue;
    }
    const bodyEnd = matchingDelimiter(code, at, '{', '}');
    if (bodyEnd < 0 || bodyEnd > callEnd) {
      cursor = callEnd;
      continue;
    }
    if (code.slice(at + 1, bodyEnd).trim().length > 0) return 'real';
    cursor = callEnd;
  }
  return 'placeholder';
}

function isIdentifierPart(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_$]/.test(char);
}

function wordAt(source: string, at: number, word: string): boolean {
  return (
    source.startsWith(word, at) && !isIdentifierPart(source[at - 1]) && !isIdentifierPart(source[at + word.length])
  );
}

function skipWhitespace(source: string, at: number): number {
  while (
    at < source.length &&
    (source[at] === ' ' || source[at] === '\t' || source[at] === '\r' || source[at] === '\n')
  ) {
    at++;
  }
  return at;
}

function matchingDelimiter(source: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let at = start; at < source.length; at++) {
    if (source[at] === open) depth++;
    else if (source[at] === close && --depth === 0) return at;
  }
  return -1;
}

/** Mask comments and quoted literals while preserving offsets and delimiters. */
function maskCommentsAndLiterals(source: string): string {
  const chars = [...source];
  let mode: 'code' | 'line-comment' | 'block-comment' | 'single' | 'double' | 'template' = 'code';
  let escaped = false;
  for (let at = 0; at < chars.length; at++) {
    const char = chars[at]!;
    const next = chars[at + 1];
    if (mode === 'code') {
      if (char === '/' && next === '/') {
        chars[at] = chars[at + 1] = ' ';
        at++;
        mode = 'line-comment';
      } else if (char === '/' && next === '*') {
        chars[at] = chars[at + 1] = ' ';
        at++;
        mode = 'block-comment';
      } else if (char === "'" || char === '"' || char === '`') {
        chars[at] = ' ';
        mode = char === "'" ? 'single' : char === '"' ? 'double' : 'template';
      }
      continue;
    }
    if (mode === 'line-comment') {
      if (char === '\n') mode = 'code';
      else chars[at] = ' ';
      continue;
    }
    if (mode === 'block-comment') {
      if (char === '*' && next === '/') {
        chars[at] = chars[at + 1] = ' ';
        at++;
        mode = 'code';
      } else if (char !== '\n') chars[at] = ' ';
      continue;
    }
    chars[at] = char === '\n' ? '\n' : ' ';
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (
      (mode === 'single' && char === "'") ||
      (mode === 'double' && char === '"') ||
      (mode === 'template' && char === '`')
    ) {
      mode = 'code';
    }
  }
  return chars.join('');
}

function normalizeReason(reason: string): string {
  return reason.replace(/\s+/g, ' ').trim();
}

/**
 * Honesty verdict for ONE generated bench — the ONE definition the gate
 * (capsule-verify) and its meta-test share. Returns a human-readable error for a
 * BANNED disposition, or `null` when the bench is honest. Four states:
 *  - **REAL** — a genuine measurement: a non-comment `bench()` body, no marker,
 *    no manifest exemption → honest (`null`).
 *  - **TYPED NOT-APPLICABLE** — the `// BENCH-NOT-APPLICABLE: <reason>` marker
 *    line + a real premise-guard body (so it classifies 'real') + a manifest
 *    `benchExemption` whose reason MATCHES → honest (`null`).
 *  - **LAZY PLACEHOLDER** (banned) — a comment-only body that measures nothing:
 *    the bench analogue of `it.skip`.
 *  - **MISMATCH** (banned) — marker without manifest record, manifest record
 *    without marker, or disagreeing reasons: silent drift.
 */
export function benchHonestyError(
  capName: string,
  benchSource: string,
  benchExemption: { readonly reason: string } | undefined,
): string | null {
  const markerReason = BENCH_NOT_APPLICABLE_RE.exec(benchSource)?.[1];
  const normalizedMarkerReason = markerReason !== undefined ? normalizeReason(markerReason) : undefined;
  const normalizedExemptionReason = benchExemption !== undefined ? normalizeReason(benchExemption.reason) : undefined;
  const hasExemption = benchExemption !== undefined;
  if (classifyBenchSource(benchSource) === 'placeholder') {
    return (
      `bench for ${capName} measures nothing (comment-only, no premise guard) — make it a REAL ` +
      `measurement, or a typed not-applicable bench (a '// BENCH-NOT-APPLICABLE: <reason>' marker ` +
      `line + a real premise-guard body + a manifest benchExemption)`
    );
  }
  if (normalizedMarkerReason !== undefined && !hasExemption) {
    return `bench for ${capName} has a BENCH-NOT-APPLICABLE marker but no manifest benchExemption record`;
  }
  if (normalizedMarkerReason === undefined && hasExemption) {
    return `bench for ${capName} has a manifest benchExemption but no BENCH-NOT-APPLICABLE marker line`;
  }
  if (
    normalizedMarkerReason !== undefined &&
    normalizedExemptionReason !== undefined &&
    normalizedMarkerReason !== normalizedExemptionReason
  ) {
    return `bench for ${capName}: BENCH-NOT-APPLICABLE marker reason disagrees with the manifest benchExemption reason`;
  }
  return null;
}
