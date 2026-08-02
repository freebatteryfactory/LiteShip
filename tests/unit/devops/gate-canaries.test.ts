/**
 * Gate self-mutation canaries (scar S0.3).
 *
 * S0.3: the root typecheck leg was vacuous — a solution-style tsconfig with
 * `files: []` and `--noEmit` following no references ran green while checking
 * nothing. A gate that can only ever pass is decoration. These canaries prove
 * the build / typecheck / lint / api-surface gates still check something
 * non-trivial, so a future regression that guts one of them reds here instead
 * of shipping a green-but-empty gate.
 *
 * Three families (per the S0.3 disposition):
 *   (a) TYPECHECK canary — a hermetic 2-file composite fixture is copied into a
 *       temp dir, a TS2322 is injected into the copy, and `tsc --build` is run
 *       against it: it must exit non-zero AND emit TS2322. The clean copy must
 *       build green. This proves the build-gate *mechanism* actually detects
 *       type errors — never mutating the real tree.
 *   (b) COVERAGE FLOORS — the real gates cover a broad surface: root tsconfig
 *       references, every reference feeding real files into `tsc --build`, the
 *       vitest test-discovery globs, the eslint lint globs, and the api-surface
 *       snapshot. Each floor sits far below the current tree with margin, so it
 *       reds only on a genuine collapse (references emptied, globs narrowed,
 *       snapshot gutted), not on ordinary churn.
 *   (c) VACUITY TRIPWIRE — the typecheck script's first leg must invoke the
 *       bounded native tsc owner in build mode. A revert to a
 *       `-p tsconfig.json` / `--noEmit` solution-file invocation reds here.
 *
 * Deviations from a literal reading of the disposition, and why:
 *   - tsbuildinfo files are gitignored build artifacts, so their presence is
 *     non-deterministic (absent on a fresh checkout). The "every reference
 *     participates" floor instead proves — deterministically, from source —
 *     that every root reference resolves to a real project whose include feeds
 *     >= 1 file into the build.
 *   - tsconfig.tests.json directly admits the runtime property tier plus a
 *     deliberately curated list of other compile-assertion seams. The ">100
 *     test files" floor is applied to vitest's real discovery globs
 *     (`nodeTestInclude`); the property-tier law compares that runtime corpus
 *     with TypeScript's parsed root files, while concrete curated entries are
 *     separately guarded for dangling paths.
 *
 * @module
 */
import { describe, it, expect, afterAll } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import fg from 'fast-glob';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';
import { scaledTimeout, nodeTestInclude } from '../../../vitest.shared.js';
import {
  rootTsconfigReferenceDirs,
  packageTsconfigInputs,
  tsconfigTestsIncludeEntries,
  tsconfigTestsIncludeFiles,
  tsconfigTestsRootFiles,
  apiSurfaceSnapshot,
  lintGlobs,
  typecheckLegs,
  typecheckScript,
} from '../../support/repo-truths.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const TSC = resolve(REPO, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');

// Every repo TRUTH this canary asserts against — root tsconfig references, each
// package's compile inputs, the tests project's include, the api-surface
// snapshot, and the lint/typecheck gate-script derivations — is read through the
// single owner tests/support/repo-truths.ts, never a private JSONC parser or a
// re-forked script-body regex (scar S0.4). Only the hermetic typecheck-canary
// fixture below is read locally: it is throwaway sandbox input, not a repo truth.

// --------------------------------------------------------------------------
// (a) TYPECHECK canary — the build gate must detect a real type error.
// --------------------------------------------------------------------------

const FIXTURE_DIR = resolve(REPO, 'tests', 'fixtures', 'gate-canary');
const FIXTURE_FILES = ['tsconfig.json', 'a.ts', 'b.ts'] as const;
const INJECT_FROM = 'export const doubled: number =';
const INJECT_TO = 'export const doubled: string =';

interface TscResult {
  readonly status: number;
  readonly output: string;
}

/**
 * Run `tsc --build <project>` with the repo's own TypeScript via the canonical
 * spawn helper (preserves NODE_V8_COVERAGE inheritance). tsc writes diagnostics
 * to stdout, so the combined stream is scanned for the diagnostic code.
 */
async function runTscBuild(projectPath: string): Promise<TscResult> {
  // `--pretty false` ensures the canary asserts on a plain diagnostic stream
  // regardless of the color environment.
  const result = await spawnArgvCapture(TSC, ['--build', projectPath, '--pretty', 'false']);
  return { status: result.exitCode, output: result.stdout + result.stderr };
}

function seedFixture(dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const file of FIXTURE_FILES) cpSync(join(FIXTURE_DIR, file), join(dest, file));
}

const sandboxRoot = mkdtempSync(join(tmpdir(), 'gate-canary-'));
afterAll(() => {
  rmSync(sandboxRoot, { recursive: true, force: true });
});

describe('(a) typecheck canary — `tsc --build` detects an injected type error', () => {
  it(
    'clean fixture builds green; an injected TS2322 reds the exact same build gate',
    async () => {
      // Control: the pristine fixture must build clean, so the redness below is
      // attributable to the injection, not a broken fixture or harness.
      const cleanDir = join(sandboxRoot, 'clean');
      seedFixture(cleanDir);
      const clean = await runTscBuild(join(cleanDir, 'tsconfig.json'));
      expect(clean.status, `clean fixture failed to build:\n${clean.output}`).toBe(0);

      // Inject a TS2322 into a fresh copy (no stale tsbuildinfo/dist to skip).
      const injectedDir = join(sandboxRoot, 'injected');
      seedFixture(injectedDir);
      const bPath = join(injectedDir, 'b.ts');
      const source = readFileSync(bPath, 'utf8');
      const occurrences = source.split(INJECT_FROM).length - 1;
      expect(occurrences, 'fixture drift: the injection token must occur exactly once in b.ts').toBe(1);
      const injected = source.replace(INJECT_FROM, INJECT_TO);
      expect(injected, 'injection must actually change the source').not.toBe(source);
      writeFileSync(bPath, injected);

      const bad = await runTscBuild(join(injectedDir, 'tsconfig.json'));
      expect(bad.status, 'the build gate must fail on a type error — a green here means it checks nothing').not.toBe(0);
      expect(bad.output, `expected a TS2322 diagnostic, got:\n${bad.output}`).toMatch(/error TS2322/);
    },
    scaledTimeout(60_000),
  );
});

describe('(a2) property evidence is type-admitted before execution', () => {
  const runtimePropertySuites = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/property/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedPropertyRoots = tsconfigTestsRootFiles().filter(
    (path) => path.startsWith('tests/property/') && path.endsWith('.test.ts'),
  );

  it('the tests typecheck project admits every property suite, including future files', () => {
    expect(
      runtimePropertySuites.length,
      'the property-test corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(143);
    expect(admittedPropertyRoots).toEqual(runtimePropertySuites);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/property/') && entry.includes('*') && entry.endsWith('.test.ts'),
      ),
      'property admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with the property admission removed exposes the complete missing corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/property/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimePropertySuites.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimePropertySuites);
  });

  it(
    'an intentionally ill-typed future property suite fails the admitted compiler project before execution',
    async () => {
      const propertyPatterns = includeEntries.filter(
        (entry) => entry.startsWith('tests/property/') && entry.includes('*'),
      );
      expect(propertyPatterns.length, 'no wildcard property admission found').toBeGreaterThan(0);

      const seed = (dest: string, source: string): void => {
        const suiteDir = join(dest, 'tests', 'property');
        mkdirSync(suiteDir, { recursive: true });
        writeFileSync(
          join(dest, 'tsconfig.json'),
          `${JSON.stringify(
            {
              compilerOptions: {
                target: 'ES2022',
                module: 'ESNext',
                moduleResolution: 'bundler',
                strict: true,
                noEmit: true,
              },
              include: propertyPatterns,
            },
            null,
            2,
          )}\n`,
        );
        writeFileSync(join(suiteDir, 'future-admission.test.ts'), source);
      };

      const cleanDir = join(sandboxRoot, 'property-clean');
      seed(cleanDir, 'export const admitted: number = 42;\n');
      const clean = await runTscBuild(join(cleanDir, 'tsconfig.json'));
      expect(clean.status, `clean property fixture failed to typecheck:\n${clean.output}`).toBe(0);

      const invalidDir = join(sandboxRoot, 'property-invalid');
      seed(invalidDir, 'export const admitted: string = 42;\n');
      const invalid = await runTscBuild(join(invalidDir, 'tsconfig.json'));
      expect(invalid.status, 'an ill-typed property suite must fail before its Vitest body can execute').not.toBe(0);
      expect(invalid.output, `expected TS2322 from the ill-typed property fixture, got:\n${invalid.output}`).toMatch(
        /error TS2322/,
      );
    },
    scaledTimeout(60_000),
  );
});

describe('(a3) fuzz evidence is type-admitted before execution', () => {
  const runtimeFuzzSuites = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/fuzz/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedFuzzRoots = tsconfigTestsRootFiles().filter(
    (path) => path.startsWith('tests/fuzz/') && path.endsWith('.test.ts'),
  );

  it('the tests typecheck project admits every fuzz suite, including future files', () => {
    expect(runtimeFuzzSuites.length, 'the fuzz-test corpus fell below its committed floor').toBeGreaterThanOrEqual(9);
    const admitted = new Set(admittedFuzzRoots);
    const missing = runtimeFuzzSuites.filter((path) => !admitted.has(path));
    expect(
      admittedFuzzRoots,
      `the tests typecheck project admits ${admittedFuzzRoots.length}/${runtimeFuzzSuites.length} runtime fuzz suites; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeFuzzSuites);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/fuzz/') && entry.includes('*') && entry.endsWith('.test.ts'),
      ),
      'fuzz admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
    expect(includeEntries, 'the fuzz tier transitively imports the repository Istanbul runtime').toContain(
      'scripts/types/istanbul.d.ts',
    );
  });

  it('a counterfeit config with the fuzz admission removed exposes the complete missing corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/fuzz/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeFuzzSuites.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeFuzzSuites);
  });
});

describe('(a4) journey and setup runtime sources are type-admitted before execution', () => {
  // `check/journey` owns the complete journey tree, while `check/test` executes
  // every setup source either as Vitest setup or through a runtime test import.
  // These are source tiers rather than `*.test.ts` entrypoints, so derive their
  // authored populations directly instead of pretending `nodeTestInclude` owns them.
  const runtimeJourneySources = fg
    .sync('tests/journey/**/*.ts', { cwd: REPO })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const runtimeSetupSources = fg
    .sync('tests/setup/**/*.ts', { cwd: REPO })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const runtimeSources = [...runtimeJourneySources, ...runtimeSetupSources].sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter(
    (path) => path.startsWith('tests/journey/') || path.startsWith('tests/setup/'),
  );

  it('the tests typecheck project admits every journey and setup source, including future files', () => {
    expect(
      runtimeJourneySources.length,
      'the journey source corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(9);
    expect(runtimeSetupSources.length, 'the setup source corpus fell below its committed floor').toBeGreaterThanOrEqual(
      2,
    );
    const admitted = new Set(admittedSources);
    const missing = runtimeSources.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${runtimeSources.length} runtime journey/setup sources; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSources);
    for (const tier of ['journey', 'setup']) {
      expect(
        includeEntries.some(
          (entry) => entry.startsWith(`tests/${tier}/`) && entry.includes('*') && entry.endsWith('.ts'),
        ),
        `${tier} admission must be future-proof rather than an authored filename roster`,
      ).toBe(true);
    }
  });

  it('a counterfeit config with journey and setup admission removed exposes the complete missing corpus', () => {
    const counterfeitEntries = includeEntries.filter(
      (entry) => !entry.startsWith('tests/journey/') && !entry.startsWith('tests/setup/'),
    );
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSources);
  });
});

describe('(a5) smoke evidence is type-admitted before execution', () => {
  const runtimeSmokeSuites = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/smoke/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSmokeRoots = tsconfigTestsRootFiles().filter(
    (path) => path.startsWith('tests/smoke/') && path.endsWith('.test.ts'),
  );

  it('the tests typecheck project admits every runtime smoke suite, including future files', () => {
    expect(runtimeSmokeSuites.length, 'the smoke-test corpus fell below its committed floor').toBeGreaterThanOrEqual(7);
    const admitted = new Set(admittedSmokeRoots);
    const missing = runtimeSmokeSuites.filter((path) => !admitted.has(path));
    expect(
      admittedSmokeRoots,
      `the tests typecheck project admits ${admittedSmokeRoots.length}/${runtimeSmokeSuites.length} runtime smoke suites; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSmokeSuites);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/smoke/') && entry.includes('*') && entry.endsWith('.test.ts'),
      ),
      'smoke admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with smoke admission removed exposes the complete missing corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/smoke/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSmokeSuites.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSmokeSuites);
  });
});

// --------------------------------------------------------------------------
// (b) Coverage floors — the real gates cover a broad, non-trivial surface.
// --------------------------------------------------------------------------

describe('(b) coverage floors — gates cover a non-trivial surface', () => {
  const referenceDirs = rootTsconfigReferenceDirs();

  it('root tsconfig references >= 20 package dirs (the `tsc --build` topology)', () => {
    expect(referenceDirs.length).toBeGreaterThanOrEqual(20);
    // No duplicate references — a doubled entry would inflate the count vacuously.
    expect(new Set(referenceDirs).size).toBe(referenceDirs.length);
  });

  it('every root reference participates — resolves to a real project feeding >= 1 file into the build', () => {
    const dangling: string[] = [];
    const empty: string[] = [];
    for (const dir of referenceDirs) {
      const inputs = packageTsconfigInputs(dir);
      // `undefined` = the reference points at a missing dir or a project with no
      // tsconfig.json — a dangling reference.
      if (inputs === undefined) {
        dangling.push(dir);
        continue;
      }
      // An ABSENT include+files means tsc's default (compile everything under
      // the project) — glob the whole tree. An EXPLICIT `include: []` means the
      // project compiles nothing: do NOT fall back, so a gutted include reds.
      const hasExplicitInputs = inputs.include !== undefined || inputs.files !== undefined;
      const patterns = [...(inputs.files ?? []), ...(inputs.include ?? [])];
      const globs = hasExplicitInputs ? patterns : ['**/*.ts', '**/*.d.ts'];
      const matched =
        globs.length === 0
          ? []
          : fg.sync([...globs], {
              cwd: resolve(REPO, 'packages', dir),
              ignore: ['**/node_modules/**', '**/dist/**'],
            });
      if (matched.length === 0) empty.push(dir);
    }
    expect(dangling, `references point at missing dirs/tsconfigs: ${dangling.join(', ')}`).toEqual([]);
    expect(empty, `references whose include matches zero source files: ${empty.join(', ')}`).toEqual([]);
  });

  it('vitest discovers > 100 test files (the real suite-discovery gate)', () => {
    const discovered = fg.sync([...nodeTestInclude], {
      cwd: REPO,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });
    expect(discovered.length).toBeGreaterThan(100);
  });

  it('tsconfig.tests.json lists only files that exist (no dangling compile-assertion seams)', () => {
    const listed = tsconfigTestsIncludeFiles();
    expect(listed.length, 'tsconfig.tests.json include must name concrete files').toBeGreaterThan(0);
    const missing = listed.filter((entry) => !existsSync(resolve(REPO, entry)));
    expect(missing, `tsconfig.tests.json names files that no longer exist: ${missing.join(', ')}`).toEqual([]);
  });

  it('eslint lint globs match > 500 source files', () => {
    const globs = lintGlobs();
    expect(globs.length, 'no globs derived from the lint script').toBeGreaterThan(0);
    const matched = fg.sync([...globs], {
      cwd: REPO,
      ignore: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', '**/*.js'],
    });
    expect(matched.length).toBeGreaterThan(500);
  });

  it('api-surface snapshot carries > 100 exports across > 20 packages', () => {
    const snapshot = apiSurfaceSnapshot();
    const pkgs = Object.entries(snapshot.packages ?? {});
    const packagesWithExports = pkgs.filter(([, v]) => (v.exports?.length ?? 0) > 0);
    const totalExports = pkgs.reduce((sum, [, v]) => sum + (v.exports?.length ?? 0), 0);
    expect(packagesWithExports.length).toBeGreaterThan(20);
    expect(totalExports).toBeGreaterThan(100);
  });
});

// --------------------------------------------------------------------------
// (c) Vacuity tripwire — the exact S0.3 regression shape reds here.
// --------------------------------------------------------------------------

describe('(c) vacuity tripwire — typecheck leg 1 is native tsc build mode', () => {
  const legs = typecheckLegs();
  const leg1 = legs[0] ?? '';

  it('leg 1 is exactly the bounded native tsc owner in build mode', () => {
    expect(leg1).toBe('pnpm exec tsx scripts/native-tsc.ts -- --build');
  });

  it('leg 1 is not a solution-file `-p` / `--noEmit` invocation (the S0.3 vacuous form)', () => {
    expect(leg1, 'S0.3: a solution-style `-p tsconfig.json --noEmit` leg checks nothing').not.toMatch(
      /--noEmit|--project|(?:^|\s)-p(?:\s|$)/,
    );
  });

  it('the typecheck gate still runs the scripts and tests projects (stays multi-leg)', () => {
    const script = typecheckScript();
    expect(script).toMatch(/typecheck:scripts/);
    expect(script).toMatch(/typecheck:tests/);
  });
});
