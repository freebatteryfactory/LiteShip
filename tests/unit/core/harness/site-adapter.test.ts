import { describe, it, expect, beforeEach } from 'vitest';
import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';
import { resetCapsuleCatalog } from '@czap/core/testing';
import * as Harness from '@czap/core/harness';

/**
 * Lane-aware siteAdapter harness contract (LAWS, not implementation strings):
 *
 *  - With a resolved driver, round-trip equality is a REAL unit check (`.test.ts`)
 *    and the host-capability matrix is a `declared-integration` check in the
 *    INTEGRATION lane (`integrationFile`) — a coverage link WITH TEETH to a real
 *    existing host suite, never an in-process host double.
 *  - With NO resolvable binding, the capsule emits a typed not-wired form — a
 *    documentation-only file, NEVER an `it.skip` placeholder, NEVER a silent
 *    omission.
 *  - Under EVERY branch, no lane contains a `.skip(` token.
 */
describe('generateSiteAdapter (lane-aware, declared-integration)', () => {
  beforeEach(() => resetCapsuleCatalog());

  const adapterCap = (name: string) =>
    defineCapsule({
      _kind: 'siteAdapter',
      name,
      input: Schema.Unknown,
      output: Schema.Unknown,
      capabilities: { reads: [], writes: [] },
      invariants: [],
      budgets: { p95Ms: 1 },
      site: ['node'],
    });

  // A faithful resolved driver: round-trip samples the output schema, and the
  // single declared site ('node') is covered by a real-host suite link with a
  // references-needle (teeth). No gaps → the partition (covered ∪ gaps == sites)
  // holds exactly.
  const driver = {
    roundTripSchema: 'output' as const,
    bindingImportFromIntegration: '../../../packages/core/src/index.js',
    arbitraryImport: '../../packages/core/src/harness/arbitrary-from-schema.js',
    canonicalCborImport: '../../packages/core/src/index.js',
    cborDecodeImport: '../../packages/canonical/src/index.js',
    contentAddressImport: '../../packages/core/src/content-address.js',
    hostCapability: {
      kind: 'declared-integration' as const,
      coverage: [
        {
          sites: ['node'],
          coverageRef: 'tests/integration/demo-host.test.ts',
          lane: 'test:demo',
          referencesNeedle: 'demoAdapter',
        },
      ],
      gaps: [],
    },
  } as const;

  const wiredCtx = {
    siteAdapter: driver,
    bindingName: 'demoAdapter',
    bindingImport: '../../packages/core/src/index.js',
  };

  const SKIP_TOKEN = /\b(?:it|test|describe|bench)\.skip\(/;

  it('with a driver: round-trip in the UNIT lane, host-capability in the INTEGRATION lane', () => {
    const out = Harness.generateSiteAdapter(adapterCap('demo.wired'), wiredCtx);
    expect(out.testFile).toContain('round-trip equality');
    expect(out.integrationFile ?? '').toContain('host capability');
    // The coverage link's teeth are emitted (the suite ref + needle).
    expect(out.integrationFile ?? '').toContain('tests/integration/demo-host.test.ts');
    expect(out.benchFile).toContain("bench('demo.wired'");
  });

  it('NEVER emits a .skip( in any lane — wired path', () => {
    const out = Harness.generateSiteAdapter(adapterCap('demo.wired'), wiredCtx);
    for (const f of [out.testFile, out.benchFile, out.integrationFile ?? '']) {
      expect(f).not.toMatch(SKIP_TOKEN);
    }
  });

  it('no resolvable binding: a typed not-wired form, never an it.skip', () => {
    const out = Harness.generateSiteAdapter(adapterCap('demo.unwired'));
    expect(out.testFile).not.toMatch(SKIP_TOKEN);
    expect(out.testFile.toLowerCase()).toContain('unwired');
  });
});
