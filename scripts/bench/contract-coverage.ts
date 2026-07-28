/**
 * The declared-distribution COVERAGE fold — the headline law's enforcement core,
 * shared by the gate (a fold over GateContext files) and the bench-contracts
 * script (a fold over the filesystem). The fold is PURE: it takes the already
 * comment-stripped bench source per file plus the declared distributions and
 * returns the issues, with no I/O and no clock. The two callers differ only in
 * how they read + strip the source; the verdict logic is this one function.
 *
 * The law: a bench result is INVALID unless its input distribution is declared. So
 * for every literal-registration bench in `tests/bench/*.bench.ts`:
 *  - UNDECLARED — a registered bench with no matching {@link BenchDistribution}
 *    (the result is uncomparable; the law rejects it),
 *  - ORPHAN — a declared distribution that maps to no registered bench (a stale
 *    declaration; the bench was renamed/removed and the declaration silently
 *    drifted — the comparability anchor now points at nothing).
 *
 * Both are blocking: an undeclared bench ships an uncomparable number; an orphan
 * declaration is a silently-changed contract.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { walkFiles } from '@liteship/core/fs-walk';
// The ONE shared comment stripper (keeps string literals — a bench's registered
// name is a string value that must survive; a commented-out registration must
// vanish). Imported via the gauntlet SOURCE path (the same relative-source pattern
// the directive-suite uses to reach package internals), so the script strips bench
// source through the identical implementation the gate uses, never a copy.
// @liteship/gauntlet is not a root dep.
import { commentsBlanked } from '../../packages/gauntlet/src/gates/code-only.js';
import { qualifyBenchDistribution } from '../../packages/audit/src/benchmark-subject-facts.js';
import type { BenchSubjectIssueKind } from '../../packages/gauntlet/src/gates/bench-subjects.js';
import type { PackageCatalogRecord } from '../package-catalog.js';
import { type BenchDistribution, type BenchmarkEvidence, extractRegisteredBenches } from './contracts.js';

/** The repo-relative directory holding the literal-registration bench files. */
export const BENCH_SOURCE_DIR = 'tests/bench';

/**
 * The bench files the declared-distribution law governs — the LITERAL
 * `bench(...)` / `bench.add(...)` registrations. `directive.bench.ts` is excluded:
 * it registers via `createDirectiveBench()` (no literal name strings), and its
 * input contract is already carried by the directive suite's
 * `DIRECTIVE_BENCH_PAIRS` + bench-gate. `smoke.test.ts` is a test, not a bench.
 */
export function isGovernedBenchFile(fileName: string): boolean {
  return fileName.endsWith('.bench.ts') && fileName !== 'directive.bench.ts';
}

/** A coverage issue — an undeclared bench or an orphan declaration. */
export interface CoverageIssue {
  readonly kind: 'undeclared' | 'orphan' | BenchSubjectIssueKind;
  readonly detail: string;
  /** The bench file the issue concerns (repo-relative), when known. */
  readonly file?: string;
  /** The bench/declaration name the issue concerns. */
  readonly name: string;
}

/** The coverage verdict — the discovered bench count + the issues found. */
export interface CoverageResult {
  readonly discoveredBenchCount: number;
  readonly issues: readonly CoverageIssue[];
}

/** Catalog-derived owner census; uncovered is a work signal, not a fabricated benchmark. */
export interface BenchmarkOwnerCoverage {
  readonly packageName: string;
  readonly directory: string;
  readonly eligible: boolean;
  readonly status: 'covered' | 'uncovered' | 'not-eligible';
  readonly distributionCount: number;
  readonly evidenceCount: number;
  readonly benchmarks: readonly string[];
}

/** Resolve one qualified benchmark subject to its canonical package-catalog owner. */
export function benchmarkOwnerForSubject(
  catalog: readonly PackageCatalogRecord[],
  subject: BenchDistribution['subjects'][number],
): string | null {
  if (subject.role !== 'sut') return null;
  if (subject.origin.kind === 'module') {
    return (
      catalog.find(
        (record) =>
          subject.origin.kind === 'module' &&
          (subject.origin.specifier === record.name || subject.origin.specifier.startsWith(`${record.name}/`)),
      )?.name ?? null
    );
  }
  if (subject.origin.kind === 'file') {
    const normalized = subject.origin.path.replace(/\\/gu, '/').replace(/^\.\//u, '');
    return catalog.find((record) => normalized === record.dir || normalized.startsWith(`${record.dir}/`))?.name ?? null;
  }
  return null;
}

/**
 * Project benchmark ownership from the one package catalog, distribution
 * registry, and admitted evidence. Runtime packages are eligible by one
 * mechanical rule; the result reports gaps without manufacturing a benchmark.
 */
export function projectBenchmarkOwnerCoverage(
  catalog: readonly PackageCatalogRecord[],
  declared: readonly BenchDistribution[],
  evidence: readonly BenchmarkEvidence[],
): readonly BenchmarkOwnerCoverage[] {
  const distributions = new Map<string, Set<string>>();
  for (const distribution of declared) {
    for (const subject of distribution.subjects) {
      const owner = benchmarkOwnerForSubject(catalog, subject);
      if (owner === null) continue;
      const names = distributions.get(owner) ?? new Set<string>();
      names.add(`${distribution.file}::${distribution.name}`);
      distributions.set(owner, names);
    }
  }
  const evidenceByOwner = new Map<string, Set<string>>();
  for (const record of evidence) {
    const ids = evidenceByOwner.get(record.sut.owner) ?? new Set<string>();
    ids.add(record.evidenceId);
    evidenceByOwner.set(record.sut.owner, ids);
  }

  return [...catalog]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((record): BenchmarkOwnerCoverage => {
      const eligible = record.runtimeSurface === 'module' && record.plumbStatus === 'runtime';
      const benchmarks = [...(distributions.get(record.name) ?? [])].sort();
      const evidenceCount = evidenceByOwner.get(record.name)?.size ?? 0;
      const covered = benchmarks.length > 0 || evidenceCount > 0;
      return {
        packageName: record.name,
        directory: record.dir,
        eligible,
        status: eligible ? (covered ? 'covered' : 'uncovered') : 'not-eligible',
        distributionCount: benchmarks.length,
        evidenceCount,
        benchmarks,
      };
    });
}

/**
 * The PURE coverage fold. `governedSources` maps each governed bench file's
 * repo-relative path to its ALREADY comment-stripped (codeOnly) source. The
 * declared distributions are matched by `(file, name)` so two benches with the
 * same name in different files are distinct. Pure — no I/O, no clock.
 */
export function foldDeclaredDistributions(
  governedSources: ReadonlyMap<string, string>,
  declared: readonly BenchDistribution[],
  executionSources: ReadonlyMap<string, string> = governedSources,
): CoverageResult {
  const declaredKeys = new Set(declared.map((d) => `${d.file}::${d.name}`));
  const discoveredKeys = new Set<string>();
  const issues: CoverageIssue[] = [];
  let discoveredBenchCount = 0;

  for (const [file, codeOnlyText] of governedSources) {
    for (const bench of extractRegisteredBenches(codeOnlyText)) {
      discoveredBenchCount += 1;
      const key = `${file}::${bench.name}`;
      discoveredKeys.add(key);
      if (!declaredKeys.has(key)) {
        issues.push({
          kind: 'undeclared',
          name: bench.name,
          file,
          detail: `${file}:${bench.line} registers bench "${bench.name}" with NO declared input distribution. A benchmark result is invalid unless its input distribution is declared — add a BenchDistribution for it to benchmarks/distributions.json (name, file, inputSize, shape, replicates).`,
        });
      }
    }
  }

  for (const d of declared) {
    const key = `${d.file}::${d.name}`;
    // Only treat a declaration as orphaned when its FILE was actually scanned —
    // a declaration for a file outside the governed set is out of scope here, not
    // an orphan (the gate scopes to the files it was handed).
    if (governedSources.has(d.file) && !discoveredKeys.has(key)) {
      issues.push({
        kind: 'orphan',
        name: d.name,
        file: d.file,
        detail: `declared distribution "${d.name}" in ${d.file} maps to NO registered bench — the bench was renamed or removed and the declaration silently drifted. The declaration is the comparability anchor; a stale one points at nothing. Remove it or fix the name.`,
      });
      continue;
    }
    if (discoveredKeys.has(key)) {
      const qualification = qualifyBenchDistribution(d, (path) => executionSources.get(path));
      for (const issue of qualification.issues) {
        issues.push({
          kind: issue.kind,
          name: d.name,
          file: issue.file,
          detail: issue.detail,
        });
      }
    }
  }

  return { discoveredBenchCount, issues };
}

/**
 * Bench `.bench.ts` paths invoked by the root `pnpm bench` script (tsx targets only).
 * Used by meta guards to ensure declared distributions are executed somewhere.
 */
export function benchScriptTargets(repoRoot: string): readonly string[] {
  const pkgPath = resolve(repoRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> };
  const scripts = [pkg.scripts?.bench ?? '', pkg.scripts?.['bench:alloc'] ?? ''].join(' ');
  const matches: string[] = [...(scripts.match(/tests\/bench\/[^\s'"]+\.bench\.ts/g) ?? [])];
  if (pkg.scripts?.['bench:alloc']) {
    matches.push('tests/bench/allocation.bench.ts');
    matches.push('tests/bench/allocation-curves.bench.ts');
  }
  return [...new Set(matches)].sort();
}

/**
 * Declared distribution files with no execution path — neither `pnpm bench` nor the
 * generated capsule bench lane (`tests/generated/*.bench.ts`).
 */
export function distributionFilesWithoutExecutionPath(
  declared: readonly BenchDistribution[],
  benchScriptFiles: readonly string[],
): readonly string[] {
  const scriptSet = new Set(benchScriptFiles);
  const unique = [...new Set(declared.map((d) => d.file))];
  return unique.filter((file) => !scriptSet.has(file) && !file.startsWith('tests/generated/')).sort();
}

/**
 * The FILESYSTEM wrapper the bench-contracts script uses: read every governed
 * bench file under `tests/bench/`, strip comments via the ONE shared
 * {@link codeOnly}, and run the pure fold. The gate uses {@link foldDeclaredDistributions}
 * directly over its GateContext (no filesystem touch).
 */
export function verifyDeclaredDistributions(root: string, declared: readonly BenchDistribution[]): CoverageResult {
  const dir = resolve(root, BENCH_SOURCE_DIR);
  const governedSources = new Map<string, string>();
  const executionSources = new Map<string, string>();
  for (const abs of walkFiles(dir, { suffixes: ['.bench.ts'] })) {
    const entry = basename(abs);
    if (!isGovernedBenchFile(entry)) continue;
    const relativePath = `${BENCH_SOURCE_DIR}/${entry}`;
    const text = readFileSync(abs, 'utf8');
    const stripped = commentsBlanked(text);
    governedSources.set(relativePath, stripped);
    executionSources.set(relativePath, stripped);
  }
  for (const execution of declared.map((entry) => entry.execution)) {
    if (execution?.kind !== 'collector' || executionSources.has(execution.file)) continue;
    const absolute = resolve(root, execution.file);
    if (existsSync(absolute)) executionSources.set(execution.file, commentsBlanked(readFileSync(absolute, 'utf8')));
  }
  return foldDeclaredDistributions(governedSources, declared, executionSources);
}
