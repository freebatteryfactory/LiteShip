import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { repositoryProofTimeout } from '../../../vitest.shared.js';
import {
  buildCatalogFeatureEdgeFamily,
  combineFeatureEdgeFamilies,
  type CatalogFeatureEdgeOptions,
} from '@liteship/audit';
import {
  FEATURE_EDGE_FAMILIES,
  decideFeatureEdgeConnectivity,
  featureEdgeSubjectCoverage,
  featureEdgeConnectivityGate,
  runGauntletOnRepo,
  type FeatureEdgeFamily,
  type FeatureEdgeFamilyFacts,
} from '@liteship/gauntlet';
import { MCP_METHOD_CATALOG, projectServerCapabilities } from '@liteship/mcp-server';
import { COMMAND_CAPABILITIES, COMMAND_CAPABILITY_DISPOSITIONS } from '@liteship/command';
import { buildLiveLiteShipFeatureEdgeFacts } from '../../../scripts/lib/feature-edge-profile.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
function liveFacts() {
  return buildLiveLiteShipFeatureEdgeFacts(REPO_ROOT);
}

function withoutFirstProducer(pack: FeatureEdgeFamilyFacts): FeatureEdgeFamilyFacts {
  const producer = pack.observations.find((observation) => observation.role === 'producer');
  if (producer === undefined) throw new Error(`${pack.family} has no producer fixture`);
  return {
    ...pack,
    observations: pack.observations.filter((observation) => observation !== producer),
  };
}

// Repository-scale proofs: most cases here build the LIVE census over the real
// repo (~2-3s each on an idle machine), and the repo-runner cases measured
// 3.0-3.1s — the default 10s budget was killed three times under Windows CI
// lane saturation (PR #191 runs 30542682697 x2 + the fix push's run). The
// canonical repository-proof budget replaces it; scale covers loaded hosts.
describe('live multi-family feature-edge profile', { timeout: repositoryProofTimeout() }, () => {
  it('enumerates every governed catalog family from canonical owners with no orphan', () => {
    const facts = liveFacts();
    expect(facts.families.map((family) => family.family)).toEqual(FEATURE_EDGE_FAMILIES);
    expect(featureEdgeSubjectCoverage(facts)).toMatchObject({ status: 'complete' });
    expect(decideFeatureEdgeConnectivity({ featureEdges: facts })).toEqual([]);
    expect(
      facts.families.map((family) => ({
        family: family.family,
        subjects: family.subjectCoverage.enumeratedCount,
        consumers: family.observations.filter((observation) => observation.role === 'consumer').length,
        producers: family.observations.filter((observation) => observation.role === 'producer').length,
      })),
    ).toEqual([
      { family: 'ecs-component', subjects: 24, consumers: 26, producers: 25 },
      { family: 'lsp-method', subjects: 10, consumers: 10, producers: 10 },
      { family: 'mcp-method', subjects: 9, consumers: 16, producers: 9 },
      { family: 'command-capability', subjects: 24, consumers: 44, producers: 24 },
      { family: 'command', subjects: 38, consumers: 38, producers: 38 },
      { family: 'mcp-resource', subjects: 23, consumers: 23, producers: 23 },
      { family: 'mcp-prompt', subjects: 2, consumers: 2, producers: 2 },
      { family: 'capsule-kind', subjects: 7, consumers: 7, producers: 7 },
      { family: 'fleet-event', subjects: 32, consumers: 32, producers: 41 },
    ]);
    for (const family of facts.families.filter((candidate) => candidate.family !== 'ecs-component')) {
      expect(family.subjectCoverage.status).toBe('complete');
      expect(family.subjectCoverage.enumeratedCount).toBeGreaterThan(0);
    }
  });

  it('structurally precludes the historical MotionProgram orphan in the typed Scene ECS', () => {
    const facts = liveFacts();
    const ecs = facts.families.find((family) => family.family === 'ecs-component')!;
    const motionProgram = ecs.observations.filter((observation) => observation.subject === 'MotionProgram');
    const runtimeWritePlan = ecs.observations.filter((observation) => observation.subject === 'RuntimeWritePlan');

    expect(ecs.subjectCoverage).toMatchObject({ status: 'complete' });
    expect(motionProgram).toEqual([]);
    expect(runtimeWritePlan.map((observation) => observation.role).sort()).toEqual(['consumer', 'producer']);
    expect(decideFeatureEdgeConnectivity({ featureEdges: facts })).toEqual([]);
  });

  it.each([
    'lsp-method',
    'mcp-method',
    'command-capability',
    'command',
    'mcp-resource',
    'mcp-prompt',
    'capsule-kind',
    'fleet-event',
  ] satisfies readonly Exclude<FeatureEdgeFamily, 'ecs-component'>[])(
    'turns an omitted %s producer into one deterministic orphan',
    (family) => {
      const facts = liveFacts();
      const packs = facts.families.map((pack) => (pack.family === family ? withoutFirstProducer(pack) : pack));
      const mutated = combineFeatureEdgeFamilies(packs);
      const findings = decideFeatureEdgeConnectivity({ featureEdges: mutated });
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        ruleId: 'gauntlet/feature-edge-connectivity/orphan-consumer',
        severity: 'error',
      });
    },
  );

  it('refuses duplicate declarations and fake producers before they can mint facts', () => {
    const declaration = {
      subject: 'alpha',
      mechanism: 'registry-entry' as const,
      file: 'fixture/catalog.ts',
      line: 1,
    };
    const base: CatalogFeatureEdgeOptions = {
      family: 'command',
      declarations: [declaration],
      producers: [{ ...declaration, mechanism: 'command-handler' }],
    };
    const duplicate = (): void => {
      buildCatalogFeatureEdgeFamily({ ...base, declarations: [declaration, declaration] });
    };
    expect(duplicate).toThrow(/duplicate subject "alpha"/);
    try {
      duplicate();
    } catch (error) {
      expect(error).toMatchObject({ _tag: 'ValidationError', module: 'feature-edge.catalog' });
    }
    const fabricated = (): void => {
      buildCatalogFeatureEdgeFamily({
        ...base,
        producers: [{ ...declaration, subject: 'fabricated', mechanism: 'command-handler' }],
      });
    };
    expect(fabricated).toThrow(/producer names undeclared subject "fabricated"/);
    try {
      fabricated();
    } catch (error) {
      expect(error).toMatchObject({ _tag: 'ValidationError', module: 'feature-edge.catalog' });
    }
  });

  it('fails MCP capability projection when a paired handler disappears', () => {
    expect(() =>
      projectServerCapabilities(MCP_METHOD_CATALOG.filter((row) => row.method !== 'resources/read')),
    ).toThrow(/resources capability has no registered handler\(s\): resources\/read/);
  });

  it('classifies every structural CommandContext capability exactly once', () => {
    expect(COMMAND_CAPABILITY_DISPOSITIONS.map((row) => row.capability).sort()).toEqual(
      [...COMMAND_CAPABILITIES].sort(),
    );
    expect(new Set(COMMAND_CAPABILITY_DISPOSITIONS.map((row) => row.capability)).size).toBe(
      COMMAND_CAPABILITIES.length,
    );
  });

  it('is deterministic under input family order', () => {
    const families = liveFacts().families;
    expect(combineFeatureEdgeFamilies([...families].reverse())).toEqual(combineFeatureEdgeFamilies(families));
  });

  it('threads the live census through the production repo runner', () => {
    const result = runGauntletOnRepo(
      [featureEdgeConnectivityGate],
      {
        repoRoot: REPO_ROOT,
        globs: ['packages/*/src/**/*.ts'],
        featureEdges: liveFacts(),
      },
      { now: new Date('2026-07-26T00:00:00.000Z') },
    );
    expect(result.findings).toEqual([]);
    expect(result.blocked).toBe(false);
  });

  it('blocks the production repo runner when one required family is missing', () => {
    const live = liveFacts();
    const missing = {
      ...live,
      families: live.families.filter((family) => family.family !== 'mcp-prompt'),
    };
    const result = runGauntletOnRepo(
      [featureEdgeConnectivityGate],
      {
        repoRoot: REPO_ROOT,
        globs: ['packages/*/src/**/*.ts'],
        featureEdges: missing,
      },
      { now: new Date('2026-07-26T00:00:00.000Z') },
    );
    expect(result.blocked).toBe(true);
    expect(result.findings).toEqual([
      expect.objectContaining({
        ruleId: 'gauntlet/feature-edge-connectivity/subject-coverage',
        severity: 'advisory',
      }),
      expect.objectContaining({
        ruleId: 'gauntlet/authority-integrity',
        severity: 'error',
      }),
    ]);
  });
});
