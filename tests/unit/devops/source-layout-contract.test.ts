import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildSourceLayoutReceipt,
  domainContentModules,
  evaluateDomainDirectory,
  findDomainDirectoryGraduationFindings,
} from '../../../scripts/lib/source-layout-contract.js';

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

describe('ADR-0045 domain-directory graduation', () => {
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
