/**
 * Deterministic repair evidence projected from a failed check.
 *
 * A CurePacket contains facts and a reproducible verification boundary. It is
 * deliberately not an autonomous patch request: a human may hand its prompt to
 * an agent, but only the named deterministic authority can accept the result.
 *
 * @module
 */

import { sha256Hex } from '@liteship/canonical';
import { CanonicalCbor, IntegrityDigest, type IntegrityDigest as IntegrityDigestValue } from '@liteship/core';
import { snapshotDefinitionValue } from '@liteship/core/evidence';
import { finding, type Finding } from '@liteship/gauntlet';

export type CureReproducerKind = 'command' | 'fixture' | 'seed' | 'schedule' | 'benchmark';

export interface CureArtifact {
  readonly path: string;
  readonly digest: IntegrityDigestValue;
}

export interface CurePacket {
  readonly schemaVersion: 1;
  readonly packetId: IntegrityDigestValue;
  readonly source: {
    readonly headSha: string;
    readonly treeDigest: IntegrityDigestValue;
  };
  readonly authority: {
    readonly checkId: string;
    readonly ruleId: string;
    readonly profile: string;
    readonly lane: string;
    readonly platform: string;
    readonly toolchain: string;
  };
  readonly contract: {
    readonly owner: string;
    readonly invariantIds: readonly string[];
    readonly publicRoutes: readonly string[];
  };
  readonly finding: Finding;
  readonly reproducer: {
    readonly kind: CureReproducerKind;
    readonly command: readonly string[];
    readonly seed?: string;
    readonly fixture?: string;
    readonly schedule?: readonly unknown[];
  };
  readonly observation: {
    readonly expected: string;
    readonly actual: readonly string[];
  };
  readonly evidence: {
    readonly artifacts: readonly CureArtifact[];
    readonly stdoutTail?: string;
    readonly stderrTail?: string;
  };
  readonly editBoundary: {
    readonly allowedOwners: readonly string[];
    readonly forbiddenShortcuts: readonly string[];
  };
  readonly verification: readonly string[];
  readonly prompt: string;
}

export interface CurePacketInput {
  readonly headSha: string;
  readonly treeDigest: IntegrityDigestValue;
  readonly checkId: string;
  readonly title: string;
  readonly claim: string;
  readonly owner: string;
  readonly remediation: string;
  readonly command: string;
  readonly findings: readonly string[];
  readonly profile: string;
  readonly lane: string;
  readonly platform: string;
  readonly toolchain: string;
  readonly invariantIds?: readonly string[];
  readonly publicRoutes?: readonly string[];
  readonly artifacts?: readonly CureArtifact[];
}

const FORBIDDEN_SHORTCUTS = Object.freeze([
  'Do not weaken, skip, retry away, exempt, or delete the failing authority.',
  'Do not lower coverage, mutation, benchmark, or standards thresholds.',
  'Do not update generated evidence before the owning behavior is correct.',
]);

/** Render the agent-facing prompt solely from packet facts. */
export function formatCurePrompt(packet: Omit<CurePacket, 'prompt'>): string {
  return [
    `# LiteShip cure packet ${packet.packetId}`,
    '',
    `Authority: ${packet.authority.checkId} (${packet.authority.profile}/${packet.authority.platform})`,
    `Owner: ${packet.contract.owner}`,
    `Claim: ${packet.observation.expected}`,
    '',
    'Observed failure:',
    ...packet.observation.actual.map((line) => `- ${line}`),
    '',
    'Allowed edit boundary:',
    ...packet.editBoundary.allowedOwners.map((owner) => `- ${owner}`),
    '',
    'Forbidden shortcuts:',
    ...packet.editBoundary.forbiddenShortcuts.map((rule) => `- ${rule}`),
    '',
    'Reproduce:',
    ...packet.reproducer.command.map((command) => `- ${command}`),
    '',
    'Verify:',
    ...packet.verification.map((command) => `- ${command}`),
    '',
    'Propose the smallest root fix inside the allowed owner. The deterministic verifier decides acceptance.',
  ].join('\n');
}

/** Mint one immutable, content-digested cure packet. */
export function createCurePacket(input: CurePacketInput): CurePacket {
  const projectedFinding = finding({
    ruleId: input.checkId,
    severity: 'error',
    level: 'L2',
    title: input.title,
    detail: input.findings.join('\n'),
    location: { file: input.owner },
    remediation: { kind: 'instruction', description: input.remediation, steps: [input.command] },
  });
  const identity = snapshotDefinitionValue({
    schemaVersion: 1 as const,
    source: { headSha: input.headSha, treeDigest: input.treeDigest },
    authority: {
      checkId: input.checkId,
      ruleId: input.checkId,
      profile: input.profile,
      lane: input.lane,
      platform: input.platform,
      toolchain: input.toolchain,
    },
    contract: {
      owner: input.owner,
      invariantIds: [...(input.invariantIds ?? [])].sort(),
      publicRoutes: [...(input.publicRoutes ?? [])].sort(),
    },
    finding: projectedFinding,
    reproducer: { kind: 'command' as const, command: [input.command] },
    observation: { expected: input.claim, actual: [...input.findings] },
    evidence: { artifacts: [...(input.artifacts ?? [])] },
    editBoundary: { allowedOwners: [input.owner], forbiddenShortcuts: FORBIDDEN_SHORTCUTS },
    verification: [input.command],
  });
  const packetId = IntegrityDigest(`sha256:${sha256Hex(CanonicalCbor.encode(identity))}`);
  const withoutPrompt = snapshotDefinitionValue({ ...identity, packetId });
  return snapshotDefinitionValue({ ...withoutPrompt, prompt: formatCurePrompt(withoutPrompt) }) as CurePacket;
}
