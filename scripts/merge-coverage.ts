import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fg from 'fast-glob';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import { normalizeRepoPath } from '@liteship/audit'; // CUT B5b — one slash-normalize home
import { buildCoverageFacts, buildCoverageMetaArtifact } from './artifact-integrity.js';
import { ensureArtifactContext } from './artifact-context.js';
import { writeTextFile } from './audit/shared.js';
import { coverageExclude, coverageInclude, repoRoot } from '../vitest.shared.js';

const { createCoverageMap } = libCoverage;
const { createContext } = libReport;

type MetricKey = 'lines' | 'statements' | 'functions' | 'branches';

type MetricSummary = {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
};

type FileSummary = Record<MetricKey, MetricSummary>;

const coverageRoot = process.env['LITESHIP_COVERAGE_ROOT'] ?? resolve(repoRoot, 'coverage');
const nodeCoveragePath = resolve(coverageRoot, 'node', 'coverage-final.json');
const browserCoveragePath = resolve(coverageRoot, 'browser', 'coverage-final.json');
const mergedCoveragePath = resolve(coverageRoot, 'coverage-final.json');
const mergedCoverageMetaPath = resolve(coverageRoot, 'coverage-meta.json');

const TOTAL_THRESHOLDS: Record<MetricKey, number> = {
  lines: 90,
  statements: 90,
  functions: 90,
  branches: 80,
};

const PACKAGE_THRESHOLDS: Record<MetricKey, number> = {
  lines: 85,
  statements: 85,
  functions: 85,
  branches: 75,
};

const PACKAGE_THRESHOLD_OVERRIDES: Record<string, Partial<Record<MetricKey, number>>> = {
  core: {
    functions: 97,
  },
  web: {
    functions: 97,
  },
  // The former astro/genui/stage coverage-debt floors were retired once the debt
  // was paid down honestly: genui gained real catalog + validate/render/parse
  // branch tests, stage's headless video cast now drives the pose quantizer's
  // `evaluate` across a boundary crossing (folded into the artifact digest), and
  // astro's browser-only boot files are now counted from the browser pass (see
  // BROWSER_AUTHORITATIVE_FILES in the merge step below) instead of their
  // phantom near-0% node entries. All three clear PACKAGE_THRESHOLDS (85/85/85/75).
};

const FILE_THRESHOLDS: Record<string, Partial<Record<MetricKey, number>>> = {
  'packages/core/src/authoring/composable.ts': {
    lines: 95,
    statements: 95,
    functions: 95,
    branches: 95,
  },
  'packages/web/src/security/runtime-url.ts': {
    lines: 95,
    statements: 95,
    functions: 95,
    branches: 95,
  },
};

function readCoverage(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function pct(covered: number, total: number): number {
  if (total === 0) return 100;
  return Number(((covered / total) * 100).toFixed(2));
}

function normalizeMetric(summary: MetricSummary | Record<string, number | string>): MetricSummary {
  return {
    total: Number(summary.total),
    covered: Number(summary.covered),
    skipped: Number(summary.skipped),
    pct: Number(summary.pct),
  };
}

function summaryToObject(summary: { data: FileSummary } | FileSummary): FileSummary {
  const raw = 'data' in summary ? summary.data : summary;
  return {
    lines: normalizeMetric(raw.lines),
    statements: normalizeMetric(raw.statements),
    functions: normalizeMetric(raw.functions),
    branches: normalizeMetric(raw.branches),
  };
}

function formatMetric(name: MetricKey, summary: MetricSummary): string {
  const metric = normalizeMetric(summary);
  return `${name}: ${metric.pct.toFixed(2)}% (${metric.covered}/${metric.total})`;
}

function mergeMetric(target: MetricSummary, source: MetricSummary): void {
  target.total += source.total;
  target.covered += source.covered;
  target.skipped += source.skipped;
  target.pct = pct(target.covered, target.total);
}

function emptySummary(): FileSummary {
  return {
    lines: { total: 0, covered: 0, skipped: 0, pct: 100 },
    statements: { total: 0, covered: 0, skipped: 0, pct: 100 },
    functions: { total: 0, covered: 0, skipped: 0, pct: 100 },
    branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
  };
}

if (!existsSync(nodeCoveragePath)) {
  throw new Error(`Missing node coverage file at ${nodeCoveragePath}`);
}

// Files whose ONLY meaningful execution path is the browser runtime: they boot
// from a real DOM / custom-element / dynamic-import context that jsdom cannot
// drive, so the node pass instruments them (they are statically imported) but
// never executes them — leaving a near-0% node entry. The default merge rule
// below (drop any browser entry already present in node) would then keep that
// near-0% node entry and DISCARD the browser pass's real coverage, under-
// counting the file. For these files the BROWSER pass is authoritative: we
// remove their node entries before the merge so the browser entry survives.
// Matched by repo-relative suffix against the absolute coverage keys.
const BROWSER_AUTHORITATIVE_FILES: readonly string[] = [
  // @liteship/astro browser-boot surfaces — driven by tests/browser/astro-*.test.ts,
  // never executable in the node (jsdom) pass.
  'packages/astro/src/runtime/directive-boot.ts',
  'packages/astro/src/runtime/inspector.ts',
];

const isBrowserAuthoritative = (file: string): boolean => {
  const normalized = normalizeRepoPath(file);
  return BROWSER_AUTHORITATIVE_FILES.some((suffix) => normalized.endsWith(suffix));
};

const coverageMap = createCoverageMap({});
coverageMap.merge(readCoverage(nodeCoveragePath));

if (existsSync(browserCoveragePath)) {
  // Browser v8 (chromium + Vite transforms) and node v8 generate divergent
  // statementMaps for the same source file (different statement-counting
  // decisions), so unioning the two via CoverageMap.merge inflates the
  // denominator without backfilling hits — making well-covered node files
  // *appear* to drop coverage. Browser coverage exists to capture files that
  // only execute in the browser runtime (capture/, morph/, slot/, …); for
  // files already covered in-process by node tests the node result is
  // authoritative, and browser data is filtered out before the merge.
  //
  // EXCEPTION: browser-authoritative files (above) only execute in the browser,
  // so their node entry is a near-0% phantom. Drop those node entries first so
  // the browser pass's real coverage is the one that survives the merge.
  let promotedBrowserOnly = 0;
  coverageMap.filter((file) => {
    if (isBrowserAuthoritative(file)) {
      promotedBrowserOnly++;
      return false;
    }
    return true;
  });
  if (promotedBrowserOnly > 0) {
    console.log(
      `[merge-coverage] dropped ${promotedBrowserOnly} near-0% node entries for browser-authoritative files so the browser pass's coverage is counted`,
    );
  }

  const browserCoverage = readCoverage(browserCoveragePath);
  const nodeFiles = new Set(coverageMap.files());
  const browserFiltered: Record<string, unknown> = {};
  let droppedShared = 0;
  for (const [file, data] of Object.entries(browserCoverage)) {
    if (nodeFiles.has(file)) {
      droppedShared++;
      continue;
    }
    browserFiltered[file] = data;
  }
  if (droppedShared > 0) {
    console.log(
      `[merge-coverage] dropped ${droppedShared} browser file entries already covered in-process to avoid statementMap-divergence corruption`,
    );
  }
  coverageMap.merge(browserFiltered);
}

mkdirSync(coverageRoot, { recursive: true });
writeTextFile(mergedCoveragePath, JSON.stringify(coverageMap.toJSON(), null, 2));

const context = createContext({
  dir: coverageRoot,
  coverageMap,
});

reports.create('html').execute(context);
reports.create('lcovonly', { file: 'lcov.info' }).execute(context);
reports.create('text').execute(context);
reports.create('text-summary').execute(context);

const generatedAt = new Date().toISOString();
const artifactContext = ensureArtifactContext(repoRoot);
const coverageFacts = buildCoverageFacts(repoRoot);
const coverageMeta = buildCoverageMetaArtifact(coverageFacts, generatedAt, artifactContext);
writeTextFile(mergedCoverageMetaPath, JSON.stringify(coverageMeta, null, 2));

const totalSummary = summaryToObject(coverageMap.getCoverageSummary());
const packageSummaries = new Map<string, FileSummary>();
const zeroCoverageFiles: string[] = [];
const errors: string[] = [];
const runtimeFiles = fg
  .sync(coverageInclude, {
    cwd: repoRoot,
    absolute: true,
    onlyFiles: true,
    ignore: coverageExclude,
  })
  .map((file) => normalizeRepoPath(file));
const coveredFiles = new Set(coverageMap.files().map((file) => normalizeRepoPath(file)));
const missingRuntimeFiles = runtimeFiles.filter((file) => !coveredFiles.has(file));

// Build a set of explicitly-excluded files so we can skip them when walking
// the coverage map below. fast-glob with `ignore: coverageExclude` drops them
// from the runtime check; this set drops them from per-package totals and the
// zero-coverage drift guard so excluded runtime modules (subprocess-only
// bootstraps) don't poison the merged report.
const runtimeFilesSet = new Set(runtimeFiles);

for (const file of coverageMap.files()) {
  const normalized = normalizeRepoPath(file);
  // Files matched by an exclude pattern shouldn't contribute to package totals
  // or trip the zero-coverage drift guard.
  if (!runtimeFilesSet.has(normalized)) continue;
  // Distinct op (NOT slash normalization): regex prefix-trim to a packages/-relative
  // display key. A heuristic, not path.relative — left inline by design (CUT B5b).
  const relativePath = normalized.replace(/^.*?packages\//, 'packages/');
  const packageMatch = normalized.match(/packages\/([^/]+)\/src\//);
  const packageName = packageMatch?.[1] ?? 'other';
  const fileSummary = summaryToObject(coverageMap.fileCoverageFor(file).toSummary());

  const current = packageSummaries.get(packageName) ?? emptySummary();
  for (const key of Object.keys(current) as MetricKey[]) {
    mergeMetric(current[key], fileSummary[key]);
  }
  packageSummaries.set(packageName, current);

  if (fileSummary.lines.total > 0 && fileSummary.lines.covered === 0) {
    zeroCoverageFiles.push(normalized);
  }

  const fileThresholds = FILE_THRESHOLDS[relativePath];
  if (fileThresholds) {
    for (const key of Object.keys(fileThresholds) as MetricKey[]) {
      const threshold = fileThresholds[key];
      if (threshold !== undefined && fileSummary[key].pct < threshold) {
        errors.push(`File ${relativePath} ${key} coverage ${fileSummary[key].pct.toFixed(2)}% is below ${threshold}%.`);
      }
    }
  }
}

for (const key of Object.keys(TOTAL_THRESHOLDS) as MetricKey[]) {
  if (totalSummary[key].pct < TOTAL_THRESHOLDS[key]) {
    errors.push(`Merged ${key} coverage ${totalSummary[key].pct.toFixed(2)}% is below ${TOTAL_THRESHOLDS[key]}%.`);
  }
}

for (const [packageName, summary] of [...packageSummaries.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  for (const key of Object.keys(PACKAGE_THRESHOLDS) as MetricKey[]) {
    const threshold = PACKAGE_THRESHOLD_OVERRIDES[packageName]?.[key] ?? PACKAGE_THRESHOLDS[key];
    if (summary[key].pct < threshold) {
      errors.push(`Package ${packageName} ${key} coverage ${summary[key].pct.toFixed(2)}% is below ${threshold}%.`);
    }
  }
}

if (zeroCoverageFiles.length > 0) {
  errors.push(
    `Non-excluded runtime files still at 0% line coverage:\n${zeroCoverageFiles.map((file) => `  - ${file}`).join('\n')}`,
  );
}

if (missingRuntimeFiles.length > 0) {
  errors.push(
    `Runtime source files matched by coverage include globs but missing from coverage output:\n${missingRuntimeFiles
      .map((file) => `  - ${file.replace(/^.*?packages\//, 'packages/')}`)
      .join('\n')}`,
  );
}

console.log('\nMerged coverage totals:');
for (const key of Object.keys(totalSummary) as MetricKey[]) {
  console.log(`  ${formatMetric(key, totalSummary[key])}`);
}

console.log('\nPer-package coverage:');
for (const [packageName, summary] of [...packageSummaries.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${packageName}`);
  for (const key of Object.keys(summary) as MetricKey[]) {
    console.log(`    ${formatMetric(key, summary[key])}`);
  }
}

if (errors.length > 0) {
  console.error('\nCoverage gate failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
