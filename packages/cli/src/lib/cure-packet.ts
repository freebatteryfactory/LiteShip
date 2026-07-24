/**
 * CLI-owned projection of failed check evidence into an immutable CurePacket.
 *
 * The shared command package owns the packet schema. The terminal orchestrator
 * owns minting because it alone possesses the executed lane, process output,
 * and source-tree evidence needed to populate that schema.
 *
 * @module
 */

import { sha256Hex } from '@liteship/canonical';
import { CanonicalCbor, IntegrityDigest } from '@liteship/core';
import { snapshotDefinitionValue } from '@liteship/core/evidence';
import { finding } from '@liteship/gauntlet';
import type { CurePacket, CurePacketInput } from '@liteship/command';

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

/** Mint one immutable, content-digested cure packet from executed CLI evidence. */
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
