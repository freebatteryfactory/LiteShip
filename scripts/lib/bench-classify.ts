/**
 * bench-classify — shared classifier for generated bench files.
 *
 * Lives in scripts/lib (not inline in capsule-verify) so the receipt writer
 * and its tests share ONE definition of "real vs placeholder": the
 * capsule-verify receipt classifies with it, the integration test derives
 * its expected classification from the manifest with it, and the unit test
 * pins the classification semantics independently of any generated file.
 *
 * @module
 */

/**
 * Classify a generated bench file: 'real' if at least one `bench(...)`
 * closure contains executable code, 'placeholder' if every closure body is
 * empty or comment-only (or no bench call exists at all).
 *
 * The lazy body capture stops at the first `}`, so a real body with nested
 * braces is truncated — but the truncated prefix is still non-empty, which
 * is all the classification needs.
 */
export function classifyBenchSource(source: string): 'real' | 'placeholder' {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const closures = [...stripped.matchAll(/\bbench\s*\([\s\S]*?=>\s*\{([\s\S]*?)\}/g)];
  if (closures.length === 0) return 'placeholder';
  return closures.some((m) => m[1]!.trim().length > 0) ? 'real' : 'placeholder';
}
