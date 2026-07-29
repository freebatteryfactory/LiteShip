/**
 * Format/lint tree parity — the formatter gates every tree the linter gates.
 *
 * The defect class (issue #171): `lint` swept packages + tests/ + scripts/ while
 * `format`/`format:check` covered only the package src trees, so edits under tests/ and
 * scripts/ were linted but never formatted — and `pnpm fix` silently formatted a
 * subset of what it linted. The law here is PARITY, not a frozen glob list: the
 * format scripts must name exactly the same trees as the lint script, so the two
 * can never diverge again without this test naming the divergence.
 *
 * `.prettierignore` is the one sanctioned exception surface, and it is pinned
 * exactly: only generated trees whose bytes are owned by a freshness gate may
 * appear there (a formatter rewriting generated output would fight the gate
 * that pins those bytes). Adding a line edits this pin deliberately.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getFileInfo } from 'prettier';
import { CHECK_REGISTRY } from '@liteship/command';

const ROOT = resolve(import.meta.dirname, '../../..');

function scriptGlobs(script: string): string[] {
  return [...script.matchAll(/"([^"]+)"/g)].map((match) => match[1]!).sort();
}

/** First .ts file under a directory, depth-first (deterministic sort order). */
function firstTsFile(dir: string): string | null {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      const nested = firstTsFile(path);
      if (nested !== null) return nested;
    } else if (name.endsWith('.ts')) {
      return path;
    }
  }
  return null;
}

/** Ask prettier itself (the real authority) whether it would skip this file. */
async function prettierIgnores(path: string): Promise<boolean> {
  const info = await getFileInfo(path, { ignorePath: join(ROOT, '.prettierignore') });
  return info.ignored;
}

const scripts = (
  JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  }
).scripts;

describe('format/lint tree parity', () => {
  it('format sweeps exactly the trees lint sweeps', () => {
    expect(scriptGlobs(scripts['format']!)).toEqual(scriptGlobs(scripts['lint']!));
  });

  it('format:check sweeps exactly the trees lint sweeps', () => {
    expect(scriptGlobs(scripts['format:check']!)).toEqual(scriptGlobs(scripts['lint']!));
  });

  it('the check/format registry inputs cover the widened trees (cache identity)', () => {
    // If the command sweeps tests/ + scripts/ but the content-addressed inputs
    // do not, a tests/-only edit could reuse a stale green. The inputs must
    // name every tree the command reads.
    const format = CHECK_REGISTRY.find((check) => check.id === 'check/format');
    expect(format, 'check/format must exist in the registry').toBeDefined();
    expect(format!.inputs).toEqual(expect.arrayContaining(['packages/*/src/**/*.ts', 'tests/**', 'scripts/**/*.ts']));
  });

  it('prettier skips exactly the freshness-gate-owned generated tree, nothing else', async () => {
    // tests/generated: bytes are pinned by the capsule freshness gate
    // (`liteship capsule-verify` recompiles and diffs) — prettier must not
    // rewrite what that gate byte-pins. Every OTHER immediate tests/ subtree is
    // hand-authored and must stay under the formatter, so an ignore entry
    // sneaked in to silence the gate reds here by name.
    for (const name of readdirSync(join(ROOT, 'tests')).sort()) {
      const dir = join(ROOT, 'tests', name);
      if (!statSync(dir).isDirectory()) continue;
      const sample = firstTsFile(dir);
      if (sample === null) continue;
      expect(await prettierIgnores(sample), `tests/${name} (via ${sample})`).toBe(name === 'generated');
    }
    const scriptsSample = firstTsFile(join(ROOT, 'scripts'));
    expect(scriptsSample).not.toBeNull();
    expect(await prettierIgnores(scriptsSample!), scriptsSample!).toBe(false);
  });
});
