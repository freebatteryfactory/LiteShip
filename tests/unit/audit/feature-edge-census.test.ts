import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildEcsFeatureEdgeFacts, type EcsFeatureEdgeApi } from '@liteship/audit';
import { decideFeatureEdgeConnectivity, featureEdgeConnectivityGate, verifyGate } from '@liteship/gauntlet';
import { createCurePacket } from '../../../packages/cli/src/internal/cure-packet.js';
import { loadHistoricalDefect } from '../../support/historical-defect-corpus.js';
import { buildLiteShipFeatureEdgeFacts } from '../../../scripts/lib/feature-edge-profile.js';
import { repositoryProofTimeout } from '../../../vitest.shared.js';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const FIXTURE = 'tests/fixtures/cure-packets/motion-program-orphan';
const API: EcsFeatureEdgeApi = {
  declarationFile: `${FIXTURE}/ecs-api.ts`,
  worldExport: 'World',
  systemExports: ['System', 'DenseSystem'],
  partExport: 'Part',
  denseStoreFactoryExport: 'createDenseStore',
  worldMembers: {
    query: 'query',
    spawn: 'spawn',
    addComponent: 'addComponent',
    setComponent: 'setComponent',
  },
  systemQueryMember: 'query',
  partNameMember: 'name',
};

function historicalFacts() {
  const defect = loadHistoricalDefect(REPO_ROOT, FIXTURE);
  return {
    defect,
    facts: buildLiteShipFeatureEdgeFacts(
      REPO_ROOT,
      buildEcsFeatureEdgeFacts({
        repoRoot: REPO_ROOT,
        sourceFiles: defect.sourceFiles,
        api: { ...API, declarationFile: defect.apiDeclarationFile },
      }),
    ),
  };
}

describe('checker-backed feature-edge census', () => {
  it(
    'replays the escaped MotionProgram orphan while classifying VideoSource as connected',
    () => {
      const { defect, facts } = historicalFacts();
      expect(defect.caseFile.historicalSourceSha).toBe('aa7832ab9f8a022c5e1c6fa8cb73cc38926c1d35');
      expect(defect.caseFile.admission).toEqual({
        kind: 'structurally-precluded',
        replayProof: 'tests/unit/audit/feature-edge-census.test.ts#historical-overlay',
        preclusionProof: 'tests/unit/audit/live-feature-edge-profile.test.ts#typed-scene-ecs',
      });
      const ecs = facts.families.find((family) => family.family === 'ecs-component')!;
      expect(ecs.subjectCoverage).toMatchObject({
        status: 'complete',
        enumerator: 'ts-checker/ecs-component-v1',
        enumeratedCount: 2,
      });

      const videoSource = ecs.observations.filter((observation) => observation.subject === 'VideoSource');
      const motionProgram = ecs.observations.filter((observation) => observation.subject === 'MotionProgram');
      expect(videoSource.map((observation) => observation.role).sort()).toEqual(['consumer', 'producer']);
      expect(motionProgram.map((observation) => observation.role)).toEqual(['consumer']);

      const findings = decideFeatureEdgeConnectivity({ featureEdges: facts });
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        ruleId: 'gauntlet/feature-edge-connectivity/orphan-consumer',
        severity: 'error',
        title: 'ECS component "MotionProgram" is consumed but never produced',
      });
    },
    repositoryProofTimeout(),
  );

  it(
    'mints one deterministic CurePacket from the retained real defect',
    () => {
      const { defect, facts } = historicalFacts();
      const finding = decideFeatureEdgeConnectivity({ featureEdges: facts })[0]!;
      const input = {
        headSha: defect.caseFile.historicalSourceSha,
        treeDigest: defect.treeDigest,
        checkId: finding.ruleId,
        title: finding.title,
        claim: 'Every statically enumerable ECS component query resolves to a producer.',
        owner: defect.caseFile.owner,
        remediation: 'Connect the component through the typed ECS producer path.',
        command: 'pnpm exec vitest run tests/unit/audit/feature-edge-census.test.ts --maxWorkers=2',
        findings: [finding.detail],
        profile: 'full',
        lane: 'cheap-feature-edge',
        platform: 'portable',
        toolchain: 'typescript=6.0.2',
        invariantIds: ['INV-FEATURE-EDGE-PRODUCER'],
        publicRoutes: ['@liteship/scene'],
        artifacts: defect.artifacts,
        reproducer: { kind: 'fixture' as const, fixture: FIXTURE },
      };
      const first = createCurePacket(input);
      const second = createCurePacket({ ...input, artifacts: [...defect.artifacts].reverse() });

      expect(second.packetId).toBe(first.packetId);
      expect(first.reproducer.fixture).toBe(FIXTURE);
      expect(first.source.headSha).toBe(defect.caseFile.historicalSourceSha);
      expect(first.observation.actual).toEqual([finding.detail]);
      expect(first.prompt).toContain('MotionProgram');
    },
    repositoryProofTimeout(),
  );

  it(
    'is order-independent and self-proves the pure gate',
    () => {
      const { defect, facts } = historicalFacts();
      const reversed = buildLiteShipFeatureEdgeFacts(
        REPO_ROOT,
        buildEcsFeatureEdgeFacts({
          repoRoot: REPO_ROOT,
          sourceFiles: [...defect.sourceFiles].reverse(),
          api: { ...API, declarationFile: defect.apiDeclarationFile },
        }),
      );
      expect(reversed).toEqual(facts);
      expect(verifyGate(featureEdgeConnectivityGate)).toMatchObject({
        redCaught: true,
        greenClean: true,
        mutationKilled: true,
        selfProven: true,
      });
    },
    repositoryProofTimeout(),
  );

  it(
    'reports dynamic canonical edges as unknown and ignores unrelated same-name methods',
    () => {
      const facts = buildLiteShipFeatureEdgeFacts(
        REPO_ROOT,
        buildEcsFeatureEdgeFacts({
          repoRoot: REPO_ROOT,
          sourceFiles: [
            'tests/fixtures/feature-edge-census/dynamic.ts',
            'tests/fixtures/feature-edge-census/unrelated.ts',
          ],
          api: API,
        }),
      );

      const ecs = facts.families.find((family) => family.family === 'ecs-component')!;
      expect(ecs.observations).toEqual([]);
      expect(ecs.subjectCoverage.status).toBe('unknown');
      if (ecs.subjectCoverage.status === 'unknown') {
        expect(ecs.subjectCoverage.opaqueSites).toHaveLength(2);
        expect(ecs.subjectCoverage.opaqueSites.map((site) => site.mechanism).sort()).toEqual([
          'system-query',
          'world-spawn',
        ]);
      }
      const findings = featureEdgeConnectivityGate.run({
        repoRoot: REPO_ROOT,
        readFile: () => undefined,
        files: () => [],
        featureEdges: facts,
      });
      expect(findings).toHaveLength(1);
      expect(findings[0]?.ruleId).toBe('gauntlet/feature-edge-connectivity/subject-coverage');
    },
    repositoryProofTimeout(),
  );
});
