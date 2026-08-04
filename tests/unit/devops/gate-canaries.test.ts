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
import { resolve, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import fg from 'fast-glob';
import { CHECK_REGISTRY } from '@liteship/command';
import { benchScriptTargets } from '../../../scripts/bench/contract-coverage.js';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';
import { scaledTimeout, nodeTestInclude } from '../../../vitest.shared.js';
import browserVitestConfig from '../../../vitest.browser.config.js';
import playwrightE2EConfig from '../../e2e/playwright.config.js';
import {
  rootTsconfigReferenceDirs,
  packageTsconfigInputs,
  tsconfigTestsIncludeEntries,
  tsconfigTestsIncludeFiles,
  tsconfigTestsResolvedFiles,
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

describe('(a6) regression evidence is type-admitted before execution', () => {
  const runtimeRegressionSuites = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/regression/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedRegressionRoots = tsconfigTestsRootFiles().filter(
    (path) => path.startsWith('tests/regression/') && path.endsWith('.test.ts'),
  );

  it('the tests typecheck project admits every runtime regression suite, including future files', () => {
    expect(
      runtimeRegressionSuites.length,
      'the regression-test corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(4);
    const admitted = new Set(admittedRegressionRoots);
    const missing = runtimeRegressionSuites.filter((path) => !admitted.has(path));
    expect(
      admittedRegressionRoots,
      `the tests typecheck project admits ${admittedRegressionRoots.length}/${runtimeRegressionSuites.length} runtime regression suites; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeRegressionSuites);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/regression/') && entry.includes('*') && entry.endsWith('.test.ts'),
      ),
      'regression admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with regression admission removed exposes the complete missing corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/regression/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeRegressionSuites.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeRegressionSuites);
  });
});

describe('(a7) runtime support modules are type-admitted before execution', () => {
  const runtimeEntrypoints = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const runtimeSupportSources = tsconfigTestsResolvedFiles(runtimeEntrypoints).filter((path) =>
    path.startsWith('tests/support/'),
  );
  const authoredSupportSources = fg
    .sync('tests/support/**/*.ts', { cwd: REPO })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSupportRoots = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/support/'));

  it('every authored support module has a live runtime owner and is directly type-admitted', () => {
    expect(runtimeEntrypoints.length, 'the Node runtime suite fell below its committed floor').toBeGreaterThanOrEqual(
      1_000,
    );
    expect(
      runtimeSupportSources.length,
      'the runtime support corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(23);
    expect(
      runtimeSupportSources,
      'tests/support contains a module with no importer in the canonical Node runtime graph',
    ).toEqual(authoredSupportSources);
    const admitted = new Set(admittedSupportRoots);
    const missing = runtimeSupportSources.filter((path) => !admitted.has(path));
    expect(
      admittedSupportRoots,
      `the tests typecheck project admits ${admittedSupportRoots.length}/${runtimeSupportSources.length} runtime support modules; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSupportSources);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/support/') && entry.includes('*') && entry.endsWith('.ts'),
      ),
      'support admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with support admission removed exposes the complete runtime-owned corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/support/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSupportSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSupportSources);
  });
});

describe('(a8) runtime helper modules are owned and type-admitted before execution', () => {
  const nodeRuntimeEntrypoints = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const browserRuntimeEntrypoints = fg
    .sync(browserVitestConfig.test?.include ?? [], { cwd: REPO })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const runtimeEntrypoints = [...nodeRuntimeEntrypoints, ...browserRuntimeEntrypoints];
  const runtimeHelperSources = tsconfigTestsResolvedFiles(runtimeEntrypoints).filter((path) =>
    path.startsWith('tests/helpers/'),
  );
  const authoredHelperSources = fg
    .sync('tests/helpers/**/*.ts', { cwd: REPO })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedHelperRoots = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/helpers/'));

  it('every authored helper has a live runtime owner', () => {
    expect(
      nodeRuntimeEntrypoints.length,
      'the Node runtime suite fell below its committed floor',
    ).toBeGreaterThanOrEqual(1_000);
    expect(browserRuntimeEntrypoints.length, 'the browser runtime suite changed').toBe(14);
    expect(
      runtimeHelperSources.length,
      'the runtime helper corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(13);
    const runtimeOwned = new Set(runtimeHelperSources);
    const unowned = authoredHelperSources.filter((path) => !runtimeOwned.has(path));
    expect(
      authoredHelperSources,
      `tests/helpers contains modules with no importer in the canonical test runtime graphs:\n${unowned.join('\n')}`,
    ).toEqual(runtimeHelperSources);
  });

  it('every runtime-owned helper is directly type-admitted', () => {
    const admitted = new Set(admittedHelperRoots);
    const missing = runtimeHelperSources.filter((path) => !admitted.has(path));
    expect(
      admittedHelperRoots,
      `the tests typecheck project admits ${admittedHelperRoots.length}/${runtimeHelperSources.length} runtime helper modules; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeHelperSources);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/helpers/') && entry.includes('*') && entry.endsWith('.ts'),
      ),
      'helper admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with helper admission removed exposes the complete runtime-owned corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/helpers/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeHelperSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeHelperSources);
  });
});

describe('(a9) Playwright E2E sources are type-admitted before execution', () => {
  const declaredMatches = Array.isArray(playwrightE2EConfig.testMatch)
    ? playwrightE2EConfig.testMatch
    : [playwrightE2EConfig.testMatch];
  const testMatchGlobs = declaredMatches.filter((match): match is string => typeof match === 'string');
  const testDir = resolve(REPO, 'tests/e2e', playwrightE2EConfig.testDir ?? '.');
  const testDirRelative = relative(REPO, testDir).replaceAll('\\', '/');
  const runtimeEntrypoints = fg
    .sync(testMatchGlobs, { cwd: testDir })
    .map((path) => `${testDirRelative}/${path.replaceAll('\\', '/')}`)
    .sort();
  const authoredSources = fg
    .sync('tests/e2e/**/*.ts', { cwd: REPO })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/e2e/'));

  it('derives every canonical E2E entrypoint from Playwright testDir and testMatch', () => {
    expect(
      testMatchGlobs.length,
      'the E2E canary cannot classify a non-string Playwright testMatch; extend the enumerator before changing it',
    ).toBe(declaredMatches.length);
    expect(runtimeEntrypoints.length, 'the Playwright E2E entrypoint corpus fell below its committed floor').toBe(3);
    const admitted = new Set(admittedSources);
    const missing = runtimeEntrypoints.filter((path) => !admitted.has(path));
    expect(
      runtimeEntrypoints.filter((path) => admitted.has(path)),
      `the tests typecheck project admits ${runtimeEntrypoints.length - missing.length}/${runtimeEntrypoints.length} Playwright entrypoints; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeEntrypoints);
  });

  it('directly admits every authored E2E source through one future-proof tree root', () => {
    expect(authoredSources.length, 'the tracked E2E TypeScript corpus fell below its committed floor').toBe(9);
    const admitted = new Set(admittedSources);
    const missing = authoredSources.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${authoredSources.length} E2E sources; missing:\n${missing.join('\n')}`,
    ).toEqual(authoredSources);
    expect(
      includeEntries.some((entry) => entry.startsWith('tests/e2e/') && entry.includes('*') && entry.endsWith('.ts')),
      'E2E admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with E2E admission removed exposes the complete source tree', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/e2e/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(authoredSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(authoredSources);
  });
});

describe('(a10) browser runtime sources are type-admitted before execution', () => {
  const runtimeEntrypoints = fg
    .sync(browserVitestConfig.test?.include ?? [], { cwd: REPO })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const configOwnedSources = tsconfigTestsResolvedFiles(['vitest.browser.config.ts']).filter((path) =>
    path.startsWith('tests/browser/commands/'),
  );
  const runtimeSources = [...runtimeEntrypoints, ...configOwnedSources].sort();
  const authoredSources = fg
    .sync('tests/browser/**/*.ts', { cwd: REPO })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/browser/'));

  it('derives the complete browser source tree from Vitest and its config module graph', () => {
    expect(runtimeEntrypoints.length, 'the browser test entrypoint corpus fell below its committed floor').toBe(14);
    expect(configOwnedSources.length, 'the browser config-owned command corpus changed').toBe(1);
    expect(runtimeSources, 'tests/browser contains a source with no browser runtime owner').toEqual(authoredSources);
  });

  it('directly admits every runtime-owned browser source through one future-proof tree root', () => {
    const admitted = new Set(admittedSources);
    const missing = runtimeSources.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${runtimeSources.length} browser sources; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSources);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/browser/') && entry.includes('*') && entry.endsWith('.ts'),
      ),
      'browser admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with browser admission removed exposes the complete runtime-owned tree', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/browser/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSources);
  });
});

describe('(a11) benchmark runtime sources are type-admitted before execution', () => {
  const registeredBenchSources = [...benchScriptTargets(REPO)].sort();
  const nodeRuntimeBenchSources = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/bench/'))
    .sort();
  const runtimeSources = [...new Set([...registeredBenchSources, ...nodeRuntimeBenchSources])].sort();
  const authoredSources = fg
    .sync('tests/bench/**/*.ts', { cwd: REPO })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/bench/'));

  it('derives the complete bench tree from registered scripts and the Node runtime', () => {
    expect(
      registeredBenchSources.length,
      'the registered benchmark corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(19);
    expect(
      nodeRuntimeBenchSources.length,
      'the Node-runtime bench source corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(1);
    expect(runtimeSources, 'tests/bench contains a source with no executable owner').toEqual(authoredSources);
  });

  it('directly admits every executable bench source through one future-proof tree root', () => {
    const admitted = new Set(admittedSources);
    const missing = runtimeSources.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${runtimeSources.length} benchmark sources; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSources);
    expect(
      includeEntries.some((entry) => entry.startsWith('tests/bench/') && entry.includes('*') && entry.endsWith('.ts')),
      'benchmark admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with benchmark admission removed exposes the complete executable tree', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/bench/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSources);
  });
});

describe('(a12) _spine unit evidence is type-admitted before execution', () => {
  const runtimeSources = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/unit/_spine/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/unit/_spine/'));

  it('directly admits every canonical Node _spine suite through one future-proof directory root', () => {
    expect(runtimeSources.length, 'the _spine unit corpus fell below its committed floor').toBeGreaterThanOrEqual(4);
    const admitted = new Set(admittedSources);
    const missing = runtimeSources.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${runtimeSources.length} runtime _spine suites; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSources);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/unit/_spine/') && entry.includes('*') && entry.endsWith('.test.ts'),
      ),
      '_spine admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with _spine admission removed exposes the complete runtime corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/unit/_spine/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSources);
  });
});

describe('(a13) canonical unit evidence is type-admitted before execution', () => {
  const runtimeSources = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/unit/canonical/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/unit/canonical/'));

  it('directly admits every canonical Node encoding suite through one future-proof directory root', () => {
    expect(runtimeSources.length, 'the canonical unit corpus fell below its committed floor').toBeGreaterThanOrEqual(9);
    const admitted = new Set(admittedSources);
    const missing = runtimeSources.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${runtimeSources.length} runtime canonical suites; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSources);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/unit/canonical/') && entry.includes('*') && entry.endsWith('.test.ts'),
      ),
      'canonical admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with canonical admission removed exposes the complete runtime corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/unit/canonical/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSources);
  });
});

describe('(a14) error-algebra unit evidence is type-admitted before execution', () => {
  const runtimeSources = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/unit/error/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/unit/error/'));

  it('directly admits every canonical Node error suite through one future-proof directory root', () => {
    expect(
      runtimeSources.length,
      'the error-algebra unit corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(3);
    const admitted = new Set(admittedSources);
    const missing = runtimeSources.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${runtimeSources.length} runtime error suites; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSources);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/unit/error/') && entry.includes('*') && entry.endsWith('.test.ts'),
      ),
      'error-suite admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with error-suite admission removed exposes the complete runtime corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/unit/error/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSources);
  });
});

describe('(a15) ECS unit evidence is type-admitted before execution', () => {
  const runtimeSources = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/unit/ecs/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/unit/ecs/'));

  it('directly admits every canonical Node ECS suite through one future-proof directory root', () => {
    expect(runtimeSources.length, 'the ECS unit corpus fell below its committed floor').toBeGreaterThanOrEqual(1);
    const admitted = new Set(admittedSources);
    const missing = runtimeSources.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${runtimeSources.length} runtime ECS suites; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSources);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/unit/ecs/') && entry.includes('*') && entry.endsWith('.test.ts'),
      ),
      'ECS admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with ECS admission removed exposes the complete runtime corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/unit/ecs/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSources);
  });
});

describe('(a16) Remotion unit evidence is type-admitted before execution', () => {
  const runtimeSources = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/unit/remotion/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/unit/remotion/'));

  it('directly admits every canonical Node Remotion suite through one future-proof directory root', () => {
    expect(runtimeSources.length, 'the Remotion unit corpus fell below its committed floor').toBeGreaterThanOrEqual(3);
    const admitted = new Set(admittedSources);
    const missing = runtimeSources.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${runtimeSources.length} runtime Remotion suites; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSources);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/unit/remotion/') && entry.includes('*') && entry.endsWith('.test.ts'),
      ),
      'Remotion admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with Remotion admission removed exposes the complete runtime corpus', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/unit/remotion/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSources);
  });
});

describe('(a17) generated capsule sources are type-admitted before execution', () => {
  // Canonical Node Vitest owns every generated capsule SUITE (root slug suites
  // plus the deeper siteAdapter integration lane).
  const runtimeTests = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/generated/'))
    .sort();
  // capsule:compile writes each capsule as a `<slug>.test.ts` + `<slug>.bench.ts`
  // PAIR at the tier root; a siteAdapter additionally emits
  // `tests/generated/integration/<slug>.test.ts`, whose bench IS that root pair.
  // The bench population is therefore DERIVED from the runtime-owned root suites
  // — never an authored filename roster — and the pair is one admission unit.
  const pairedBenches = runtimeTests
    .filter((path) => path.split('/').length === 3)
    .map((path) => path.replace(/\.test\.ts$/u, '.bench.ts'))
    .sort();
  const generatorOwned = [...new Set([...runtimeTests, ...pairedBenches])].sort();
  const authoredSources = fg
    .sync('tests/generated/**/*.ts', { cwd: REPO })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/generated/'));
  const capsuleCheck = CHECK_REGISTRY.find((check) => check.id === 'check/capsule-verify');

  it('derives the complete generated tier from the Node runtime and the blocking capsule check', () => {
    expect(
      capsuleCheck?.authority,
      'check/capsule-verify must remain the BLOCKING owner of the compiled capsule corpus',
    ).toBe('blocking');
    expect(
      runtimeTests.length,
      'the generated capsule suite corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(26);
    expect(
      pairedBenches.length,
      'the generated capsule bench corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(24);
    const orphanSuites = pairedBenches.filter((path) => !existsSync(resolve(REPO, path)));
    expect(orphanSuites, `generated suites whose paired bench is missing: ${orphanSuites.join(', ')}`).toEqual([]);
    expect(generatorOwned, 'tests/generated contains a source with no generator owner').toEqual(authoredSources);
  });

  it('directly admits every generator-owned source through one future-proof tree root', () => {
    const admitted = new Set(admittedSources);
    const missing = generatorOwned.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${generatorOwned.length} generated sources; missing:\n${missing.join('\n')}`,
    ).toEqual(generatorOwned);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/generated/') && entry.includes('*') && entry.endsWith('.ts'),
      ),
      'generated admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with generated admission removed exposes the complete generator-owned tree', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/generated/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(generatorOwned.filter((path) => !counterfeitAdmission.has(path))).toEqual(generatorOwned);
  });
});

describe('(a18) integration runtime sources are type-admitted before execution', () => {
  // Canonical Node Vitest owns every integration SUITE.
  const runtimeEntrypoints = fg
    .sync([...nodeTestInclude], { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('tests/integration/'))
    .sort();
  // Modules those suites IMPORT (the CLI capture helper today) — derived from
  // the real module graph of the executing entrypoints, never a roster.
  const importedModules = tsconfigTestsResolvedFiles(runtimeEntrypoints).filter(
    (path) => path.startsWith('tests/integration/') && !path.endsWith('.test.ts'),
  );
  // Consumer fixture APPS: a `scripts/test-<slug>.ts` launcher registered as the
  // owner of a BLOCKING check drives the whole app tree at
  // `tests/integration/<slug>/` (driver + framework config) under tsx. The
  // population is therefore derived from the check registry; a launcher whose
  // slug names no tier directory contributes nothing.
  const fixtureAppSources = CHECK_REGISTRY.filter((check) => check.authority === 'blocking')
    .map((check) => /^scripts\/test-([a-z0-9-]+)\.ts$/u.exec(check.owner)?.[1])
    .filter((slug): slug is string => slug !== undefined)
    .flatMap((slug) =>
      fg.sync(`tests/integration/${slug}/**/*.ts`, { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] }),
    )
    .map((path) => path.replaceAll('\\', '/'));
  const runtimeSources = [...new Set([...runtimeEntrypoints, ...importedModules, ...fixtureAppSources])].sort();
  const authoredSources = fg
    .sync('tests/integration/**/*.ts', { cwd: REPO, ignore: ['**/node_modules/**', '**/dist/**'] })
    .map((path) => path.replaceAll('\\', '/'))
    .sort();
  const includeEntries = tsconfigTestsIncludeEntries();
  const admittedSources = tsconfigTestsRootFiles().filter((path) => path.startsWith('tests/integration/'));
  const testCheck = CHECK_REGISTRY.find((check) => check.id === 'check/test');

  it('derives the complete integration tier from the Node runtime, its module graph, and the blocking launchers', () => {
    expect(testCheck?.authority, 'check/test must remain the BLOCKING owner of the integration suite corpus').toBe(
      'blocking',
    );
    expect(
      runtimeEntrypoints.length,
      'the integration suite corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(42);
    expect(
      importedModules.length,
      'the integration helper-module corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(1);
    expect(
      fixtureAppSources.length,
      'the registered consumer fixture-app corpus fell below its committed floor',
    ).toBeGreaterThanOrEqual(6);
    expect(runtimeSources, 'tests/integration contains a source with no executable owner').toEqual(authoredSources);
  });

  it('directly admits every executable integration source through one future-proof tree root', () => {
    const admitted = new Set(admittedSources);
    const missing = runtimeSources.filter((path) => !admitted.has(path));
    expect(
      admittedSources,
      `the tests typecheck project admits ${admittedSources.length}/${runtimeSources.length} integration sources; missing:\n${missing.join('\n')}`,
    ).toEqual(runtimeSources);
    expect(
      includeEntries.some(
        (entry) => entry.startsWith('tests/integration/') && entry.includes('*') && entry.endsWith('.ts'),
      ),
      'integration admission must be future-proof rather than an authored filename roster',
    ).toBe(true);
  });

  it('a counterfeit config with integration admission removed exposes the complete executable tree', () => {
    const counterfeitEntries = includeEntries.filter((entry) => !entry.startsWith('tests/integration/'));
    const counterfeitAdmission = new Set(
      fg.sync([...counterfeitEntries], { cwd: REPO }).map((path) => path.replaceAll('\\', '/')),
    );
    expect(runtimeSources.filter((path) => !counterfeitAdmission.has(path))).toEqual(runtimeSources);
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
