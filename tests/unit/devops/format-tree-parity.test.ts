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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { globSync } from 'fast-glob';
import { getFileInfo } from 'prettier';
import { CHECK_REGISTRY } from '@liteship/command';

const ROOT = resolve(import.meta.dirname, '../../..');

function scriptGlobs(script: string): string[] {
  return [...script.matchAll(/"([^"]+)"/g)].map((match) => match[1]!).sort();
}

/** Ask prettier itself (the real authority) whether it would skip this file. */
async function prettierIgnores(path: string): Promise<boolean> {
  const info = await getFileInfo(path, { ignorePath: join(ROOT, '.prettierignore') });
  return info.ignored;
}

function exactnessPopulation(formatScript: string): readonly string[] {
  return globSync(scriptGlobs(formatScript), {
    cwd: ROOT,
    onlyFiles: true,
    unique: true,
    ignore: ['**/node_modules/**', '**/dist/**'],
  })
    .map((path) => resolve(ROOT, path))
    .sort();
}

function independentlyExpandedFormatGlobs(formatScript: string): readonly string[] {
  const files = new Set<string>();
  for (const glob of scriptGlobs(formatScript)) {
    // PRUNE, don't post-filter, the one tree that can never be a format target:
    // an installed package is not tracked, so no glob may legitimately resolve
    // into it. This walk used to descend every `node_modules` for EVERY glob and
    // discard the results in JS afterwards — invisible until `examples/` joined
    // the format population and brought its own installs, at which point the
    // law took 18.9s against its 10s budget. The `dist` filter below stays in
    // JS: derived output IS a legitimate resolution this expansion must decide
    // for itself, and deciding it here is what keeps this derivation
    // independent of `exactnessPopulation`'s single pre-ignored pass.
    for (const path of globSync(glob, { cwd: ROOT, onlyFiles: true, ignore: ['**/node_modules/**'] })) {
      const segments = path.replaceAll('\\', '/').split('/');
      if (!segments.includes('node_modules') && !segments.includes('dist')) files.add(resolve(ROOT, path));
    }
  }
  return [...files].sort();
}

async function ignoredAuthoredFiles(formatScript: string, ignorePath: string): Promise<readonly string[]> {
  const generatedRoot = join(ROOT, 'tests', 'generated');
  const population = exactnessPopulation(formatScript);
  const verdicts = await Promise.all(
    population.map(async (path) => ({ path, ignored: (await getFileInfo(path, { ignorePath })).ignored })),
  );
  return verdicts.filter(({ path, ignored }) => ignored && !path.startsWith(generatedRoot)).map(({ path }) => path);
}

const scripts = (
  JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  }
).scripts;

describe('format/lint tree parity', () => {
  it('format sweeps every file lint sweeps', () => {
    const linted = exactnessPopulation(scripts['lint']!);
    const formatted = new Set(exactnessPopulation(scripts['format']!));
    expect(linted.filter((path) => !formatted.has(path))).toEqual([]);
  });

  it('format and format:check have exact population parity', () => {
    expect(exactnessPopulation(scripts['format:check']!)).toEqual(exactnessPopulation(scripts['format']!));
  });

  it('the check/format registry inputs cover the widened trees (cache identity)', () => {
    // If the command sweeps tests/ + scripts/ but the content-addressed inputs
    // do not, a tests/-only edit could reuse a stale green. The inputs must
    // name every tree the command reads.
    const format = CHECK_REGISTRY.find((check) => check.id === 'check/format');
    expect(format, 'check/format must exist in the registry').toBeDefined();
    expect(format!.inputs).toEqual(expect.arrayContaining(['packages/*/src/**/*.ts', 'tests/**', 'scripts/**/*.ts']));
  });

  it('the exactness population includes package source files admitted by the format script', () => {
    expect(exactnessPopulation(scripts['format']!)).toContain(resolve(ROOT, 'packages/core/src/index.ts'));
  });

  it("the exactness population equals the format script's independently expanded globs", () => {
    const independentlyExpanded = independentlyExpandedFormatGlobs(scripts['format']!);
    expect(scriptGlobs(scripts['format']!).length).toBeGreaterThan(0);
    expect(independentlyExpanded.length).toBeGreaterThan(0);
    expect(exactnessPopulation(scripts['format']!)).toEqual(independentlyExpanded);
  });

  it('adding a glob to the format script widens the exactness population', () => {
    const current = exactnessPopulation(scripts['format']!);
    const widened = exactnessPopulation(`${scripts['format']!} "packages/*/package.json"`);
    expect(widened.length).toBeGreaterThan(current.length);
  });

  it('a .prettierignore entry that excludes a populated package file is a finding', async () => {
    const fixture = mkdtempSync(join(ROOT, '.format-tree-parity-'));
    try {
      const ignorePath = join(fixture, '.prettierignore');
      const packageIndex = resolve(ROOT, 'packages/core/src/index.ts');
      writeFileSync(ignorePath, '../packages/core/src/index.ts\n', 'utf8');
      await expect(ignoredAuthoredFiles(scripts['format']!, ignorePath)).resolves.toContain(packageIndex);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
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
    const population = exactnessPopulation(scripts['format']!);
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
