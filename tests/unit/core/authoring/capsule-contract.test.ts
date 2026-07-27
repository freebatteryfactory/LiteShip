import { describe, it, expect } from 'vitest';
import { ASSEMBLY_KINDS, schema } from '@liteship/core';
import type { CapsuleContract, AssemblyKind } from '@liteship/core';

describe('CapsuleContract', () => {
  it('accepts a valid pureTransform contract shape', () => {
    const contract = {
      _kind: 'pureTransform' as const,
      id: 'fnv1a:test001' as const,
      name: 'test-transform',
      input: schema.number,
      output: schema.string,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'] as const,
    } satisfies CapsuleContract<'pureTransform', number, string, never>;
    expect(contract._kind).toBe('pureTransform');
    expect(contract.site).toEqual(['node']);
  });

  it('rejects invalid assembly kinds at type level', () => {
    const assertKind = (k: AssemblyKind) => k;
    expect(assertKind('pureTransform')).toBe('pureTransform');
    expect(assertKind('sceneComposition')).toBe('sceneComposition');
  });

  it('derives the closed type vocabulary from one immutable runtime catalog', () => {
    expect(ASSEMBLY_KINDS).toEqual([
      'pureTransform',
      'receiptedMutation',
      'stateMachine',
      'siteAdapter',
      'policyGate',
      'cachedProjection',
      'sceneComposition',
    ]);
    expect(Object.isFrozen(ASSEMBLY_KINDS)).toBe(true);
  });
});
