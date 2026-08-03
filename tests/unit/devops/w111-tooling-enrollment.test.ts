/**
 * W1.11 tooling enrollment over the one tracked subject census.
 *
 * Every authority proves its real expanded population against the census. A
 * future fragment source, manifest-resolved bin, or executable root config
 * therefore reds until every tool admits it; a broad ignore cannot counterfeit
 * enrollment. Structural lint also reports its own per-file applicable-rule
 * count so scanning a path with zero rules is not accepted as green.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import { globSync } from 'fast-glob';
import { getFileInfo } from 'prettier';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { INVARIANTS, matchesInvariantExemption } from '@liteship/command';
import {
  collectInvariantSourceFiles,
  W111_INVARIANT_DECLARATION_FILES,
  W111_INVARIANT_ROOT_FILES,
} from '../../../packages/cli/src/commands/check-invariants.js';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';
import {
  W111_SUBJECT_FLOORS,
  buildW111SubjectCensus,
  readTrackedFileCensus,
} from '../../../scripts/lib/tracked-subject-census.js';
import { scriptArgvTokens, scriptQuotedTargets } from '../../support/repo-truths.js';
import { repositoryProofTimeout } from '../../../vitest.shared.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');

async function liveSubjects() {
  const tracked = await readTrackedFileCensus(REPO_ROOT);
  return buildW111SubjectCensus(tracked, (path) => readFileSync(resolve(REPO_ROOT, path), 'utf8'));
}

function expandedScriptTargets(scriptName: string): ReadonlySet<string> {
  return new Set(
    globSync(scriptQuotedTargets(scriptName), {
      cwd: REPO_ROOT,
      onlyFiles: true,
      unique: true,
      ignore: ['**/dist/**', '**/node_modules/**'],
    }).map((path) => path.replaceAll('\\', '/')),
  );
}

function expandedStructuralTargets(): ReadonlySet<string> {
  const targets = new Set(expandedScriptTargets('lint:structural'));
  for (const token of scriptArgvTokens('lint:structural')) {
    if (['packages', 'tests', 'scripts'].includes(token)) {
      for (const path of globSync(`${token}/**/*`, { cwd: REPO_ROOT, onlyFiles: true })) {
        targets.add(path.replaceAll('\\', '/'));
      }
    } else if (!token.includes('*') && existsSync(resolve(REPO_ROOT, token))) {
      targets.add(token.replaceAll('\\', '/'));
    }
  }
  return targets;
}

function missing(population: ReadonlySet<string>, expected: readonly string[]): readonly string[] {
  return expected.filter((path) => !population.has(path));
}

function defaultExportSites(paths: readonly string[]): readonly string[] {
  return paths.filter((path) => {
    const source = ts.createSourceFile(
      path,
      readFileSync(resolve(REPO_ROOT, path), 'utf8'),
      ts.ScriptTarget.Latest,
      false,
      path.endsWith('.tsx')
        ? ts.ScriptKind.TSX
        : path.endsWith('.jsx')
          ? ts.ScriptKind.JSX
          : /\.[cm]?js$/u.test(path)
            ? ts.ScriptKind.JS
            : ts.ScriptKind.TS,
    );
    return source.statements.some((statement) => ts.isExportAssignment(statement) && !statement.isExportEquals);
  });
}

describe('W1.11 lint, format, and structural authorities', () => {
  it('ESLint command and config admit every governed source', async () => {
    const subjects = await liveSubjects();
    const population = expandedScriptTargets('lint');
    expect(missing(population, subjects.governedSources), 'sources absent from the lint argv').toEqual([]);

    const eslint = new ESLint({ cwd: REPO_ROOT });
    const ignored: string[] = [];
    for (const path of subjects.governedSources) {
      if (await eslint.isPathIgnored(path)) ignored.push(path);
    }
    expect(ignored, 'governed sources ignored by ESLint configuration').toEqual([]);
  });

  it('Prettier command admits exactly its supported fragment partition plus every governed source', async () => {
    const subjects = await liveSubjects();
    const supportedFragments: string[] = [];
    const unsupportedFragments: string[] = [];
    for (const path of subjects.fragments) {
      const info = await getFileInfo(resolve(REPO_ROOT, path));
      (info.inferredParser === null ? unsupportedFragments : supportedFragments).push(path);
    }
    expect(supportedFragments.length).toBeGreaterThanOrEqual(71);
    expect([...supportedFragments, ...unsupportedFragments].sort()).toEqual(subjects.fragments);

    const expected = [
      ...new Set([...supportedFragments, ...subjects.shippedBins, ...subjects.rootExecutableConfigs]),
    ].sort();
    const format = expandedScriptTargets('format');
    const formatCheck = expandedScriptTargets('format:check');
    expect(missing(format, expected), 'Prettier-write argv misses supported W1.11 subjects').toEqual([]);
    expect(missing(formatCheck, expected), 'Prettier-check argv misses supported W1.11 subjects').toEqual([]);
    expect([...format].sort()).toEqual([...formatCheck].sort());
  });

  it(
    'registered ast-grep scan reaches every governed source with at least one applicable rule',
    async () => {
      const subjects = await liveSubjects();
      expect(subjects.governedSources.length).toBeGreaterThanOrEqual(
        W111_SUBJECT_FLOORS.fragmentSources +
          W111_SUBJECT_FLOORS.shippedBins +
          W111_SUBJECT_FLOORS.rootExecutableConfigs,
      );
      const scanPopulation = expandedStructuralTargets();
      expect(missing(scanPopulation, subjects.governedSources), 'sources absent from the ast-grep argv').toEqual([]);

      const result = await spawnArgvCapture(
        'pnpm',
        [
          'exec',
          'ast-grep',
          'scan',
          '-c',
          'sgconfig.yml',
          '--inspect',
          'entity',
          '--color',
          'never',
          ...subjects.governedSources,
        ],
        { cwd: REPO_ROOT, captureBytes: 4 * 1024 * 1024, timeoutMs: repositoryProofTimeout() },
      );
      expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
      const applied = new Map<string, number>();
      for (const match of result.stderr.matchAll(/entity\|file\|(.+?): language=\w+,appliedRuleCount=(\d+)/gu)) {
        applied.set(match[1]!.replaceAll('\\', '/'), Number(match[2]));
      }
      const vacuous = subjects.governedSources.filter((path) => (applied.get(path) ?? 0) < 1);
      expect(vacuous, `ast-grep inspection:\n${result.stderr}`).toEqual([]);
    },
    repositoryProofTimeout(),
  );

  it('the text scanners cover every governed source without a fragment-tree exemption', async () => {
    const subjects = await liveSubjects();
    const defaultExports = new Set(defaultExportSites(subjects.governedSources));
    expect([...W111_INVARIANT_ROOT_FILES].sort()).toEqual(subjects.rootExecutableConfigs);
    expect([...W111_INVARIANT_DECLARATION_FILES].sort()).toEqual(
      subjects.fragmentSources.filter((path) => path.endsWith('.d.ts')),
    );
    const scanned = new Set(
      collectInvariantSourceFiles(
        REPO_ROOT,
        ['packages'],
        [...W111_INVARIANT_ROOT_FILES, ...W111_INVARIANT_DECLARATION_FILES],
      ).map((path) => path.slice(REPO_ROOT.length + 1).replaceAll('\\', '/')),
    );
    expect(missing(scanned, subjects.governedSources), 'sources absent from the production text scanner').toEqual([]);
    for (const invariant of INVARIANTS.filter((entry) => entry.name !== 'NO_SIGNAL_INPUT_REPARSE')) {
      const covered = subjects.governedSources.filter(
        (path) =>
          W111_INVARIANT_ROOT_FILES.includes(path as (typeof W111_INVARIANT_ROOT_FILES)[number]) ||
          invariant.dirs.some((dir) => path === dir || path.startsWith(`${dir}/`)),
      );
      const exempt = covered.filter((path) =>
        (invariant.exemptions ?? []).some((entry) => matchesInvariantExemption(path, entry)),
      );
      expect(missing(new Set(covered), subjects.governedSources), `${invariant.name} scanner coverage`).toEqual([]);
      expect(
        exempt.filter((path) => !defaultExports.has(path)),
        `${invariant.name} unexplained governed-source exemptions`,
      ).toEqual([]);
    }
  });

  it('the 15 required default-export configs have exact file, owner, and role reasons', async () => {
    const subjects = await liveSubjects();
    const sites = defaultExportSites(subjects.governedSources);
    expect(sites).toHaveLength(15);

    const invariant = INVARIANTS.find((entry) => entry.name === 'NO_DEFAULT_EXPORT');
    expect(invariant).toBeDefined();
    const exact = (invariant!.exemptions ?? []).filter((entry) => entry.scope === 'file' && sites.includes(entry.path));
    expect(exact.map((entry) => entry.path).sort()).toEqual(sites);
    for (const entry of exact) {
      expect(entry.owner, entry.path).not.toHaveLength(0);
      expect(entry.reason, entry.path).toMatch(/requires|contract|configuration/u);
    }
  });
});
