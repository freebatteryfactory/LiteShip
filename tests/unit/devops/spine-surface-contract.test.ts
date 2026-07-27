import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  analyzeRepositorySpine,
  analyzeSpineSources,
  assertSpineProvenanceComplete,
  classifySpineProvenance,
  renderSpineBarrel,
  renderSpineProvenanceProjection,
  renderSpineSymbolDocumentation,
} from '../../../scripts/lib/spine-surface-contract.js';
import { analyzeRepositoryPublicExports } from '../../../scripts/lib/public-export-contract.js';
import { PACKAGE_CATALOG } from '../../../scripts/package-catalog.js';
import {
  LITESHIP_SPINE_ADMISSIONS,
  LITESHIP_SPINE_AUTHORED_ADMISSIONS,
  LITESHIP_SPINE_PROTOCOL_DECLARATIONS,
} from '../../../packages/cli/src/internal/spine-relation-policy.js';
import { SPINE_PROTOCOL_PROJECTIONS, SPINE_RUNTIME_OWNER_OVERRIDES } from '../../../scripts/gen-spine-surface.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

describe('_spine explicit surface contract', () => {
  test('admits documented type meaning and excludes value-only declarations from the root', () => {
    const analysis = analyzeSpineSources({
      'alpha.d.ts': [
        '/** Stable alpha contract. */',
        'export interface Alpha { readonly value: string }',
        '/** Runtime-only helper mirrored on the leaf. */',
        'export declare function execute(): void;',
      ].join('\n'),
    });

    expect(analysis.symbols.map((symbol) => symbol.name)).toEqual(['Alpha']);
    expect(analysis.rejectedValues).toEqual([{ name: 'execute', leaf: 'alpha.d.ts' }]);
    const barrel = renderSpineBarrel(analysis);
    expect(barrel).toContain('export type {');
    expect(barrel).toContain('Alpha,');
    expect(barrel).not.toContain('execute');
    expect(barrel).not.toContain('export *');
  });

  test('refuses a cross-leaf name collision instead of choosing an owner by order', () => {
    const analysis = analyzeSpineSources({
      'alpha.d.ts': '/** First owner. */\nexport interface Shared { readonly alpha: true }',
      'beta.d.ts': '/** Second owner. */\nexport type Shared = { readonly beta: true };',
    });

    expect(analysis.collisions).toEqual(['Shared: alpha.d.ts, beta.d.ts']);
    expect(() => renderSpineBarrel(analysis)).toThrow(/collision Shared/u);
  });

  test('refuses an undocumented type and names its declaration leaf', () => {
    const analysis = analyzeSpineSources({
      'missing.d.ts': 'export interface MissingDocumentation { readonly value: number }',
    });

    expect(analysis.undocumented).toEqual(['missing.d.ts:MissingDocumentation']);
    expect(() => renderSpineSymbolDocumentation(analysis)).toThrow(/undocumented missing\.d\.ts:MissingDocumentation/u);
  });

  test('the repository root barrel and symbol index are exact projections of the live leaf census', () => {
    const analysis = analyzeRepositorySpine(REPO_ROOT);
    expect(analysis.collisions).toEqual([]);
    expect(analysis.undocumented).toEqual([]);
    expect(analysis.symbols.length).toBeGreaterThan(300);
    expect(analysis.rejectedValues.length).toBeGreaterThan(100);
    expect(readFileSync(resolve(REPO_ROOT, 'packages/_spine/index.d.ts'), 'utf8')).toBe(renderSpineBarrel(analysis));
    expect(readFileSync(resolve(REPO_ROOT, 'packages/_spine/SYMBOLS.md'), 'utf8')).toBe(
      renderSpineSymbolDocumentation(analysis),
    );
  });

  test('classifies every repository symbol exactly once as an admitted mirror or declaration-owned protocol', () => {
    const spine = analyzeRepositorySpine(REPO_ROOT);
    const runtime = analyzeRepositoryPublicExports(REPO_ROOT, PACKAGE_CATALOG);
    const projection = classifySpineProvenance(
      spine,
      runtime.contracts,
      LITESHIP_SPINE_AUTHORED_ADMISSIONS,
      SPINE_RUNTIME_OWNER_OVERRIDES,
      SPINE_PROTOCOL_PROJECTIONS,
    );
    expect(() => assertSpineProvenanceComplete(projection)).not.toThrow();
    expect(projection.classifications).toHaveLength(spine.symbols.length);
    expect(new Set(projection.classifications.map((row) => row.symbol)).size).toBe(spine.symbols.length);
    expect(LITESHIP_SPINE_ADMISSIONS).toHaveLength(
      LITESHIP_SPINE_AUTHORED_ADMISSIONS.length + projection.generatedAdmissions.length,
    );
    expect(LITESHIP_SPINE_PROTOCOL_DECLARATIONS).toEqual(
      projection.classifications
        .filter((row) => row.classification === 'spine-protocol' || row.classification === 'protocol-projection')
        .map((row) => row),
    );
    const rendered = renderSpineProvenanceProjection(projection);
    expect(rendered.match(/\/\/ prettier-ignore/gu)).toHaveLength(2);
    expect(rendered).toBe(
      readFileSync(resolve(REPO_ROOT, 'packages/cli/src/internal/spine-provenance.generated.ts'), 'utf8'),
    );
    expect(rendered.endsWith('\n')).toBe(true);
    expect(rendered.endsWith('\n\n')).toBe(false);
  });

  test('derives protocols only from the absence of a runtime twin and never hides a same-name producer', () => {
    const analysis = analyzeSpineSources({
      'alpha.d.ts': '/** Alpha protocol. */\nexport interface Alpha { readonly value: string }',
      'beta.d.ts': '/** Beta mirror. */\nexport interface Beta<T> { readonly value: T }',
    });
    const projection = classifySpineProvenance(
      analysis,
      [
        {
          packageName: '@acme/runtime',
          specifier: '@acme/runtime',
          name: 'Beta',
          kind: 'type',
          producer: 'packages/runtime/src/beta.ts',
        },
      ],
      [],
    );
    expect(projection.findings).toEqual([]);
    expect(projection.classifications).toEqual([
      {
        classification: 'spine-protocol',
        symbol: 'Alpha',
        leaf: 'alpha.d.ts',
        owner: '@liteship/_spine',
        provenance: 'declaration-leaf',
      },
      {
        classification: 'runtime-mirror',
        symbol: 'Beta',
        leaf: 'beta.d.ts',
        runtimeProducer: 'packages/runtime/src/beta.ts',
        runtimeSpecifiers: ['@acme/runtime'],
        admissionSource: 'generated',
      },
    ]);
    expect(projection.generatedAdmissions[0]).toMatchObject({
      typeName: 'Beta',
      spineExpr: 'Beta<any>',
      runtimeExpr: 'Beta<any>',
    });
  });

  test('admits a generated protocol projection only with owner-catalog provenance and no runtime twin', () => {
    const analysis = analyzeSpineSources({
      'events.generated.d.ts': '/** Event map. */\nexport interface LiteShipEventMap { readonly ready: true }',
    });
    const contract = {
      leaf: 'events.generated.d.ts',
      generator: 'scripts/gen-events.ts',
      ownerCatalogs: ['packages/web/src/event-protocol.ts'],
    } as const;
    const admitted = classifySpineProvenance(analysis, [], [], [], [contract]);
    expect(admitted.findings).toEqual([]);
    expect(admitted.classifications).toEqual([
      {
        classification: 'protocol-projection',
        symbol: 'LiteShipEventMap',
        leaf: 'events.generated.d.ts',
        owner: '@liteship/_spine',
        provenance: 'generated-owner-catalog',
        generator: 'scripts/gen-events.ts',
        ownerCatalogs: ['packages/web/src/event-protocol.ts'],
      },
    ]);

    const missingOwner = classifySpineProvenance(analysis, [], [], [], [{ ...contract, ownerCatalogs: [] }]);
    expect(missingOwner.findings).toContain('protocol projection events.generated.d.ts has no owner catalogs');

    const mislabeledMirror = classifySpineProvenance(
      analysis,
      [
        {
          packageName: '@acme/web',
          specifier: '@acme/web',
          name: 'LiteShipEventMap',
          kind: 'type',
          producer: 'packages/web/src/event-map.ts',
        },
      ],
      [],
      [],
      [contract],
    );
    expect(mislabeledMirror.findings).toContain(
      'protocol projection LiteShipEventMap has runtime twin(s): packages/web/src/event-map.ts',
    );
  });

  test('refuses duplicate, omitted, ambiguous, and invalid-owner provenance mutations', () => {
    const duplicate = analyzeSpineSources({
      'a.d.ts': '/** One. */\nexport interface Shared { readonly a: true }',
      'b.d.ts': '/** Two. */\nexport interface Shared { readonly b: true }',
    });
    expect(classifySpineProvenance(duplicate, [], []).findings).toContain(
      'duplicate spine symbol Shared: a.d.ts, b.d.ts',
    );

    const analysis = analyzeSpineSources({
      'alpha.d.ts': '/** Alpha. */\nexport interface Alpha { readonly value: string }',
    });
    const twins = [
      {
        packageName: '@acme/a',
        specifier: '@acme/a',
        name: 'Alpha',
        kind: 'type' as const,
        producer: 'packages/a/src/index.ts',
      },
      {
        packageName: '@acme/b',
        specifier: '@acme/b',
        name: 'Alpha',
        kind: 'type' as const,
        producer: 'packages/b/src/index.ts',
      },
    ];
    const ambiguous = classifySpineProvenance(analysis, twins, []);
    expect(ambiguous.findings).toEqual([
      'ambiguous runtime twin Alpha: packages/a/src/index.ts, packages/b/src/index.ts',
      'omitted provenance classification Alpha',
    ]);
    const invalidOwner = classifySpineProvenance(
      analysis,
      twins,
      [],
      [{ symbol: 'Alpha', producer: 'packages/c/src/index.ts', reason: 'planted invalid owner' }],
    );
    expect(invalidOwner.findings.some((finding) => finding.includes('invalid override'))).toBe(true);
    expect(() => assertSpineProvenanceComplete(invalidOwner)).toThrow(/spine provenance is incomplete/u);
  });
});
