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
  ignoredTrackedFiles,
  layerFindings,
  populationParityFindings,
  scopedOutOfJudgment,
  staleUngovernedDeclarations,
  ungovernedTrackedFiles,
  type CoverageLayer,
} from '../../../scripts/lib/denominator-census.js';
import { SHIPPED_BIN_TSCONFIG, STANDALONE_CONTEXTS } from '../../../scripts/lib/shipped-source-typecheck.js';
import {
  createTrackedFileCensus,
  readIgnoredTrackedFiles,
  readTrackedFileCensus,
} from '../../../scripts/lib/tracked-subject-census.js';
import type { TrackedFileCensus } from '../../../scripts/lib/tracked-subject-census.js';
import {
  DEFAULT_GAUNTLET_GLOBS,
  LITESHIP_ASSURANCE_MAP,
  isGovernedTodoPath,
  levelOf,
  nodeContext,
  noUnregisteredTodoGate,
  rankOf,
} from '../../../packages/gauntlet/src/index.js';
import { OBLIGATION_SRC_ROOTS, collectSourceFiles } from '../../../packages/cli/src/internal/traceability.js';
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
 * The population the gauntlet actually judges — built by the PRODUCTION context
 * factory, never by restating its glob here. A change to `nodeContext`'s ignore
 * set or dotfile policy therefore moves this law with it, which is the whole
 * point: the law must track the judge, not a description of the judge.
 */
function judgedGauntletFiles(): readonly string[] {
  return nodeContext(REPO_ROOT, DEFAULT_GAUNTLET_GLOBS).files().map(posixPath);
}

/**
 * The same globs re-expanded WITH dotfiles.
 *
 * This is the one derivation that must NOT come from `nodeContext`: it exists to
 * compute the complement `nodeContext` refuses to answer for. `dot: false` is a
 * silent narrowing — a tracked source under a dot-directory is judged by nobody
 * and reported by nothing, so the only way to see it is to ask the question the
 * production factory declines to ask.
 */
function judgedIncludingDotfiles(): readonly string[] {
  return fg
    .sync([...DEFAULT_GAUNTLET_GLOBS], { cwd: REPO_ROOT, onlyFiles: true, unique: true, ignore: DERIVED, dot: true })
    .map(posixPath);
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
  '.gitignore':
    'git metadata with no source parser; what it can silently HIDE from every other tool is governed by the ignored-tracked law below',
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
  let ignoredTracked: readonly string[];

  beforeAll(async () => {
    // The repo root is passed EXPLICITLY: the reader's signature requires it, and
    // relying on the runner's cwd made the anchor depend on where vitest happened
    // to be invoked from — an accident, not a derivation.
    census = await readTrackedFileCensus(REPO_ROOT);
    ignoredTracked = await readIgnoredTrackedFiles(REPO_ROOT);
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
      {
        // Intent-debt governance judges published package source for
        // unregistered markers. Its population is the gauntlet's judged set
        // filtered by the gate's own shared predicate — the three configs below
        // are exactly the files whose edit moves it.
        id: 'todo-governance',
        configPaths: [
          'packages/gauntlet/src/gates/no-unregistered-todo.ts',
          'packages/gauntlet/src/runner.ts',
          'packages/gauntlet/src/assurance-map.ts',
        ],
        covered: judgedGauntletFiles().filter(isGovernedTodoPath),
        floor: 750,
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

  it('THE IGNORED-TRACKED LAW: no tracked file is also matched by an ignore rule', () => {
    const hidden = ignoredTrackedFiles(census, ignoredTracked);
    expect(
      hidden,
      `tracked file(s) every gitignore-respecting tool silently skips (${hidden.length}):\n` +
        `${hidden.join('\n')}\n` +
        'git keeps them because the INDEX wins the tie; ast-grep, ripgrep, and fast-glob never ask the ' +
        'index, so each one skips the file without a word. Narrow the ignore rule — the negation idiom ' +
        'is already used in .gitignore for the benchmarks ratchets — so the tools meant to govern it can see it.',
    ).toEqual([]);
  });

  it('THE PARITY LAW: the judge, the obligation ledger, and the anchor resolve ONE population', () => {
    // Three routes to the same set: the production context factory, the ledger's
    // own filesystem walk, and git. All three apply the gate's exported predicate;
    // none of them restates another's glob. Nothing previously proved they agree.
    const judged = judgedGauntletFiles().filter(isGovernedTodoPath);
    const anchored = census.paths.map(posixPath).filter(isGovernedTodoPath);
    const ledger = OBLIGATION_SRC_ROOTS.flatMap((root) => collectSourceFiles(REPO_ROOT, root)).map(posixPath);
    const findings = populationParityFindings([
      {
        id: 'todo-governance',
        leftLabel: "the gauntlet's judged set",
        left: judged,
        rightLabel: 'the tracked anchor',
        right: anchored,
      },
      {
        id: 'obligation-ledger',
        leftLabel: "the gauntlet's judged set",
        left: judged,
        rightLabel: "the obligation ledger's own walk",
        right: ledger,
      },
    ]);
    expect(findings, `population derivations disagree:\n${findings.join('\n')}`).toEqual([]);
    // Anti-vacuity: parity over an empty population is trivially true.
    expect(judged.length, 'the parity arms are empty, so they prove nothing').toBeGreaterThan(750);
  });

  it('no tracked source hides behind the judge’s dotfile blindness', () => {
    const judged = new Set(judgedGauntletFiles());
    const hidden = judgedIncludingDotfiles().filter((path) => !judged.has(path) && census.has(path));
    expect(
      hidden,
      `tracked source(s) matched by the judged globs but dropped by \`dot: false\` (${hidden.length}):\n` +
        `${hidden.join('\n')}\n` +
        'a source under a dot-directory is judged by nobody and reported by nothing',
    ).toEqual([]);
  });

  it('THE SCOPING LAW: no file the TODO gate is handed sits below the level that judges it', () => {
    // Level-scoping is applied AFTER the denominator is claimed, so a file demoted
    // below the gate's own level leaves the judged set with no finding, no floor
    // movement, and no record. Propagation may only ever RAISE, so pinning the base
    // map bounds the propagated case too.
    const floorRank = rankOf(noUnregisteredTodoGate.level);
    const dropped = scopedOutOfJudgment(
      judgedGauntletFiles().filter(isGovernedTodoPath),
      (path) => rankOf(levelOf(path, LITESHIP_ASSURANCE_MAP)),
      floorRank,
    );
    expect(
      dropped,
      `file(s) the TODO gate judges but its own ${noUnregisteredTodoGate.level} scoping discards ` +
        `(${dropped.length}):\n${dropped.slice(0, 40).join('\n')}\n` +
        'an unregistered marker in one of these ships invisibly',
    ).toEqual([]);
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

  it('a tracked file an ignore rule also matches is a finding; a declaration excuses it', () => {
    // The live corpus is clean once the ignore rule is narrowed, so these fixtures
    // are the teeth: an untracked ignored path is correctly NOT a finding (it is
    // just an ignored file), while a TRACKED one is the hole this law exists for.
    expect(ignoredTrackedFiles(census, ['b.ts', 'untracked/derived.js'])).toEqual(['b.ts']);
    expect(ignoredTrackedFiles(census, ['b.ts'], { 'b.ts': 'declared ignorable' })).toEqual([]);
    expect(ignoredTrackedFiles(census, [])).toEqual([]);
  });

  it('two derivations of one population that disagree are a finding in BOTH directions', () => {
    const pair = { id: 'p', leftLabel: 'left', rightLabel: 'right' } as const;
    expect(populationParityFindings([{ ...pair, left: ['a.ts', 'b.ts'], right: ['a.ts'] }])).toEqual([
      'p: 1 path(s) in left but absent from right (e.g. b.ts)',
    ]);
    // The mirrored arm is mandatory: a subset check would let the smaller side
    // shrink silently, which is the exact failure this law is aimed at.
    expect(populationParityFindings([{ ...pair, left: ['a.ts'], right: ['a.ts', 'b.ts'] }])).toEqual([
      'p: 1 path(s) in right but absent from left (e.g. b.ts)',
    ]);
    expect(populationParityFindings([{ ...pair, left: ['a.ts'], right: ['a.ts'] }])).toEqual([]);
  });

  it('a judged file below the judge’s own level is a finding', () => {
    const ranks: Readonly<Record<string, number>> = { 'a.ts': 0, 'b.ts': 2 };
    const rankOfPath = (path: string): number => ranks[path] ?? 0;
    expect(scopedOutOfJudgment(['a.ts', 'b.ts'], rankOfPath, 1)).toEqual(['a.ts']);
    expect(scopedOutOfJudgment(['b.ts'], rankOfPath, 1)).toEqual([]);
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
