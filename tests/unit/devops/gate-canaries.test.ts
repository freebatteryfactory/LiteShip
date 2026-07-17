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
 *   (c) VACUITY TRIPWIRE — the typecheck script's first leg must be exactly
 *       `tsc --build` (the exact form the S0.3 fix installed). A revert to a
 *       `-p tsconfig.json` / `--noEmit` solution-file invocation reds here.
 *
 * Deviations from a literal reading of the disposition, and why:
 *   - tsbuildinfo files are gitignored build artifacts, so their presence is
 *     non-deterministic (absent on a fresh checkout). The "every reference
 *     participates" floor instead proves — deterministically, from source —
 *     that every root reference resolves to a real project whose include feeds
 *     >= 1 file into the build.
 *   - tsconfig.tests.json's `include` is a deliberately curated list of
 *     compile-assertion seams (~two dozen files), not the suite's discovery
 *     surface. The ">100 test files" floor is applied to vitest's real
 *     discovery globs (`nodeTestInclude`); tsconfig.tests.json is separately
 *     guarded for dangling entries (every listed file must exist).
 *
 * @module
 */
import { describe, it, expect, afterAll } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import fg from 'fast-glob';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';
import { scaledTimeout, nodeTestInclude } from '../../../vitest.shared.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const localRequire = createRequire(import.meta.url);
const TSC = localRequire.resolve('typescript/bin/tsc');

/** Tolerant tsconfig reader: strips `//` and block comments before JSON.parse. */
function parseJsonc<T>(filePath: string): T {
  const text = readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(text) as T;
  } catch {
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    return JSON.parse(stripped) as T;
  }
}

interface RootPkg {
  readonly scripts: Record<string, string>;
}
interface Tsconfig {
  readonly references?: ReadonlyArray<{ readonly path: string }>;
  readonly include?: ReadonlyArray<string>;
  readonly files?: ReadonlyArray<string>;
}
interface ApiSnapshot {
  readonly packages: Record<string, { readonly exports?: ReadonlyArray<unknown> }>;
}

const rootPkg = parseJsonc<RootPkg>(resolve(REPO, 'package.json'));
const rootTsconfig = parseJsonc<Tsconfig>(resolve(REPO, 'tsconfig.json'));

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
  const result = await spawnArgvCapture(process.execPath, [TSC, '--build', projectPath]);
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

// --------------------------------------------------------------------------
// (b) Coverage floors — the real gates cover a broad, non-trivial surface.
// --------------------------------------------------------------------------

describe('(b) coverage floors — gates cover a non-trivial surface', () => {
  const referenceDirs = (rootTsconfig.references ?? [])
    .map((r) => /^\.\/(packages\/[\w-]+)$/.exec(r.path)?.[1])
    .filter((dir): dir is string => dir != null);

  it('root tsconfig references >= 20 package dirs (the `tsc --build` topology)', () => {
    expect(referenceDirs.length).toBeGreaterThanOrEqual(20);
    // No duplicate references — a doubled entry would inflate the count vacuously.
    expect(new Set(referenceDirs).size).toBe(referenceDirs.length);
  });

  it('every root reference participates — resolves to a real project feeding >= 1 file into the build', () => {
    const dangling: string[] = [];
    const empty: string[] = [];
    for (const dir of referenceDirs) {
      const abs = resolve(REPO, dir);
      const tsconfigPath = join(abs, 'tsconfig.json');
      if (!existsSync(abs) || !existsSync(tsconfigPath)) {
        dangling.push(dir);
        continue;
      }
      const cfg = parseJsonc<Tsconfig>(tsconfigPath);
      // An ABSENT include+files means tsc's default (compile everything under
      // the project) — glob the whole tree. An EXPLICIT `include: []` means the
      // project compiles nothing: do NOT fall back, so a gutted include reds.
      const hasExplicitInputs = cfg.include !== undefined || cfg.files !== undefined;
      const patterns = [...(cfg.files ?? []), ...(cfg.include ?? [])];
      const globs = hasExplicitInputs ? patterns : ['**/*.ts', '**/*.d.ts'];
      const matched =
        globs.length === 0
          ? []
          : fg.sync([...globs], { cwd: abs, ignore: ['**/node_modules/**', '**/dist/**'] });
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
    const testsCfg = parseJsonc<Tsconfig>(resolve(REPO, 'tsconfig.tests.json'));
    const listed = (testsCfg.include ?? []).filter((entry) => !entry.includes('*'));
    expect(listed.length, 'tsconfig.tests.json include must name concrete files').toBeGreaterThan(0);
    const missing = listed.filter((entry) => !existsSync(resolve(REPO, entry)));
    expect(missing, `tsconfig.tests.json names files that no longer exist: ${missing.join(', ')}`).toEqual([]);
  });

  it('eslint lint globs match > 500 source files', () => {
    const lintScript = rootPkg.scripts.lint ?? '';
    const globs = [...lintScript.matchAll(/"([^"]+)"/g)]
      .map((m) => m[1]!)
      .filter((g) => g.includes('*'));
    expect(globs.length, `no globs parsed from lint script: ${lintScript}`).toBeGreaterThan(0);
    const matched = fg.sync(globs, {
      cwd: REPO,
      ignore: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', '**/*.js'],
    });
    expect(matched.length).toBeGreaterThan(500);
  });

  it('api-surface snapshot carries > 100 exports across > 20 packages', () => {
    const snapshot = parseJsonc<ApiSnapshot>(resolve(REPO, 'tests', 'fixtures', 'api-surface-snapshot.json'));
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

describe('(c) vacuity tripwire — typecheck leg 1 is `tsc --build`', () => {
  const legs = (rootPkg.scripts.typecheck ?? '').split('&&').map((leg) => leg.trim());
  const leg1 = legs[0] ?? '';

  it('leg 1 is exactly `tsc --build` (build-mode, references-driven)', () => {
    expect(leg1).toBe('tsc --build');
  });

  it('leg 1 is not a solution-file `-p` / `--noEmit` invocation (the S0.3 vacuous form)', () => {
    expect(leg1, 'S0.3: a solution-style `-p tsconfig.json --noEmit` leg checks nothing').not.toMatch(
      /--noEmit|--project|(?:^|\s)-p(?:\s|$)/,
    );
  });

  it('the typecheck gate still runs the scripts and tests projects (stays multi-leg)', () => {
    const script = rootPkg.scripts.typecheck ?? '';
    expect(script).toMatch(/typecheck:scripts/);
    expect(script).toMatch(/typecheck:tests/);
  });
});
