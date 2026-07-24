import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { afterEach, describe, expect, test } from 'vitest';
import {
  createDeliveryEvidenceFixture,
  removeDeliveryEvidenceFixture,
  serializedManifest,
  type DeliveryEvidenceFixture,
} from '../support/delivery-evidence-fixture.js';
import { verifyStandaloneDeliveryEvidence } from '../../scripts/lib/delivery-evidence-verifier.js';

let fixture: DeliveryEvidenceFixture | undefined;

function current(): DeliveryEvidenceFixture {
  fixture ??= createDeliveryEvidenceFixture();
  return fixture;
}

afterEach(() => {
  if (fixture !== undefined) removeDeliveryEvidenceFixture(fixture);
  fixture = undefined;
});

function verify(value: DeliveryEvidenceFixture, unsigned = value.unsigned): void {
  verifyStandaloneDeliveryEvidence({
    manifestJson: serializedManifest(unsigned),
    rawPlanBytes: value.planBytes,
    evidenceRoot: value.root,
    expected: value.expected,
  });
}

describe('standalone delivery evidence verifier properties', () => {
  test('removing any selected requirement always destroys closure', () => {
    const value = current();
    fc.assert(
      fc.property(fc.integer({ min: 0, max: value.unsigned.evidence.length - 1 }), (index) => {
        const evidence = value.unsigned.evidence.filter((_entry, candidate) => candidate !== index);
        expect(() => verify(value, { ...value.unsigned, evidence })).toThrow(/closure mismatch/u);
      }),
      { numRuns: 60 },
    );
  });

  test('duplicating any selected requirement always destroys identity uniqueness', () => {
    const value = current();
    fc.assert(
      fc.property(fc.integer({ min: 0, max: value.unsigned.evidence.length - 1 }), (index) => {
        const evidence = [...value.unsigned.evidence, value.unsigned.evidence[index]!];
        expect(() => verify(value, { ...value.unsigned, evidence })).toThrow(/duplicate/u);
      }),
      { numRuns: 60 },
    );
  });

  test('flipping any byte of any raw check artifact is detected before semantic parsing', () => {
    const value = current();
    fc.assert(
      fc.property(fc.integer({ min: 0, max: value.unsigned.evidence.length - 1 }), fc.nat(), (evidenceIndex, seed) => {
        const reference = value.unsigned.evidence[evidenceIndex]!;
        const path = join(value.root, ...reference.path.split('/'));
        const original = readFileSync(path);
        const mutated = Buffer.from(original);
        const index = seed % mutated.length;
        mutated[index] = mutated[index]! ^ 1;
        writeFileSync(path, mutated);
        try {
          expect(() => verify(value)).toThrow(/raw evidence digest mismatch/u);
        } finally {
          writeFileSync(path, original);
        }
      }),
      { numRuns: 100 },
    );
  });

  test('flipping any byte of supporting authority artifacts is detected from raw bytes', () => {
    const value = current();
    const paths = [
      value.unsigned.intent.path,
      value.unsigned.authority.path,
      value.unsigned.governedExceptions!.path,
      value.unsigned.metrics.path,
    ];
    fc.assert(
      fc.property(fc.constantFrom(...paths), fc.nat(), (relativePath, seed) => {
        const path = join(value.root, ...relativePath.split('/'));
        const original = readFileSync(path);
        const mutated = Buffer.from(original);
        const index = seed % mutated.length;
        mutated[index] = mutated[index]! ^ 1;
        writeFileSync(path, mutated);
        try {
          expect(() => verify(value)).toThrow(/(?:digest mismatch|raw .* digest)/u);
        } finally {
          writeFileSync(path, original);
        }
      }),
      { numRuns: 80 },
    );
  });

  test('any trusted GitHub identity mutation is rejected', () => {
    const value = current();
    const mutation = fc.constantFrom(
      { repository: 'foreign/repository' },
      { workflow: 'Foreign' },
      { runId: '987654' },
      { runAttempt: '2' },
      { headSha: 'd'.repeat(40) },
      { ref: 'refs/heads/foreign' },
    );
    fc.assert(
      fc.property(mutation, (change) => {
        expect(() =>
          verifyStandaloneDeliveryEvidence({
            manifestJson: serializedManifest(value.unsigned),
            rawPlanBytes: value.planBytes,
            evidenceRoot: value.root,
            expected: { ...value.expected, ...change },
          }),
        ).toThrow();
      }),
      { numRuns: 60 },
    );
  });

  test('only canonical evidence order is admitted under registry permutations', () => {
    const value = current();
    fc.assert(
      fc.property(
        fc.shuffledSubarray([...value.unsigned.evidence], {
          minLength: value.unsigned.evidence.length,
          maxLength: value.unsigned.evidence.length,
        }),
        (evidence) => {
          const canonical = value.unsigned.evidence.map((entry) => entry.id);
          const candidate = evidence.map((entry) => entry.id);
          if (JSON.stringify(candidate) === JSON.stringify(canonical)) {
            expect(() => verify(value, { ...value.unsigned, evidence })).not.toThrow();
          } else {
            expect(() => verify(value, { ...value.unsigned, evidence })).toThrow(/canonical id order/u);
          }
        },
      ),
      { numRuns: 60 },
    );
  });
});
