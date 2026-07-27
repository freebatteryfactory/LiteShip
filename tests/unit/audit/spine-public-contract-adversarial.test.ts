/** Compiler-oracle controls for public spine contracts and private witnesses. */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildSpineRelationFacts,
  type SpineRelationBuildOptions,
  type SpineTypeAdmission,
} from '../../../packages/audit/src/spine-relation-build.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const TEMP_ROOT = mkdtempSync(join(REPO_ROOT, '.tmp-spine-public-contract-'));
const SPINE_PATH = join(TEMP_ROOT, 'spine.ts');
const RUNTIME_PATH = join(TEMP_ROOT, 'runtime.ts');

const SPINE_SOURCE = `
declare const spineWitness: unique symbol;
export interface Resource {
  readonly visible: string;
  readonly [spineWitness]: 'spine-private';
  [Symbol.asyncDispose](): Promise<void>;
}
export type BrandedId = string & { readonly __brand: 'stable-id' };
`;

const RUNTIME_SOURCE = `
declare const runtimeWitness: unique symbol;
export interface Resource {
  readonly visible: string;
  readonly [runtimeWitness]: 'runtime-private';
  [Symbol.asyncDispose](): Promise<void>;
}
export type BrandedId = string & { readonly __brand: 'stable-id' };
`;

const ADMISSIONS: readonly SpineTypeAdmission[] = [
  {
    typeName: 'Resource',
    authority: 'runtime',
    admittedRelation: 'exact',
    spineExpr: 'Resource',
    runtimeModule: 'runtime.ts',
    runtimeExpr: 'Resource',
  },
  {
    typeName: 'BrandedId',
    authority: 'runtime',
    admittedRelation: 'exact',
    spineExpr: 'BrandedId',
    runtimeModule: 'runtime.ts',
    runtimeExpr: 'BrandedId',
  },
];

const OPTIONS: SpineRelationBuildOptions = {
  spinePackageSpecifier: './spine.js',
};

beforeAll(() => {
  writeFileSync(SPINE_PATH, SPINE_SOURCE);
  writeFileSync(RUNTIME_PATH, RUNTIME_SOURCE);
});

afterAll(() => {
  rmSync(TEMP_ROOT, { recursive: true, force: true });
});

function observations(spine = SPINE_SOURCE) {
  return buildSpineRelationFacts(ADMISSIONS, TEMP_ROOT, {
    ...OPTIONS,
    overlay: { [SPINE_PATH]: spine },
  }).observations;
}

describe('spine public-contract compiler oracle', () => {
  it('ignores only module-private unique-symbol witness identity', () => {
    const renamedPrivateWitness = SPINE_SOURCE.replaceAll('spineWitness', 'renamedPrivateWitness');
    expect(observations(renamedPrivateWitness)).toEqual([
      expect.objectContaining({ typeName: 'Resource', resolved: true, observedRelation: 'exact' }),
      expect.objectContaining({ typeName: 'BrandedId', resolved: true, observedRelation: 'exact' }),
    ]);
  });

  it('still reds when a string-keyed member or public lifecycle symbol drifts', () => {
    const visibleDrift = observations(SPINE_SOURCE.replace('readonly visible: string;', 'readonly visible: number;'));
    expect(visibleDrift.find((row) => row.typeName === 'Resource')).toMatchObject({
      resolved: true,
      observedRelation: 'opaque',
    });

    const lifecycleDrift = observations(SPINE_SOURCE.replace('  [Symbol.asyncDispose](): Promise<void>;\n', ''));
    expect(lifecycleDrift.find((row) => row.typeName === 'Resource')).toMatchObject({
      resolved: true,
      observedRelation: 'public-wider',
    });
  });

  it('preserves primitive intersections so a public brand cannot disappear behind witness projection', () => {
    const brandDrift = observations(
      SPINE_SOURCE.replace("readonly __brand: 'stable-id'", "readonly __brand: 'other-id'"),
    );
    expect(brandDrift.find((row) => row.typeName === 'BrandedId')).toMatchObject({
      resolved: true,
      observedRelation: 'opaque',
    });
  });
});
