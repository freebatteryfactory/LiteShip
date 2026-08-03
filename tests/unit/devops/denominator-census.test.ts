/**
 * W1.3 — THE DENOMINATOR LAW. Every governing layer answers for its population.
 *
 * Each gate here reports a NUMERATOR against a denominator nobody checks. A
 * layer whose config resolves to zero files reports zero findings and is read
 * as a pass; a layer whose glob silently narrows keeps passing while covering
 * less. Three instances of that class have shipped in this repository —
 * `tsconfig.scripts.json` resolving an empty file set, the `fragments/` tree
 * sitting outside every tool, and config files governing populations while
 * nothing governed them — and each was found by a person, after the fact.
 *
 * The adapters below COMPUTE each layer's covered set from that layer's OWN
 * config (the lint script's globs run through ESLint's own ignore resolution,
 * the format script's globs through Prettier's, the Vitest includes through
 * the same constants the configs consume) rather than restating what the
 * coverage is believed to be. A restatement drifts silently; a derivation
 * cannot.
 *
 * The fourth obligation is the load-bearing one. Non-vacuity, floors, and
 * config governance are all stated from inside a layer's own opinion of itself,
 * so a source file that NO config mentions is absent from every covered set and
 * invisible to all three at once. Only a comparison against the tracked anchor
 * finds it — which is how this law's first run found the entire `examples/`
 * tree (60 authored sources) linted by nothing, formatted by nothing, and
 * scanned by nothing.
 *
 * @module
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import fg from 'fast-glob';
import { getFileInfo } from 'prettier';
import {
  configGovernanceFindings,
  layerFindings,
  staleUngovernedDeclarations,
  ungovernedTrackedFiles,
  type CoverageLayer,
} from '../../../scripts/lib/denominator-census.js';
import { SHIPPED_BIN_TSCONFIG, STANDALONE_CONTEXTS } from '../../../scripts/lib/shipped-source-typecheck.js';
import { createTrackedFileCensus, readTrackedFileCensus } from '../../../scripts/lib/tracked-subject-census.js';
import type { TrackedFileCensus } from '../../../scripts/lib/tracked-subject-census.js';
import {
  rootManifest,
  rootTsconfigReferenceDirs,
  scriptArgvTokens,
  scriptQuotedTargets,
  typecheckScript,
} from '../../support/repo-truths.js';
import {
  browserTestInclude,
  coverageExclude,
  coverageInclude,
  nodeTestInclude,
  repositoryProofTimeout,
} from '../../../vitest.shared.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DERIVED = ['**/dist/**', '**/node_modules/**'];

const posixPath = (path: string): string => path.split('\\').join('/');

function expand(globs: readonly string[]): readonly string[] {
  return fg.sync([...globs], { cwd: REPO_ROOT, onlyFiles: true, unique: true, ignore: DERIVED }).map(posixPath);
}

/**
 * Tracked files a layer's own tooling admits, derived by ASKING that tooling —
 * never by restating the glob in this file, which would drift the moment the
 * script changed and is exactly the shape the law exists to refuse.
 */
async function eslintCovered(): Promise<readonly string[]> {
  const eslint = new ESLint({ cwd: REPO_ROOT });
  const covered: string[] = [];
  for (const path of expand(scriptQuotedTargets('lint'))) {
    if (!(await eslint.isPathIgnored(resolve(REPO_ROOT, path)))) covered.push(path);
  }
  return covered;
}

async function prettierCovered(): Promise<readonly string[]> {
  const covered: string[] = [];
  for (const path of expand(scriptQuotedTargets('format'))) {
    const info = await getFileInfo(resolve(REPO_ROOT, path), {
      ignorePath: resolve(REPO_ROOT, '.prettierignore'),
    });
    if (!info.ignored && info.inferredParser !== null) covered.push(path);
  }
  return covered;
}

/**
 * ast-grep takes bare PATH arguments rather than globs, so its population comes
 * from the argv the script actually passes. A directory token contributes its
 * tracked tree; a file token contributes itself. `-c sgconfig.yml` names the
 * ruleset, not a scan target, so the flag and its value are skipped.
 */
function structuralCovered(census: TrackedFileCensus): readonly string[] {
  const covered = new Set(expand(scriptQuotedTargets('lint:structural')));
  const tokens = scriptArgvTokens('lint:structural');
  for (const [index, token] of tokens.entries()) {
    if (token.includes('*') || token.startsWith('-')) continue;
    if (tokens[index - 1]?.startsWith('-')) continue; // a flag's value, not a target
    const absolute = resolve(REPO_ROOT, token);
    if (!existsSync(absolute)) continue;
    if (statSync(absolute).isDirectory()) {
      for (const path of fg.sync(`${token}/**/*`, { cwd: REPO_ROOT, onlyFiles: true, ignore: DERIVED })) {
        if (census.has(posixPath(path))) covered.add(posixPath(path));
      }
    } else if (census.has(token)) {
      covered.add(token);
    }
  }
  return [...covered];
}

function coverageCovered(): readonly string[] {
  const covered = new Set(expand(coverageInclude));
  for (const path of expand(coverageExclude)) covered.delete(path);
  return [...covered];
}

/**
 * The ast-grep RULESET is its own population: `sgconfig.yml` names the
 * directories it loads rules from, so the rules are derived from that
 * declaration rather than from a second hand-written list here.
 */
function ruleDirCovered(census: TrackedFileCensus): readonly string[] {
  const config = readFileSync(resolve(REPO_ROOT, 'sgconfig.yml'), 'utf8');
  const ruleDirs = /^ruleDirs:\s*$((?:\s*-\s*\S+\s*$)+)/mu
    .exec(config)?.[1]
    ?.split('\n')
    .map((line) => /^\s*-\s*(\S+)\s*$/u.exec(line)?.[1])
    .filter((entry): entry is string => entry !== undefined);
  expect(ruleDirs, 'sgconfig.yml declares no ruleDirs — the ruleset population is unreadable').toBeDefined();
  return (ruleDirs ?? [])
    .flatMap((dir) => fg.sync(`${dir}/**/*`, { cwd: REPO_ROOT, onlyFiles: true, ignore: DERIVED }))
    .map(posixPath)
    .filter((path) => census.has(path));
}

/** Authored prose: the doc-link authority walks every tracked markdown file. */
function markdownCovered(census: TrackedFileCensus): readonly string[] {
  return census.paths.map(posixPath).filter((path) => path.endsWith('.md'));
}

/**
 * The TypeScript project files the root `typecheck` script actually names,
 * plus the base config they extend — derived from the script body, so a leg
 * added or removed moves this population with it.
 */
function tsconfigProjectCovered(census: TrackedFileCensus): readonly string[] {
  // The root script delegates through `pnpm run <leg>`, so the project names
  // live in the legs' bodies. Follow the references rather than restating them.
  const scripts = rootManifest().scripts;
  const seen = new Set<string>();
  const bodies: string[] = [];
  const collect = (body: string): void => {
    bodies.push(body);
    for (const match of body.matchAll(/pnpm run ([\w:-]+)/gu)) {
      const leg = match[1]!;
      if (seen.has(leg)) continue;
      seen.add(leg);
      const nested = scripts[leg];
      if (nested !== undefined) collect(nested);
    }
  };
  collect(typecheckScript());

  // A leg may invoke a script that names further projects (the shipped-sources
  // typecheck resolves fragment and bin projects itself), so read those scripts
  // too rather than restating their project list here.
  for (const token of bodies.flatMap((body) => body.split(/\s+/u)).map(posixPath)) {
    if (/^scripts\/[\w.-]+\.ts$/u.test(token) && existsSync(resolve(REPO_ROOT, token))) {
      bodies.push(readFileSync(resolve(REPO_ROOT, token), 'utf8'));
    }
  }

  const named = bodies
    .flatMap((body) => body.split(/[\s'"`]+/u))
    .map(posixPath)
    .filter((token) => /^tsconfig[\w.-]*\.json$/u.test(token));
  const covered = new Set(named.filter((path) => census.has(path)));
  // The standalone fragment projects and the shipped-bin project are named by
  // the shipped-source typecheck authority itself — imported, not re-listed.
  for (const path of [SHIPPED_BIN_TSCONFIG, ...STANDALONE_CONTEXTS.map((entry) => entry.configPath)]) {
    if (census.has(path)) covered.add(path);
  }
  // `--build` drives the root project and every project it references.
  if (census.has('tsconfig.json')) covered.add('tsconfig.json');
  for (const dir of rootTsconfigReferenceDirs()) {
    const referenced = posixPath(`${dir.replace(/^\.\//u, '').replace(/\/$/u, '')}/tsconfig.json`);
    if (census.has(referenced)) covered.add(referenced);
  }
  // A project is only as governed as the base it inherits; include any tracked
  // tsconfig those legs extend so a shared base cannot sit outside the census.
  for (const path of [...covered]) {
    const extended = posixPath(
      /"extends"\s*:\s*"([^"]+)"/u.exec(readFileSync(resolve(REPO_ROOT, path), 'utf8'))?.[1] ?? '',
    ).replace(/^\.\//u, '');
    if (extended.length > 0 && census.has(extended)) covered.add(extended);
  }
  return [...covered];
}

/**
 * Tracked files no layer governs, each with the reason it is exempt.
 *
 * A reason must say why the file CANNOT be governed, not that governing it is
 * inconvenient. `.astro` is here because Prettier and ESLint both need a
 * third-party Astro parser to read one and the batch forbids new dependencies —
 * a real constraint. The binary and metadata rows carry no ECMAScript for any
 * of these layers to check.
 */
const DECLARED_UNGOVERNED: Readonly<Record<string, string>> = {
  '.editorconfig': 'editor metadata in INI; no layer here has a parser for it',
  '.gitattributes': 'git metadata consumed by git itself, not a checkable source',
  '.gitignore': 'git metadata consumed by git itself, not a checkable source',
  '.nvmrc': 'a bare version string with no syntax for any layer to check',
  '.prettierrc': 'the formatter cannot format the rc that configures it without reading its own output',
  '.prettierignore': 'the ignore list itself; pinned exactly by tests/unit/devops/format-tree-parity.test.ts',
  'pnpm-lock.yaml': 'a generated lockfile whose authority is the install resolution, not a formatter',
  '.devcontainer': 'container build metadata (Dockerfile, shell, JSON) outside every source layer',
  '.github': 'workflow and repository metadata; governed by the CI-contract laws in tests/unit/devops/',
  LICENSE: 'the license text; its integrity is a publish-time concern, not a source layer',
  benchmarks: 'committed baselines and ratchets; each is read and range-validated by its own gauntlet gate',
  'package.json': 'the manifest that DEFINES several layers; governed by gen-roster projections and the roster laws',
  'pnpm-workspace.yaml': 'workspace membership; governed by the doctor workspace probes and gen-roster',
  'rust-toolchain.toml': 'the pinned Rust toolchain; governed by the rust qualification laws and the CI Rust lane',
  'sgconfig.yml': 'the ast-grep ruleset entry point; its ruleDirs ARE the ast-grep-rules layer derived above',
  'tsdoc.json': 'TSDoc tag configuration consumed by TypeDoc; governed by the docs:check projection proof',
  'typedoc.json': 'a gen-roster projection; governed by tests/unit/devops/roster-projection-freshness.test.ts',
  crates: 'Rust sources; governed by the rustfmt and clippy lanes proven green in rust-wasm-parity',
  traceability: 'generated ratchets and receipts; each carries a named drift authority in the artifact registry',
};

describe('W1.3 THE DENOMINATOR LAW: every layer answers for its own population', () => {
  let census: TrackedFileCensus;
  let layers: readonly CoverageLayer[];

  beforeAll(async () => {
    census = await readTrackedFileCensus();
    layers = [
      {
        id: 'eslint',
        configPaths: ['eslint.config.js', 'package.json'],
        covered: await eslintCovered(),
        floor: 2_000,
      },
      {
        id: 'prettier',
        configPaths: ['.prettierrc', '.prettierignore', 'package.json'],
        covered: await prettierCovered(),
        floor: 2_100,
      },
      {
        id: 'ast-grep',
        configPaths: ['sgconfig.yml', 'package.json'],
        covered: structuralCovered(census),
        floor: 2_100,
      },
      {
        id: 'vitest-node',
        configPaths: ['vitest.config.ts', 'vitest.shared.ts'],
        covered: expand(nodeTestInclude),
        floor: 1_000,
      },
      {
        id: 'vitest-browser',
        configPaths: ['vitest.browser.config.ts', 'vitest.shared.ts'],
        covered: expand(browserTestInclude),
        floor: 14,
      },
      {
        id: 'coverage',
        configPaths: ['vitest.shared.ts'],
        covered: coverageCovered(),
        floor: 690,
      },
      {
        id: 'ast-grep-rules',
        configPaths: ['sgconfig.yml'],
        covered: ruleDirCovered(census),
        floor: 20,
      },
      {
        id: 'doc-links',
        configPaths: ['scripts/lib/doc-registry.ts'],
        covered: markdownCovered(census),
        floor: 25,
      },
      {
        id: 'tsconfig-projects',
        configPaths: ['package.json'],
        covered: tsconfigProjectCovered(census),
        floor: 5,
      },
    ];
  }, repositoryProofTimeout());

  it('the anchor is one real tracked census, not a glob of the working tree', () => {
    expect(census.paths.length, 'git ls-files returned nothing').toBeGreaterThan(2_000);
    expect(census.has('package.json')).toBe(true);
    // A gitignored generated tree is NOT tracked, so it can never inflate a
    // denominator — the property that makes this set the honest anchor.
    expect(census.has('docs/api/index.md')).toBe(false);
  });

  it('every layer is non-vacuous, at or above its floor, and counts only tracked files', () => {
    const findings = layerFindings(layers, census);
    expect(
      findings.map((finding) => finding.detail),
      'a layer that resolves nothing reports nothing and reads as a pass',
    ).toEqual([]);
  });

  it('THE CONFIG GOVERNANCE LAW: no config decides a population while sitting in none', () => {
    const findings = configGovernanceFindings(layers, DECLARED_UNGOVERNED);
    expect(
      findings,
      `config file(s) governed by nothing:\n${findings.join('\n')}\n` +
        'the one file whose edit silently changes what gets checked must itself be checked',
    ).toEqual([]);
  });

  it('THE ANCHOR LAW: every tracked file is governed by a layer or declared with a reason', () => {
    const ungoverned = ungovernedTrackedFiles(census, layers, DECLARED_UNGOVERNED);
    expect(
      ungoverned,
      `tracked file(s) governed by NO layer and declared by nothing (${ungoverned.length}):\n` +
        `${ungoverned.slice(0, 40).join('\n')}\n` +
        'enroll them in a layer, or declare them with the reason they cannot be governed',
    ).toEqual([]);
  });

  it('no declared exemption describes files that are governed, or no files at all', () => {
    // The complement, so the exemption list cannot rot into a denylist that
    // quietly excuses files a layer has since picked up.
    const stale = staleUngovernedDeclarations(census, layers, DECLARED_UNGOVERNED);
    expect(stale, `stale ungoverned declaration(s):\n${stale.join('\n')}`).toEqual([]);
  });

  it('every declared exemption states a reason', () => {
    for (const [entry, reason] of Object.entries(DECLARED_UNGOVERNED)) {
      expect(reason.length, `${entry} is exempt with no reason`).toBeGreaterThan(20);
    }
  });
});

describe('the denominator law reds on each failure mode it claims to catch', () => {
  const census = createTrackedFileCensus(['a.ts', 'b.ts', 'cfg.json']);
  const healthy: CoverageLayer = { id: 'ok', configPaths: ['cfg.json'], covered: ['a.ts', 'cfg.json'], floor: 2 };

  it('an EMPTY layer is a finding — zero findings over zero inputs is not a pass', () => {
    const findings = layerFindings([{ ...healthy, id: 'empty', covered: [], floor: 0 }], census);
    expect(findings.map((finding) => finding.reason)).toEqual(['empty']);
  });

  it('a layer that SHRANK below its floor is a finding', () => {
    const findings = layerFindings([{ ...healthy, id: 'shrunk', covered: ['a.ts'], floor: 2 }], census);
    expect(findings.map((finding) => finding.reason)).toEqual(['below-floor']);
  });

  it('a layer inflating its denominator with UNTRACKED paths is a finding', () => {
    const findings = layerFindings(
      [{ ...healthy, id: 'inflated', covered: ['a.ts', 'dist/derived.js'], floor: 2 }],
      census,
    );
    expect(findings.map((finding) => finding.reason)).toEqual(['untracked-coverage']);
  });

  it('a config governed by nothing is a finding, and one governed by any layer is not', () => {
    expect(configGovernanceFindings([{ ...healthy, configPaths: ['unwatched.json'] }])).toEqual([
      'unwatched.json (governs ok, governed by nothing)',
    ]);
    expect(configGovernanceFindings([healthy])).toEqual([]);
  });

  it('an unclassified tracked file is a finding until a layer covers it or a reason declares it', () => {
    expect(ungovernedTrackedFiles(census, [healthy], {})).toEqual(['b.ts']);
    expect(ungovernedTrackedFiles(census, [healthy], { 'b.ts': 'declared' })).toEqual([]);
    // A directory declaration covers its members, so an exemption is stated once.
    const nested = createTrackedFileCensus(['a.ts', 'vendor/x.ts', 'vendor/deep/y.ts']);
    expect(ungovernedTrackedFiles(nested, [{ ...healthy, covered: ['a.ts'] }], { vendor: 'third party' })).toEqual([]);
  });

  it('a stale exemption is a finding in both directions', () => {
    // Declared but every member is now governed.
    expect(staleUngovernedDeclarations(census, [{ ...healthy, covered: ['a.ts', 'b.ts'] }], { 'b.ts': 'r' })).toEqual([
      'b.ts (declared ungoverned but every member is now covered)',
    ]);
    // Declared but the path no longer exists.
    expect(staleUngovernedDeclarations(census, [healthy], { 'gone.ts': 'r' })).toEqual([
      'gone.ts (declared ungoverned but tracks no files)',
    ]);
  });
});
