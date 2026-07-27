/** Adversarial laws for exhaustive `_spine` provenance classification. */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  analyzeSpineSources,
  classifySpineProvenance,
  type SpineAuthoredAdmissionContract,
  type SpineProtocolProjectionContract,
  type SpineRuntimeTypeContract,
} from '../../scripts/lib/spine-surface-contract.js';

const typeNameArbitrary = fc
  .tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { maxLength: 9 }),
  )
  .map(([head, tail]) => `${head}${tail.join('')}`);

function declaration(name: string): string {
  return `/** ${name} protocol. */\nexport interface ${name} { readonly value: string }`;
}

describe('_spine provenance adversarial laws', () => {
  it('never launders an unregistered generated declaration as an authored spine protocol', () => {
    fc.assert(
      fc.property(typeNameArbitrary, (name) => {
        const analysis = analyzeSpineSources({ [`${name.toLowerCase()}.generated.d.ts`]: declaration(name) });
        const projection = classifySpineProvenance(analysis, [], []);

        expect(projection.classifications).toEqual([]);
        expect(projection.findings).toEqual([
          `generated declaration ${name.toLowerCase()}.generated.d.ts:${name} has no protocol projection provenance`,
          `omitted provenance classification ${name}`,
        ]);
      }),
      { numRuns: 60 },
    );
  });

  it('is permutation-invariant across runtime, admission, and projection evidence', () => {
    const analysis = analyzeSpineSources({
      'authored.d.ts': declaration('AuthoredMirror'),
      'automatic.d.ts': declaration('AutomaticMirror'),
      'events.generated.d.ts': [declaration('FleetEventMap'), declaration('FleetEventName')].join('\n'),
      'protocol.d.ts': declaration('SpineProtocol'),
    });
    const runtimes: readonly SpineRuntimeTypeContract[] = [
      {
        packageName: '@acme/authored',
        specifier: '@acme/authored',
        name: 'AuthoredMirror',
        kind: 'type',
        producer: 'packages/authored/src/index.ts',
      },
      {
        packageName: '@acme/automatic',
        specifier: '@acme/automatic',
        name: 'AutomaticMirror',
        kind: 'type',
        producer: 'packages/automatic/src/model.ts',
      },
      {
        packageName: '@acme/facade',
        specifier: '@acme/facade/automatic',
        name: 'AutomaticMirror',
        kind: 'type',
        producer: 'packages/automatic/src/model.ts',
      },
    ];
    const admissions: readonly SpineAuthoredAdmissionContract[] = [
      { typeName: 'AuthoredMirror', runtimeModule: 'packages/authored/src/index.ts' },
      { typeName: "AuthoredMirror['value']", runtimeModule: 'packages/authored/src/index.ts' },
    ];
    const projections: readonly SpineProtocolProjectionContract[] = [
      {
        leaf: 'events.generated.d.ts',
        generator: 'scripts/gen-events.ts',
        ownerCatalogs: ['packages/web/src/events.ts', 'packages/astro/src/events.ts'],
      },
    ];
    const expected = classifySpineProvenance(analysis, runtimes, admissions, [], projections);
    expect(expected.findings).toEqual([]);

    fc.assert(
      fc.property(
        fc.shuffledSubarray([...runtimes], { minLength: runtimes.length, maxLength: runtimes.length }),
        fc.shuffledSubarray([...admissions], { minLength: admissions.length, maxLength: admissions.length }),
        fc.shuffledSubarray([...projections[0]!.ownerCatalogs], {
          minLength: projections[0]!.ownerCatalogs.length,
          maxLength: projections[0]!.ownerCatalogs.length,
        }),
        (runtimeOrder, admissionOrder, catalogOrder) => {
          expect(
            classifySpineProvenance(
              analysis,
              runtimeOrder,
              admissionOrder,
              [],
              [{ ...projections[0]!, ownerCatalogs: catalogOrder }],
            ),
          ).toEqual(expected);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('refuses projection provenance that is missing, duplicated, blank, authored-leaf, or contradicted by a twin', () => {
    const analysis = analyzeSpineSources({
      'events.generated.d.ts': declaration('FleetEventMap'),
      'plain.d.ts': declaration('PlainProtocol'),
    });
    const valid = {
      leaf: 'events.generated.d.ts',
      generator: 'scripts/gen-events.ts',
      ownerCatalogs: ['packages/web/src/events.ts'],
    } as const;

    const invalid = classifySpineProvenance(
      analysis,
      [
        {
          packageName: '@acme/web',
          specifier: '@acme/web',
          name: 'FleetEventMap',
          kind: 'type',
          producer: 'packages/web/src/event-map.ts',
        },
      ],
      [],
      [],
      [
        { ...valid, generator: '   ', ownerCatalogs: ['', 'packages/web/src/events.ts', 'packages/web/src/events.ts'] },
        { leaf: 'plain.d.ts', generator: 'scripts/gen-events.ts', ownerCatalogs: ['packages/web/src/events.ts'] },
      ],
    );

    expect(invalid.findings).toEqual(
      expect.arrayContaining([
        'protocol projection events.generated.d.ts has blank generator provenance',
        'protocol projection events.generated.d.ts has blank owner catalog provenance',
        'protocol projection events.generated.d.ts repeats owner catalog packages/web/src/events.ts',
        'protocol projection FleetEventMap has runtime twin(s): packages/web/src/event-map.ts',
        'protocol projection leaf plain.d.ts is not a generated declaration',
      ]),
    );
  });
});
