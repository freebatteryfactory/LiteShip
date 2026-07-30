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

/** EVERY .ts file under a directory, depth-first. One sample per subtree
 *  cannot see a single-file ignore entry hidden below it — the exactness law
 *  must interrogate the complete population it claims to govern. */
function allTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...allTsFiles(path));
    else if (name.endsWith('.ts')) files.push(path);
  }
  return files;
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
    // (`liteship capsule gate` recompiles and diffs) — prettier must not
    // rewrite what that gate byte-pins. EVERY other .ts file in the formatted
    // trees is hand-authored and must stay under the formatter, so an ignore
    // entry sneaked in for any single file — not just a whole subtree — reds
    // here by path. Full enumeration, not sampling: prettier itself is asked
    // about every file it is claimed to govern.
    const generatedRoot = join(ROOT, 'tests', 'generated');
    const population = [...allTsFiles(join(ROOT, 'tests')), ...allTsFiles(join(ROOT, 'scripts'))];
    expect(population.length).toBeGreaterThan(1000); // anti-vacuity: the trees are large
    const verdicts = await Promise.all(
      population.map(async (path) => ({ path, ignored: await prettierIgnores(path) })),
    );
    for (const { path, ignored } of verdicts) {
      expect(ignored, path).toBe(path.startsWith(generatedRoot));
    }
    expect(
      verdicts.some(({ path }) => path.startsWith(generatedRoot)),
      'sweep must reach tests/generated',
    ).toBe(true);
  });
});
