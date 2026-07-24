/**
 * Dogfood — the gauntlet's own value, proven on the REAL repo (not a fixture).
 *
 * We point {@link noBareThrowGate} at the live `packages/&#42;/src` tree through
 * {@link nodeContext} and assert it finds ZERO bare throws. The Slice-A migration
 * made every failure path a tagged `@liteship/error` variant — and this gate, run on
 * the actual repo, is what proved it: dogfooding surfaced three bare throws the
 * migration's `throw new Error`-only sweep missed (`RangeError`/`TypeError` in
 * `canonical/cbor.ts` ×2 and `scene/beat-projection.ts`), which were then cured
 * to tagged variants. Zero is now the honest floor, not an aspiration.
 *
 * On any finding the test prints every `file:line` so a NEW bare throw (a real
 * regression — or a freshly-added native-error throw) is immediately visible.
 *
 * This is the metacircular proof: the gauntlet runs its first real gate over the
 * actual repo, through the same engine path everything else uses, and the repo
 * passes its own gate.
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { noBareThrowGate, nodeContext } from '@liteship/gauntlet';

// Resolve the repo root from THIS file's location (tests/unit/gauntlet/…), so
// the run is independent of the process cwd — deterministic by construction.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');

// The scope: every package's TypeScript source.
const GLOBS = ['packages/*/src/**/*.ts'] as const;

/** Render a finding as a stable `file:line` token (for the diff + the listing). */
function locOf(file: string | undefined, line: number | undefined): string {
  return `${file ?? '<no-file>'}:${line ?? 0}`;
}

describe('dogfood — noBareThrowGate over the real packages/*/src tree', () => {
  it('finds ZERO bare throws — the repo passes its own gate (lists any regression)', () => {
    const ctx = nodeContext(REPO_ROOT, [...GLOBS]);

    // Sanity: the glob actually matched real source (a zero-file context would
    // make "zero findings" a hollow pass).
    expect(ctx.files().length).toBeGreaterThan(0);

    const findings = noBareThrowGate.run(ctx);
    const seen = findings.map((f) => locOf(f.location?.file, f.location?.line)).sort();

    // Honest failure message: list every finding so a NEW bare throw is
    // immediately visible (a real regression to migrate to a tagged variant).
    const message = [
      `noBareThrowGate over ${GLOBS.join(', ')} found ${findings.length} bare throw(s) — each must become a tagged @liteship/error variant:`,
      ...seen.map((s) => `  + ${s}`),
    ].join('\n');

    expect(seen, message).toEqual([]);
  });

  it('is deterministic — the same repo state yields the same findings twice', () => {
    const run = (): readonly string[] =>
      noBareThrowGate.run(nodeContext(REPO_ROOT, [...GLOBS])).map((f) => locOf(f.location?.file, f.location?.line));

    expect(run()).toEqual(run());
  });

  it('nodeContext.files() is sorted and node_modules/dist-free', () => {
    const files = nodeContext(REPO_ROOT, [...GLOBS]).files();
    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
    expect(files.some((f) => f.includes('node_modules') || f.includes('/dist/'))).toBe(false);
  });
});
