// PROVES: INV-FACADE-EXPORT-BUDGET
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { facadeExportBudgetGate, memoryContext, type Finding } from '@liteship/gauntlet';
import {
  FACADE_SUBPATH_CONTRACT_SOURCE,
  ROOT_EXPORT_CONTRACT_SOURCE,
} from '../../packages/liteship/src/export-budget.js';

const BUDGET_FILE = 'packages/liteship/src/export-budget.ts';
const ROOT_DTS_FILE = 'packages/liteship/dist/index.d.ts';
const MANIFEST_FILE = 'packages/liteship/package.json';
const ROOT_KEYS = [
  'name',
  'kind',
  'role',
  'owner',
  'userStory',
  'lifecycle',
  'failureContract',
  'example',
  'stability',
] as const;

type ContractEntry = Record<(typeof ROOT_KEYS)[number], string>;
type SubpathEntry = Record<
  | 'subpath'
  | 'specifier'
  | 'owner'
  | 'role'
  | 'userStory'
  | 'dependencyCost'
  | 'packedProof'
  | 'lifecycle'
  | 'failureContract'
  | 'example'
  | 'stability'
  | 'symbol'
  | 'reason',
  string
>;

const ROOT_ENTRIES = JSON.parse(ROOT_EXPORT_CONTRACT_SOURCE) as ContractEntry[];
const SUBPATH_ENTRIES = JSON.parse(FACADE_SUBPATH_CONTRACT_SOURCE) as SubpathEntry[];

function budgetSource(root: readonly object[], subpaths?: readonly object[]): string {
  return [
    `export const ROOT_EXPORT_CONTRACT_SOURCE = \`${JSON.stringify(root)}\`;`,
    ...(subpaths === undefined
      ? []
      : [`export const FACADE_SUBPATH_CONTRACT_SOURCE = \`${JSON.stringify(subpaths)}\`;`]),
  ].join('\n');
}

function declarationSurface(entries: readonly ContractEntry[]): string {
  return entries
    .map((entry) =>
      entry.kind === 'value' ? `export declare const ${entry.name}: unknown;` : `export type ${entry.name} = unknown;`,
    )
    .join('\n');
}

function rootFindings(entries: readonly object[], dts = declarationSurface(ROOT_ENTRIES)): readonly Finding[] {
  return facadeExportBudgetGate.run(
    memoryContext({
      [BUDGET_FILE]: budgetSource(entries),
      [ROOT_DTS_FILE]: dts,
    }),
  );
}

function signature(findings: readonly Finding[]): readonly string[] {
  return findings
    .map((finding) => `${finding.ruleId}\0${finding.title}\0${finding.detail}\0${finding.location?.file ?? ''}`)
    .sort((a, b) => a.localeCompare(b));
}

function completeSubpathFiles(entries: readonly SubpathEntry[] = SUBPATH_ENTRIES): Record<string, string> {
  const exportsMap = Object.fromEntries([
    ['.', { types: './dist/index.d.ts', import: './dist/index.js' }],
    ...entries.map((entry) => [entry.subpath, { types: './dist/subpath.d.ts', import: './dist/subpath.js' }]),
  ]);
  return {
    [BUDGET_FILE]: budgetSource(ROOT_ENTRIES, entries),
    [ROOT_DTS_FILE]: declarationSurface(ROOT_ENTRIES),
    [MANIFEST_FILE]: JSON.stringify({ exports: exportsMap }),
    ...Object.fromEntries(
      entries.map((entry) => [
        `packages/liteship/src/${entry.subpath.slice(2)}.ts`,
        `export { ${entry.symbol} } from '${entry.owner}';`,
      ]),
    ),
  };
}

function subpathFindings(files: Readonly<Record<string, string>>): readonly Finding[] {
  return facadeExportBudgetGate.run(memoryContext(files));
}

const entryIndex = fc.integer({ min: 0, max: ROOT_ENTRIES.length - 1 });
const identifier = fc
  .tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'),
    fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$0123456789'), {
      minLength: 0,
      maxLength: 18,
    }),
  )
  .map(([head, tail]) => head + tail.join(''));

describe('facade export-budget adversarial properties', () => {
  it('is invariant to every generated root-contract and declaration permutation', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ROOT_ENTRIES, {
          minLength: ROOT_ENTRIES.length,
          maxLength: ROOT_ENTRIES.length,
        }),
        fc.shuffledSubarray(ROOT_ENTRIES, {
          minLength: ROOT_ENTRIES.length,
          maxLength: ROOT_ENTRIES.length,
        }),
        (contractOrder, declarationOrder) => {
          expect(rootFindings(contractOrder, declarationSurface(declarationOrder))).toEqual([]);
        },
      ),
      { seed: 0xfacade, numRuns: 100 },
    );
  });

  it('makes the same order-insensitive decision for the same missing and foreign identities', () => {
    fc.assert(
      fc.property(
        entryIndex,
        identifier,
        fc.shuffledSubarray(ROOT_ENTRIES, {
          minLength: ROOT_ENTRIES.length,
          maxLength: ROOT_ENTRIES.length,
        }),
        (missingIndex, foreignName, contractOrder) => {
          fc.pre(!ROOT_ENTRIES.some((entry) => entry.name === foreignName));
          const missing = ROOT_ENTRIES[missingIndex]!;
          const dtsEntries = ROOT_ENTRIES.filter((_, index) => index !== missingIndex);
          const foreignDeclaration = `export declare const ${foreignName}: unknown;`;
          const expected = rootFindings(ROOT_ENTRIES, `${declarationSurface(dtsEntries)}\n${foreignDeclaration}`);
          const actual = rootFindings(
            contractOrder,
            `${declarationSurface([...dtsEntries].reverse())}\n${foreignDeclaration}`,
          );
          expect(signature(actual)).toEqual(signature(expected));
          expect(actual.some((finding) => finding.detail.includes(missing.name))).toBe(true);
          expect(actual.some((finding) => finding.detail.includes(foreignName))).toBe(true);
        },
      ),
      { seed: 0xdec151, numRuns: 100 },
    );
  });

  it('rejects missing, foreign, empty, and non-string contract fields atomically', () => {
    fc.assert(
      fc.property(
        entryIndex,
        fc.constantFrom(...ROOT_KEYS),
        fc.constantFrom('missing', 'foreign', 'empty', 'non-string'),
        (index, key, mutation) => {
          const entries: object[] = ROOT_ENTRIES.map((entry) => ({ ...entry }));
          const target = entries[index] as Record<string, unknown>;
          if (mutation === 'missing') delete target[key];
          if (mutation === 'foreign') target[`foreign_${key}`] = 'not governed';
          if (mutation === 'empty') target[key] = '';
          if (mutation === 'non-string') target[key] = 17;
          const findings = rootFindings(entries);
          expect(findings).toHaveLength(1);
          expect(findings[0]?.title).toContain('malformed or role-ineligible');
        },
      ),
      { seed: 0xbadf1e1d, numRuns: 150 },
    );
  });

  it('rejects a missing contract payload and malformed embedded JSON', () => {
    const dts = declarationSurface(ROOT_ENTRIES);
    const missing = facadeExportBudgetGate.run(
      memoryContext({ [BUDGET_FILE]: 'export const unrelated = 1;', [ROOT_DTS_FILE]: dts }),
    );
    const malformed = facadeExportBudgetGate.run(
      memoryContext({
        [BUDGET_FILE]: 'export const ROOT_EXPORT_CONTRACT_SOURCE = `[{`;',
        [ROOT_DTS_FILE]: dts,
      }),
    );
    expect(missing).toHaveLength(1);
    expect(malformed).toHaveLength(1);
    expect(signature(missing)[0]).toContain('ROOT_EXPORT_CONTRACT_SOURCE is missing');
    expect(signature(malformed)[0]).toContain('not valid JSON');
  });

  it('rejects duplicate identities independently for value and type entries', () => {
    fc.assert(
      fc.property(fc.constantFrom('value', 'type'), (kind) => {
        const candidate = ROOT_ENTRIES.find((entry) => entry.kind === kind)!;
        const findings = rootFindings([...ROOT_ENTRIES, { ...candidate }]);
        expect(findings).toHaveLength(1);
        expect(findings[0]?.detail).toContain(`duplicates ${kind}:${candidate.name}`);
      }),
      { seed: 0xd0011ca7, numRuns: 50 },
    );
  });

  it('keeps value and type namespaces distinct when their textual names match', () => {
    fc.assert(
      fc.property(identifier, (name) => {
        const value = { ...ROOT_ENTRIES.find((entry) => entry.kind === 'value')!, name };
        const type = { ...ROOT_ENTRIES.find((entry) => entry.kind === 'type')!, name };
        expect(
          rootFindings([value, type], `export declare const ${name}: unknown;\nexport type ${name} = unknown;`),
        ).toEqual([]);
      }),
      { seed: 0x7a9e, numRuns: 100 },
    );
  });

  it('rejects every non-authoring/non-inspection root role', () => {
    fc.assert(
      fc.property(
        entryIndex,
        fc.string({ minLength: 1, maxLength: 32 }).filter((role) => role !== 'authoring' && role !== 'inspection'),
        (index, role) => {
          const entries = ROOT_ENTRIES.map((entry, entryIndex) => (entryIndex === index ? { ...entry, role } : entry));
          const findings = rootFindings(entries);
          expect(findings).toHaveLength(1);
          expect(findings[0]?.title).toContain('malformed or role-ineligible');
        },
      ),
      { seed: 0x701e, numRuns: 100 },
    );
  });

  it('rejects exact, role-eligible surfaces above either numeric cap', () => {
    fc.assert(
      fc.property(fc.constantFrom('value', 'type'), fc.integer({ min: 31, max: 64 }), (kind, count) => {
        const template = ROOT_ENTRIES.find((entry) => entry.kind === kind)!;
        const entries = Array.from({ length: count }, (_, index) => ({
          ...template,
          name: `${kind === 'value' ? 'value' : 'Type'}${index}`,
        }));
        const findings = rootFindings(entries, declarationSurface(entries));
        expect(findings).toHaveLength(1);
        expect(findings[0]?.title).toContain('cap exceeded');
        expect(findings[0]?.detail).toContain(`${count} ${kind} exports`);
      }),
      { seed: 0xc4f, numRuns: 75 },
    );
  });

  it('refuses invalid or ungoverned subpath admission without accepting partial agreement', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: SUBPATH_ENTRIES.length - 1 }),
        fc.constantFrom(
          'ungoverned-manifest-key',
          'missing-manifest-key',
          'invalid-subpath',
          'mismatched-specifier',
          'foreign-owner',
          'duplicate-subpath',
          'missing-facade',
          'wrong-owner',
          'missing-symbol',
        ),
        (index, mutation) => {
          const entries = SUBPATH_ENTRIES.map((entry) => ({ ...entry }));
          const target = entries[index]!;
          const files = completeSubpathFiles(entries);
          const manifest = JSON.parse(files[MANIFEST_FILE]!) as { exports: Record<string, unknown> };
          const facadeFile = `packages/liteship/src/${target.subpath.slice(2)}.ts`;

          if (mutation === 'ungoverned-manifest-key') manifest.exports['./rogue'] = './dist/rogue.js';
          if (mutation === 'missing-manifest-key') delete manifest.exports[target.subpath];
          if (mutation === 'invalid-subpath') target.subpath = target.subpath.slice(2);
          if (mutation === 'mismatched-specifier') target.specifier = 'liteship/not-the-subpath';
          if (mutation === 'foreign-owner') target.owner = 'foreign-package';
          if (mutation === 'duplicate-subpath') entries.push({ ...target });
          if (mutation === 'missing-facade') delete files[facadeFile];
          if (mutation === 'wrong-owner') files[facadeFile] = `export { ${target.symbol} } from '@liteship/error';`;
          if (mutation === 'missing-symbol') files[facadeFile] = `export { notTheSymbol } from '${target.owner}';`;

          files[BUDGET_FILE] = budgetSource(ROOT_ENTRIES, entries);
          files[MANIFEST_FILE] = JSON.stringify(manifest);
          const findings = subpathFindings(files);
          expect(findings.length).toBeGreaterThan(0);
          expect(findings.every((finding) => finding.title.includes('Facade subpath'))).toBe(true);
        },
      ),
      { seed: 0x5ab9a7, numRuns: 150 },
    );
  });

  it('accepts the current governed subpath contract in any entry order', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(SUBPATH_ENTRIES, {
          minLength: SUBPATH_ENTRIES.length,
          maxLength: SUBPATH_ENTRIES.length,
        }),
        (entries) => {
          expect(subpathFindings(completeSubpathFiles(entries))).toEqual([]);
        },
      ),
      { seed: 0x5abface, numRuns: 100 },
    );
  });
});
