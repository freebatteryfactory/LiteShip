import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildFacadeEdgeReceipt,
  buildSourceLayoutReceipt,
  domainContentModules,
  enumerateGovernedFacades,
  evaluateDomainDirectory,
  FACADE_RULE_PATH,
  findDomainDirectoryGraduationFindings,
  findFacadeInboundEdgeFindings,
} from '../../../scripts/lib/source-layout-contract.js';
import { repositoryProofTimeout } from '../../../vitest.shared.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const fixtureRoots: string[] = [];

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function layoutFixture(): { readonly domain: string; readonly root: string } {
  const root = mkdtempSync(resolve(tmpdir(), 'liteship-source-layout-'));
  const domain = resolve(root, 'packages', 'faux', 'src', 'domain');
  fixtureRoots.push(root);
  mkdirSync(domain, { recursive: true });
  writeFileSync(resolve(domain, 'index.ts'), "export { value } from './runtime.js';\n", 'utf8');
  return { domain, root };
}

describe('domain-directory graduation — the SECOND module earns the directory', () => {
  it('RED: an index facade plus one implementation remains a singleton', () => {
    const finding = evaluateDomainDirectory({
      directory: 'packages/faux/src/ecs',
      facade: 'packages/faux/src/ecs/index.ts',
      contentModules: ['index.ts', 'runtime.ts'],
    });

    expect(finding).toEqual({
      code: 'singleton-domain-directory',
      directory: 'packages/faux/src/ecs',
      facade: 'packages/faux/src/ecs/index.ts',
      contentModules: ['runtime.ts'],
    });
  });

  it('RED: a singleton without an index facade remains an enumerated subject', () => {
    expect(
      evaluateDomainDirectory({
        directory: 'packages/faux/src/private-subject',
        facade: null,
        contentModules: ['implementation.ts'],
      }),
    ).toEqual({
      code: 'singleton-domain-directory',
      directory: 'packages/faux/src/private-subject',
      facade: null,
      contentModules: ['implementation.ts'],
    });
  });

  it('GREEN: two semantic owners earn the directory while facades and declarations do not', () => {
    expect(
      evaluateDomainDirectory({
        directory: 'packages/faux/src/ecs',
        facade: 'packages/faux/src/ecs/index.ts',
        contentModules: ['index.ts', 'part.ts', 'world.ts', 'protocol.d.ts', 'nested/index.ts'],
      }),
    ).toBeUndefined();
    expect(domainContentModules(['index.ts', 'nested/index.ts', 'protocol.d.ts', 'part.ts', 'world.ts'])).toEqual([
      'part.ts',
      'world.ts',
    ]);
  });

  it('MUTATION: the live filesystem census stays red until a second content owner exists', () => {
    const { domain, root } = layoutFixture();
    writeFileSync(resolve(domain, 'runtime.ts'), 'export const value = 1;\n', 'utf8');
    mkdirSync(resolve(domain, 'nested'));
    writeFileSync(resolve(domain, 'nested', 'index.ts'), "export { value } from '../runtime.js';\n", 'utf8');
    writeFileSync(resolve(domain, 'protocol.d.ts'), 'export interface Protocol {}\n', 'utf8');

    const red = findDomainDirectoryGraduationFindings(root);
    expect(red).toHaveLength(1);
    expect(red[0]?.contentModules).toEqual(['runtime.ts']);

    writeFileSync(resolve(domain, 'part.ts'), 'export interface Part { readonly name: string }\n', 'utf8');
    expect(findDomainDirectoryGraduationFindings(root)).toEqual([]);

    rmSync(resolve(domain, 'runtime.ts'));
    expect(findDomainDirectoryGraduationFindings(root)).toHaveLength(1);
  });

  it('RECEIPT: subject coverage is complete, ordered, and content-addressed without requiring facades', () => {
    const { domain, root } = layoutFixture();
    writeFileSync(resolve(domain, 'runtime.ts'), 'export const value = 1;\n', 'utf8');
    const noFacade = resolve(root, 'packages', 'faux', 'src', 'private-subject');
    mkdirSync(noFacade);
    writeFileSync(resolve(noFacade, 'owner.ts'), 'export const owner = true;\n', 'utf8');

    const first = buildSourceLayoutReceipt(root);
    const second = buildSourceLayoutReceipt(root);
    expect(first).toEqual(second);
    expect(first.enumerator).toBe('immediate-package-source-directories');
    expect(first.censusDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(first.subjects.map(({ directory }) => directory)).toEqual([
      'packages/faux/src/domain',
      'packages/faux/src/private-subject',
    ]);
    expect(first.subjects[1]?.facade).toBeNull();
    expect(first.findings).toHaveLength(2);
  });

  it('LIVE: the repository contains no singleton domain directory', () => {
    expect(findDomainDirectoryGraduationFindings(REPO)).toEqual([]);
  });
});

/**
 * Build a synthetic package tree whose facade rule is a copy of the real one, so
 * the fixture proves the same derivation path the live gate walks.
 */
function edgeFixture(options: { readonly consumerSpecifier: string; readonly ruleSource?: string }): string {
  const root = mkdtempSync(resolve(tmpdir(), 'liteship-facade-edge-'));
  fixtureRoots.push(root);
  const src = resolve(root, 'packages', 'faux', 'src');
  mkdirSync(resolve(src, 'domain'), { recursive: true });
  mkdirSync(resolve(src, 'sibling'), { recursive: true });
  mkdirSync(resolve(root, 'sgrules'), { recursive: true });
  writeFileSync(
    resolve(root, 'sgrules', 'facade-only-reexports.yml'),
    options.ruleSource ?? readFileSync(resolve(REPO, ...FACADE_RULE_PATH.split('/')), 'utf8'),
    'utf8',
  );
  writeFileSync(
    resolve(root, 'packages', 'faux', 'package.json'),
    `${JSON.stringify({ name: '@liteship/faux', exports: { '.': { import: './dist/index.js' } } }, null, 2)}\n`,
    'utf8',
  );
  writeFileSync(resolve(src, 'index.ts'), "export { owner } from './domain/index.js';\n", 'utf8');
  writeFileSync(
    resolve(src, 'domain', 'index.ts'),
    "export { owner } from './owner.js';\nexport { second } from './second.js';\n",
    'utf8',
  );
  writeFileSync(resolve(src, 'domain', 'owner.ts'), 'export const owner = 1;\n', 'utf8');
  writeFileSync(resolve(src, 'domain', 'second.ts'), 'export const second = 2;\n', 'utf8');
  writeFileSync(
    resolve(src, 'sibling', 'consumer.ts'),
    `import { owner } from '${options.consumerSpecifier}';\nexport const used = owner;\nexport const also = owner;\n`,
    'utf8',
  );
  writeFileSync(resolve(src, 'sibling', 'other.ts'), 'export const other = 3;\n', 'utf8');
  return root;
}

describe('facade inbound edges — zero facade imports from concrete files (anti-cycle law)', () => {
  it('RED: a concrete sibling reaching a governed domain facade is named with its line and specifier', () => {
    const root = edgeFixture({ consumerSpecifier: '../domain/index.js' });

    expect(findFacadeInboundEdgeFindings(root)).toEqual([
      {
        code: 'facade-import-from-concrete-file',
        importer: 'packages/faux/src/sibling/consumer.ts',
        facade: 'packages/faux/src/domain/index.ts',
        specifier: '../domain/index.js',
        line: 1,
      },
    ]);
  });

  it('GREEN: the same import repointed at the concrete owner clears the finding', () => {
    expect(findFacadeInboundEdgeFindings(edgeFixture({ consumerSpecifier: '../domain/owner.js' }))).toEqual([]);
  });

  it('GREEN: a published entry point composing its own domain facades is the grammar working', () => {
    const receipt = buildFacadeEdgeReceipt(edgeFixture({ consumerSpecifier: '../domain/owner.js' }));

    // packages/faux/src/index.ts imports './domain/index.js' and is an `exports` target.
    expect(receipt.entryPoints).toEqual(['packages/faux/src/index.ts']);
    expect(receipt.importers).not.toContain('packages/faux/src/index.ts');
    expect(receipt.findings).toEqual([]);
  });

  it('DERIVED: the governed set follows the rule file rather than an authored roster', () => {
    const withoutDomainGlob = edgeFixture({
      consumerSpecifier: '../domain/index.js',
      ruleSource: "id: facade-only-reexports\nfiles:\n  - '**/packages/core/src/index.ts'\n",
    });
    expect(enumerateGovernedFacades(withoutDomainGlob)).toEqual([]);
    expect(findFacadeInboundEdgeFindings(withoutDomainGlob)).toEqual([]);

    const ignored = edgeFixture({
      consumerSpecifier: '../domain/index.js',
      ruleSource:
        "id: facade-only-reexports\nfiles:\n  - '**/packages/*/src/*/index.ts'\nignores:\n  - '**/packages/faux/src/domain/index.ts'\n",
    });
    expect(enumerateGovernedFacades(ignored)).toEqual([]);
    expect(findFacadeInboundEdgeFindings(ignored)).toEqual([]);

    const governed = edgeFixture({
      consumerSpecifier: '../domain/index.js',
      ruleSource: "id: facade-only-reexports\nfiles:\n  - '**/packages/*/src/*/index.ts'\n",
    });
    expect(enumerateGovernedFacades(governed)).toEqual(['packages/faux/src/domain/index.ts']);
    expect(findFacadeInboundEdgeFindings(governed)).toHaveLength(1);
  });

  it('FAIL-CLOSED: a missing or glob-less rule file throws instead of reporting an empty population', () => {
    const emptyRule = edgeFixture({
      consumerSpecifier: '../domain/index.js',
      ruleSource: 'id: facade-only-reexports\nseverity: error\n',
    });
    expect(() => enumerateGovernedFacades(emptyRule)).toThrow(/declares no `files:` globs/);

    const absent = edgeFixture({ consumerSpecifier: '../domain/index.js' });
    rmSync(resolve(absent, 'sgrules'), { recursive: true, force: true });
    expect(() => enumerateGovernedFacades(absent)).toThrow(/facade rule is missing/);
  });

  it(
    'LIVE: the repository has zero facade inbound edges over a non-trivial derived population',
    () => {
      const receipt = buildFacadeEdgeReceipt(REPO);

      expect(receipt.rule).toBe(FACADE_RULE_PATH);
      // Sanity floors: a broken glob read must not pass as "nothing to govern".
      expect(receipt.facades.length).toBeGreaterThan(30);
      expect(receipt.entryPoints.length).toBeGreaterThan(50);
      expect(receipt.importers.length).toBeGreaterThan(500);
      // The domain created after the grammar sweep is governed by derivation alone.
      expect(receipt.facades).toContain('packages/core/src/ecs/index.ts');
      expect(receipt.findings).toEqual([]);
      expect(buildFacadeEdgeReceipt(REPO).censusDigest).toBe(receipt.censusDigest);
    },
    repositoryProofTimeout(),
  );
});
