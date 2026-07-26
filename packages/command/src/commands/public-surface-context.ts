/**
 * Operator-facing projection of the curated LiteShip facade.
 *
 * The authored contract lives in `packages/liteship/src/export-budget.ts`.
 * `scripts/gen-public-surface-context.ts` validates and projects that contract
 * here; commands consume this module instead of maintaining another API map.
 *
 * @module
 */

import { GENERATED_PUBLIC_SURFACE_CONTEXT } from './public-surface-context.generated.js';

export type PublicSurfaceStability = 'stable' | 'experimental';

export interface PublicAllocationContext {
  readonly operation: string;
  readonly specifier: string;
  readonly owner: string;
  readonly classification: 'active-owned' | 'gc-owned-mutable' | 'pure-allocation';
  readonly disposal: string;
  readonly postDispose: string;
  readonly siblingCleanup: string;
  readonly proof: string;
  readonly rationale: string;
}

export interface PublicFailureProofContext {
  readonly test: string;
  readonly importSource: string;
  readonly operation: string;
  readonly observation: {
    readonly kind: 'diagnostic-and-output-omission';
    readonly code: string;
    readonly outputField: string;
  };
}

/** Enough product context to use, verify, and recover one public symbol. */
export interface PublicSymbolContext {
  readonly symbol: string;
  readonly specifier: string;
  readonly owner: string;
  readonly userStory: string;
  readonly lifecycle: string;
  readonly failureContract: string;
  readonly failureProof: PublicFailureProofContext | null;
  readonly example: string;
  readonly stability: PublicSurfaceStability;
  readonly expertRoutes: readonly string[];
  readonly checkIds: readonly string[];
  readonly proofRefs: readonly string[];
  readonly remediation: string;
  readonly allocation: PublicAllocationContext | null;
}

/** Structural schema reused by `explain` and `context`. */
export const PublicSymbolContextSchema = {
  type: ['object', 'null'],
  properties: {
    symbol: { type: 'string' },
    specifier: { type: 'string' },
    owner: { type: 'string' },
    userStory: { type: 'string' },
    lifecycle: { type: 'string' },
    failureContract: { type: 'string' },
    failureProof: {
      type: ['object', 'null'],
      properties: {
        test: { type: 'string' },
        importSource: { type: 'string' },
        operation: { type: 'string' },
        observation: {
          type: 'object',
          properties: {
            kind: { const: 'diagnostic-and-output-omission' },
            code: { type: 'string' },
            outputField: { type: 'string' },
          },
          required: ['kind', 'code', 'outputField'],
        },
      },
      required: ['test', 'importSource', 'operation', 'observation'],
    },
    example: { type: 'string' },
    stability: { enum: ['stable', 'experimental'] },
    expertRoutes: { type: 'array', items: { type: 'string' } },
    checkIds: { type: 'array', items: { type: 'string' } },
    proofRefs: { type: 'array', items: { type: 'string' } },
    remediation: { type: 'string' },
    allocation: {
      type: ['object', 'null'],
      properties: {
        operation: { type: 'string' },
        specifier: { type: 'string' },
        owner: { type: 'string' },
        classification: { enum: ['active-owned', 'gc-owned-mutable', 'pure-allocation'] },
        disposal: { type: 'string' },
        postDispose: { type: 'string' },
        siblingCleanup: { type: 'string' },
        proof: { type: 'string' },
        rationale: { type: 'string' },
      },
      required: [
        'operation',
        'specifier',
        'owner',
        'classification',
        'disposal',
        'postDispose',
        'siblingCleanup',
        'proof',
        'rationale',
      ],
    },
  },
  required: [
    'symbol',
    'specifier',
    'owner',
    'userStory',
    'lifecycle',
    'failureContract',
    'failureProof',
    'example',
    'stability',
    'expertRoutes',
    'checkIds',
    'proofRefs',
    'remediation',
    'allocation',
  ],
} as const;

/** The complete generated projection returned by `liteship describe`. */
export const PUBLIC_SURFACE_CONTEXT = GENERATED_PUBLIC_SURFACE_CONTEXT;

/** Resolve a facade symbol or allocation operation without package archaeology. */
export function publicSurfaceForSymbol(query: string): PublicSymbolContext | null {
  const root = GENERATED_PUBLIC_SURFACE_CONTEXT.root.find((entry) => entry.symbol === query);
  const subpath = GENERATED_PUBLIC_SURFACE_CONTEXT.subpaths.find((entry) => entry.symbol === query);
  const allocation = GENERATED_PUBLIC_SURFACE_CONTEXT.lifecycle.find(
    (entry) =>
      entry.operation === query || (entry.operation.endsWith('.create') && entry.operation.slice(0, -7) === query),
  );
  const anchor = root ?? subpath;
  if (anchor === undefined && allocation === undefined) return null;

  const allocationContext: PublicAllocationContext | null =
    allocation === undefined
      ? null
      : {
          operation: allocation.operation,
          specifier: allocation.specifier,
          owner: allocation.owner,
          classification: allocation.classification,
          disposal: allocation.disposal,
          postDispose: allocation.postDispose,
          siblingCleanup: allocation.siblingCleanup,
          proof: allocation.proof,
          rationale: allocation.rationale,
        };

  if (anchor === undefined) {
    return {
      symbol: query,
      specifier: allocation!.specifier,
      owner: allocation!.owner,
      userStory: allocation!.rationale,
      lifecycle: allocation!.classification,
      failureContract:
        allocation!.classification === 'active-owned'
          ? `Disposal is ${allocation!.postDispose}; sibling cleanup is ${allocation!.siblingCleanup}.`
          : 'No explicit disposal contract is required.',
      failureProof: null,
      example: allocation!.operation,
      stability: 'stable',
      expertRoutes: [allocation!.specifier],
      checkIds: allocation!.checkIds,
      proofRefs: [allocation!.proof],
      remediation: allocation!.remediation,
      allocation: allocationContext,
    };
  }

  return {
    symbol: anchor.symbol,
    specifier: anchor.specifier,
    owner: anchor.owner,
    userStory: anchor.userStory,
    lifecycle: anchor.lifecycle,
    failureContract: anchor.failureContract,
    failureProof: anchor.failureProof,
    example: anchor.example,
    stability: anchor.stability,
    expertRoutes: anchor.expertRoutes,
    checkIds: anchor.checkIds,
    proofRefs: anchor.proofRefs,
    remediation: anchor.remediation,
    allocation: allocationContext,
  };
}
