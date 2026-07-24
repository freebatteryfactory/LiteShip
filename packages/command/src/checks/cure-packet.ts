/**
 * Deterministic repair evidence projected from a failed check.
 *
 * A CurePacket contains facts and a reproducible verification boundary. It is
 * deliberately not an autonomous patch request: a human may hand its prompt to
 * an agent, but only the named deterministic authority can accept the result.
 *
 * @module
 */

import type { IntegrityDigest as IntegrityDigestValue } from '@liteship/core';
import type { Finding } from '@liteship/gauntlet';

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
