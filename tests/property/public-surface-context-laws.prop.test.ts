// @vitest-environment node
/** Cross-layer laws for authored facade contracts and their operator projection. */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { CHECK_REGISTRY } from '../../packages/command/src/checks/registry.js';
import {
  PUBLIC_SURFACE_CONTEXT,
  publicSurfaceForSymbol,
} from '../../packages/command/src/commands/public-surface-context.js';
import {
  FACADE_FAILURE_PROOF_CONTRACT,
  FACADE_LIFECYCLE_CONTRACT,
  FACADE_SUBPATH_CONTRACT,
  ROOT_EXPORT_CONTRACT,
} from '../../packages/liteship/src/export-budget.js';
import {
  PUBLIC_SURFACE_CONTEXT_TS,
  buildPublicSurfaceContext,
  collectPublicSurfaceContextDrift,
  renderPublicSurfaceContext,
} from '../../scripts/gen-public-surface-context.js';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const MANIFEST = JSON.parse(readFileSync(resolve(REPO_ROOT, 'packages/liteship/package.json'), 'utf8')) as {
  readonly exports: Readonly<Record<string, unknown>>;
};
const PUBLIC_ROUTES = new Set(
  Object.keys(MANIFEST.exports).map((subpath) =>
    subpath === '.' ? 'liteship' : `liteship/${subpath.replace(/^\.\//u, '')}`,
  ),
);
const CHECK_IDS = new Set(CHECK_REGISTRY.map((entry) => entry.id));

function allocationAlias(operation: string): string | null {
  return operation.endsWith('.create') ? operation.slice(0, -7) : null;
}

describe('public surface context projection', () => {
  it('is byte-current with the generated command-owned projection', () => {
    const generatedPath = resolve(REPO_ROOT, PUBLIC_SURFACE_CONTEXT_TS);
    expect(readFileSync(generatedPath, 'utf8')).toBe(renderPublicSurfaceContext());
    expect(buildPublicSurfaceContext()).toEqual(PUBLIC_SURFACE_CONTEXT);
    expect(collectPublicSurfaceContextDrift()).toEqual([]);
  });

  it('projects every paved-road binding exactly once', () => {
    expect(PUBLIC_SURFACE_CONTEXT.root).toHaveLength(ROOT_EXPORT_CONTRACT.length);
    const projected = new Map(PUBLIC_SURFACE_CONTEXT.root.map((entry) => [`${entry.kind}:${entry.symbol}`, entry]));
    for (const authored of ROOT_EXPORT_CONTRACT) {
      const entry = projected.get(`root:${authored.name}`);
      expect(entry, authored.name).toMatchObject({
        kind: 'root',
        symbol: authored.name,
        specifier: 'liteship',
        owner: authored.owner,
        audience: authored.audience,
        category: authored.role,
        surfaceClass: 'paved-road',
        producer: authored.producer,
        relatedInvariant: authored.relatedInvariant,
        replacement: authored.replacement,
        userStory: authored.userStory,
        lifecycle: authored.lifecycle,
        failureContract: authored.failureContract,
        example: authored.example,
        stability: authored.stability,
      });
      expect(entry?.proofRefs).toContain(authored.exampleProof);
    }
    expect(projected.size).toBe(ROOT_EXPORT_CONTRACT.length);
  });

  it('projects every advanced route exactly once', () => {
    expect(PUBLIC_SURFACE_CONTEXT.subpaths).toHaveLength(FACADE_SUBPATH_CONTRACT.length);
    const projected: ReadonlyMap<string, (typeof PUBLIC_SURFACE_CONTEXT.subpaths)[number]> = new Map(
      PUBLIC_SURFACE_CONTEXT.subpaths.map((entry) => [entry.specifier, entry]),
    );
    for (const authored of FACADE_SUBPATH_CONTRACT) {
      const entry = projected.get(authored.specifier);
      expect(entry, authored.specifier).toMatchObject({
        kind: 'subpath',
        symbol: authored.symbol,
        specifier: authored.specifier,
        owner: authored.owner,
        audience: authored.audience,
        category: authored.role,
        surfaceClass: 'advanced-module',
        producer: authored.producer,
        relatedInvariant: authored.relatedInvariant,
        replacement: authored.replacement,
        userStory: authored.userStory,
        lifecycle: authored.lifecycle,
        failureContract: authored.failureContract,
        example: authored.example,
        stability: authored.stability,
        dependencyCost: authored.dependencyCost,
        packedProof: authored.packedProof,
        reason: authored.reason,
      });
      expect(entry?.proofRefs).toContain(authored.exampleProof);
      expect(entry?.expertRoutes).toEqual([authored.specifier]);
    }
    expect(projected.size).toBe(FACADE_SUBPATH_CONTRACT.length);
  });

  it('projects every allocation operation exactly once', () => {
    expect(PUBLIC_SURFACE_CONTEXT.lifecycle).toHaveLength(FACADE_LIFECYCLE_CONTRACT.length);
    const projected: ReadonlyMap<string, (typeof PUBLIC_SURFACE_CONTEXT.lifecycle)[number]> = new Map(
      PUBLIC_SURFACE_CONTEXT.lifecycle.map((entry) => [entry.operation, entry]),
    );
    for (const authored of FACADE_LIFECYCLE_CONTRACT) {
      const entry = projected.get(authored.operation);
      expect(entry, authored.operation).toMatchObject(authored);
      expect(entry?.proof).toBe(authored.proof);
      expect(entry?.checkIds.length).toBeGreaterThan(0);
      expect(entry?.remediation.length).toBeGreaterThan(0);
    }
    expect(projected.size).toBe(FACADE_LIFECYCLE_CONTRACT.length);
  });

  it('resolves every root symbol to its complete operator record', () => {
    for (const authored of ROOT_EXPORT_CONTRACT) {
      const context = publicSurfaceForSymbol(authored.name);
      expect(context, authored.name).not.toBeNull();
      expect(context).toMatchObject({
        symbol: authored.name,
        specifier: 'liteship',
        owner: authored.owner,
        audience: authored.audience,
        category: authored.role,
        surfaceClass: authored.surfaceClass,
        producer: authored.producer,
        relatedInvariant: authored.relatedInvariant,
        replacement: authored.replacement,
        allocation: null,
      });
    }
  });

  it('resolves every advanced symbol to its complete operator record', () => {
    for (const authored of FACADE_SUBPATH_CONTRACT) {
      const context = publicSurfaceForSymbol(authored.specifier);
      expect(context, authored.specifier).not.toBeNull();
      expect(context).toMatchObject({
        symbol: authored.symbol,
        specifier: authored.specifier,
        owner: authored.owner,
        audience: authored.audience,
        category: authored.role,
        surfaceClass: authored.surfaceClass,
        producer: authored.producer,
        relatedInvariant: authored.relatedInvariant,
        replacement: authored.replacement,
      });
    }
  });

  it('attaches a lifecycle record to the symbol owning the same operation', () => {
    for (const authored of FACADE_LIFECYCLE_CONTRACT) {
      const context = publicSurfaceForSymbol(authored.operation);
      expect(context, authored.operation).not.toBeNull();
      expect(context?.allocation).toMatchObject({
        operation: authored.operation,
        specifier: authored.specifier,
        owner: authored.owner,
        classification: authored.classification,
        disposal: authored.disposal,
        postDispose: authored.postDispose,
        siblingCleanup: authored.siblingCleanup,
        proof: authored.proof,
        rationale: authored.rationale,
      });
    }
  });

  it('supports only the declared namespace alias for namespace create operations', () => {
    for (const authored of FACADE_LIFECYCLE_CONTRACT) {
      const alias = allocationAlias(authored.operation);
      if (alias === null) continue;
      const direct = publicSurfaceForSymbol(authored.operation);
      const aliased = publicSurfaceForSymbol(alias);
      expect(aliased?.allocation).toEqual(direct?.allocation);
      expect(aliased?.symbol).toBe(alias);
      expect(aliased?.specifier).toBe(authored.specifier);
      expect(aliased?.owner).toBe(authored.owner);
      expect(aliased?.allocation?.operation).toBe(authored.operation);
    }
  });

  it('does not normalize case, whitespace, punctuation, or prefixes into a public match', () => {
    const governed = [
      ...ROOT_EXPORT_CONTRACT.map((entry) => entry.name),
      ...FACADE_SUBPATH_CONTRACT.map((entry) => entry.symbol),
      ...FACADE_LIFECYCLE_CONTRACT.flatMap((entry) => [entry.operation, allocationAlias(entry.operation)]).filter(
        (entry): entry is string => entry !== null,
      ),
    ];
    fc.assert(
      fc.property(
        fc.constantFrom(...governed),
        fc.constantFrom('upper', 'lower', 'space', 'prefix', 'suffix'),
        (name, mutation) => {
          const changed =
            mutation === 'upper'
              ? name.toUpperCase()
              : mutation === 'lower'
                ? name.toLowerCase()
                : mutation === 'space'
                  ? ` ${name} `
                  : mutation === 'prefix'
                    ? `x${name}`
                    : `${name}x`;
          fc.pre(changed !== name && !governed.includes(changed));
          expect(publicSurfaceForSymbol(changed)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects arbitrary unknown identifiers without a fallback route', () => {
    const governed = new Set([
      ...ROOT_EXPORT_CONTRACT.map((entry) => entry.name),
      ...FACADE_SUBPATH_CONTRACT.map((entry) => entry.symbol),
      ...FACADE_LIFECYCLE_CONTRACT.flatMap((entry) => [entry.operation, allocationAlias(entry.operation)]).filter(
        (entry): entry is string => entry !== null,
      ),
    ]);
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z][A-Za-z0-9.]{0,30}$/u), (query) => {
        fc.pre(!governed.has(query));
        expect(publicSurfaceForSymbol(query)).toBeNull();
      }),
      { numRuns: 120 },
    );
  });

  it('makes every name overlap compositional and every advanced route unambiguous', () => {
    const claims = new Map<string, string[]>();
    const claim = (query: string, owner: string): void => {
      claims.set(query, [...(claims.get(query) ?? []), owner]);
    };
    for (const entry of ROOT_EXPORT_CONTRACT) claim(entry.name, `root:${entry.name}`);
    for (const entry of FACADE_SUBPATH_CONTRACT) claim(entry.symbol, `subpath:${entry.specifier}`);
    for (const entry of FACADE_LIFECYCLE_CONTRACT) {
      claim(entry.operation, `lifecycle:${entry.operation}`);
      const alias = allocationAlias(entry.operation);
      if (alias !== null) claim(alias, `lifecycle-alias:${entry.operation}`);
    }
    const overlaps = [...claims].filter(([, owners]) => new Set(owners).size > 1);
    for (const [query, owners] of overlaps) {
      const context = publicSurfaceForSymbol(query);
      expect(context, query).not.toBeNull();
      const hasAllocation = owners.some(
        (owner) => owner.startsWith('lifecycle:') || owner.startsWith('lifecycle-alias:'),
      );
      expect(context?.allocation !== null, query).toBe(hasAllocation);
      const subpath = FACADE_SUBPATH_CONTRACT.find((entry) => entry.symbol === query);
      if (subpath !== undefined) {
        expect(publicSurfaceForSymbol(subpath.specifier)?.specifier).toBe(subpath.specifier);
      }
    }
    expect(overlaps.map(([query]) => query).sort()).toEqual(['Compositor', 'createCell', 'createTimeline', 'schema']);
  });

  it('references only real facade routes', () => {
    for (const entry of [...PUBLIC_SURFACE_CONTEXT.root, ...PUBLIC_SURFACE_CONTEXT.subpaths]) {
      expect(PUBLIC_ROUTES.has(entry.specifier), entry.symbol).toBe(true);
      for (const route of entry.expertRoutes) expect(PUBLIC_ROUTES.has(route), `${entry.symbol}: ${route}`).toBe(true);
    }
    for (const entry of PUBLIC_SURFACE_CONTEXT.lifecycle) {
      expect(PUBLIC_ROUTES.has(entry.specifier), entry.operation).toBe(true);
    }
  });

  it('references only registered checks', () => {
    for (const entry of [
      ...PUBLIC_SURFACE_CONTEXT.root,
      ...PUBLIC_SURFACE_CONTEXT.subpaths,
      ...PUBLIC_SURFACE_CONTEXT.lifecycle,
    ]) {
      expect(entry.checkIds.length, 'context without an authority is ornamental').toBeGreaterThan(0);
      const label = 'symbol' in entry ? entry.symbol : entry.operation;
      for (const checkId of entry.checkIds) expect(CHECK_IDS.has(checkId), `${label}: ${checkId}`).toBe(true);
    }
  });

  it('references only physical proof files', () => {
    for (const entry of [...PUBLIC_SURFACE_CONTEXT.root, ...PUBLIC_SURFACE_CONTEXT.subpaths]) {
      expect(entry.proofRefs.length, 'context without proof is an unsupported claim').toBeGreaterThan(0);
      for (const proof of entry.proofRefs)
        expect(existsSync(resolve(REPO_ROOT, proof)), `${entry.symbol}: ${proof}`).toBe(true);
    }
    for (const entry of PUBLIC_SURFACE_CONTEXT.lifecycle) {
      expect(existsSync(resolve(REPO_ROOT, entry.proof)), `${entry.operation}: ${entry.proof}`).toBe(true);
    }
  });

  it('connects every authored failure proof to one advanced route', () => {
    const projected: ReadonlyMap<string, (typeof PUBLIC_SURFACE_CONTEXT.subpaths)[number]['failureProof']> = new Map(
      PUBLIC_SURFACE_CONTEXT.subpaths.map((entry) => [entry.specifier, entry.failureProof]),
    );
    for (const [specifier, proof] of Object.entries(FACADE_FAILURE_PROOF_CONTRACT)) {
      expect(projected.get(specifier)).toEqual(proof);
      expect(existsSync(resolve(REPO_ROOT, proof.test.split('::', 1)[0]!))).toBe(true);
    }
    for (const [specifier, proof] of projected) {
      if (proof !== null)
        expect(FACADE_FAILURE_PROOF_CONTRACT[specifier as keyof typeof FACADE_FAILURE_PROOF_CONTRACT]).toEqual(proof);
    }
  });

  it('deduplicates proof and check references without changing their first-seen order', () => {
    for (const entry of [
      ...PUBLIC_SURFACE_CONTEXT.root,
      ...PUBLIC_SURFACE_CONTEXT.subpaths,
      ...PUBLIC_SURFACE_CONTEXT.lifecycle,
    ]) {
      const label = 'symbol' in entry ? entry.symbol : entry.operation;
      expect(new Set(entry.checkIds).size, `${label}: checks`).toBe(entry.checkIds.length);
      if ('proofRefs' in entry) {
        expect(new Set(entry.proofRefs).size, `${entry.symbol}: proofs`).toBe(entry.proofRefs.length);
      }
    }
  });

  it('renders actionable remediation from owner, operation, and authority', () => {
    for (const entry of [...PUBLIC_SURFACE_CONTEXT.root, ...PUBLIC_SURFACE_CONTEXT.subpaths]) {
      expect(entry.remediation).toContain(entry.owner);
      expect(entry.remediation).toContain(entry.example);
      for (const checkId of entry.checkIds) expect(entry.remediation).toContain(checkId);
    }
    for (const entry of PUBLIC_SURFACE_CONTEXT.lifecycle) {
      expect(entry.remediation).toContain(entry.proof);
      if (entry.classification === 'active-owned') {
        expect(entry.remediation).toContain(entry.disposal);
        expect(entry.remediation).toContain('idempotent');
        expect(entry.remediation).toContain('attempt-all');
      } else {
        expect(entry.remediation).toContain('Do not add artificial disposal');
      }
    }
  });

  it('is deterministic across repeated builds and renders', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (repetitions) => {
        const expectedProjection = JSON.stringify(buildPublicSurfaceContext());
        const expectedRender = renderPublicSurfaceContext();
        for (let index = 0; index < repetitions; index += 1) {
          expect(JSON.stringify(buildPublicSurfaceContext())).toBe(expectedProjection);
          expect(renderPublicSurfaceContext()).toBe(expectedRender);
        }
      }),
      { numRuns: 20 },
    );
  });
});
