/**
 * Float-determinism boundary guard — the "f32-canonical CUT" backstop.
 *
 * Float determinism is load-bearing across 6+ packages and has diverged before:
 * the boundary state-index kernel was re-implemented inline as a hand-rolled
 * reverse-scan that compared a value to `thresholds[i]` in raw f64, selecting a
 * DIFFERENT state index than the deployed f32 WASM kernel within ~1 ULP of a
 * threshold (output-identity drift). The fix consolidated ONE f32-canonical
 * kernel in packages/core/src/boundary-f32.ts (`rawIndexF32` +
 * `EVALUATE_THRESHOLDS_SOURCE`).
 *
 * The structural ast-grep rule `sgrules/float-determinism-boundary.yml` catches
 * a NEW inline reverse-scan kernel shipping in package source. This meta-test is
 * the budget/byte-level backstop the line-anchored rule pairs with (the repo
 * convention — see the comment atop sgrules/a1-no-cli-import.yml):
 *   1. the canonical kernels are the SOLE reverse-scan definition sites in
 *      production source — no other `packages/**\/src` file owns an inline
 *      downward threshold scan;
 *   2. the rule is REGISTERED with ast-grep (lives under a `ruleDirs:` entry in
 *      sgconfig.yml, so `pnpm run lint:structural` actually runs it).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const PACKAGES = resolve(REPO, 'packages');
const SGRULE = resolve(REPO, 'sgrules', 'float-determinism-boundary.yml');
const SGCONFIG = resolve(REPO, 'sgconfig.yml');

/** Canonical f32 boundary kernels — the ONLY sanctioned reverse-scan / f32
 * comparison sites. Paths relative to packages/. */
const CANONICAL_KERNEL_FILES = ['core/src/boundary-f32.ts'] as const;

/** Recursively collect every `.ts` source file under `packages/**\/src`. */
function allPackageSrcFiles(): string[] {
  const out: string[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        walk(full);
      } else if (entry.name.endsWith('.ts')) {
        out.push(full);
      }
    }
  }
  for (const pkg of readdirSync(PACKAGES, { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    const src = join(PACKAGES, pkg.name, 'src');
    if (existsSync(src)) walk(src);
  }
  return out;
}

/**
 * A real inline reverse-scan boundary kernel: a `for` loop that walks an index
 * DOWNWARD (`i--`) while comparing a value against an array subscript
 * (`v >= thresholds[i]`). Mirrors the ast-grep rule's two-clause AND so the two
 * guards pin the same shape (the test catches the byte-level pattern across a
 * whole file; the ast-grep rule catches the structural AST a line-regex misses).
 */
function hasInlineReverseScanKernel(source: string): boolean {
  // Strip line + block comments so prose describing the deleted scan can't trip
  // this (the same false-positive class the ast-grep `kind`-gating avoids).
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const downwardForLoop = /for\s*\([^;]*;[^;]*;[^)]*(?:--|-=\s*1)\s*\)/;
  const subscriptCompare = /[<>]=?\s*[A-Za-z_$][\w$]*\s*\[[^\]]+\]|[A-Za-z_$][\w$]*\s*\[[^\]]+\]\s*[<>]=?/;
  if (!downwardForLoop.test(code) || !subscriptCompare.test(code)) return false;

  // Both shapes present somewhere in the file — only flag when they co-occur
  // inside the SAME for-statement body (the kernel shape), not coincidentally.
  for (const m of code.matchAll(/for\s*\([^{]*\{/g)) {
    const start = m.index!;
    // Scan the matched for-loop body (balanced braces) for the comparison.
    let depth = 0;
    let i = code.indexOf('{', start);
    const bodyStart = i;
    for (; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    const header = code.slice(start, bodyStart);
    const body = code.slice(bodyStart, i + 1);
    if (/(?:--|-=\s*1)\s*\)/.test(header) && subscriptCompare.test(body)) return true;
  }
  return false;
}

describe('float-determinism boundary guard — f32-canonical CUT backstop', () => {
  it('the canonical kernel files exist and define the reverse-scan / f32 seam', () => {
    for (const rel of CANONICAL_KERNEL_FILES) {
      const path = resolve(PACKAGES, rel);
      expect(existsSync(path), `${rel} missing`).toBe(true);
      const src = readFileSync(path, 'utf8');
      // boundary-f32.ts owns the worker-blob reverse-scan twin and rawIndexF32.
      expect(src).toContain('rawIndexF32');
      expect(src).toContain('EVALUATE_THRESHOLDS_SOURCE');
    }
  });

  it('NO other packages/**/src file owns an inline reverse-scan boundary kernel', () => {
    const canonical = CANONICAL_KERNEL_FILES.map((rel) => resolve(PACKAGES, rel));
    const offenders: string[] = [];
    for (const file of allPackageSrcFiles()) {
      if (canonical.includes(file)) continue;
      const src = readFileSync(file, 'utf8');
      if (hasInlineReverseScanKernel(src)) offenders.push(file.replace(REPO + '/', ''));
    }
    expect(
      offenders,
      `inline reverse-scan boundary kernel(s) outside the canonical seam — route through rawIndexF32:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('the structural rule is registered with ast-grep (sgconfig ruleDirs → sgrules/)', () => {
    expect(existsSync(SGRULE), 'sgrules/float-determinism-boundary.yml missing').toBe(true);
    const rule = readFileSync(SGRULE, 'utf8');
    expect(rule).toContain('id: float-determinism-boundary');
    expect(rule).toMatch(/kind:\s*for_statement/);

    const config = readFileSync(SGCONFIG, 'utf8');
    // sgconfig points ast-grep at the `sgrules` directory the rule lives in, so
    // `pnpm run lint:structural` discovers and enforces it.
    expect(config).toMatch(/ruleDirs:/);
    expect(config).toMatch(/-\s*sgrules\b/);
  });
});
