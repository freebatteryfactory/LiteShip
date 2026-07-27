/**
 * String distance — the single Levenshtein table + nearest-match picker (the
 * [DUP] owner for the assets / scene / command "did you mean?" suggesters). Pure
 * + browser-safe. The three former call sites diverged only in the acceptance
 * THRESHOLD (`min(2, ⌊len/3⌋)` / `≤3` / `≤2`); {@link closestMatch} takes it as a
 * caller-supplied parameter so one table subsumes all three policies.
 * @module
 */

/**
 * Levenshtein edit distance between `a` and `b` — one O(n·m) dynamic-programming
 * table over two rolling rows (id lists are tiny, so the quadratic table is fine).
 * Insertion, deletion, and substitution each cost 1.
 */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_v, j) => j);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}

/**
 * The nearest `candidate` to `input` by {@link editDistance}, or `undefined` when
 * none is within `threshold` — the "did you mean 'x'?" primitive. The `threshold`
 * is CALLER-supplied so one picker serves every policy: the assets registry passes
 * `Math.max(1, Math.min(2, Math.floor(input.length / 3)))`, the command dispatcher
 * passes `3`, the scene compiler passes `2`.
 *
 * Ties are broken deterministically: the smallest distance wins, and among equal
 * distances the FIRST candidate in input order wins (the scan keeps a match only on
 * a STRICTLY smaller distance). A match is returned only when its distance `≤ threshold`.
 */
export function closestMatch(input: string, candidates: readonly string[], threshold: number): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const dist = editDistance(input, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best !== undefined && bestDist <= threshold ? best : undefined;
}
