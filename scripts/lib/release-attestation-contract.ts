/** Pure static contract for release evidence attestation and frozen-artifact promotion. @module */

import { workflowJob } from './release-promotion-contract.js';

export const RELEASE_ATTESTATION_PATTERNS = [
  'release-artifacts/tarballs/*.tgz',
  'release-artifacts/tarballs/release-artifacts.json',
  'release-artifacts/evidence/**',
  'release-artifacts/capsules/*.shipcapsule.cbor',
] as const;

export const RELEASE_REQUIRED_PUBLISH_SUBJECTS = [
  'release-artifacts/tarballs/release-artifacts.json',
  'release-artifacts/evidence/delivery-evidence-manifest.json',
  'release-artifacts/evidence/delivery-admission-receipt.json',
  'release-artifacts/evidence/delivery-receipt-chain.json',
  'release-artifacts/evidence/sbom.cdx.json',
  'release-artifacts/evidence/vex.cdx.json',
] as const;

export type ReleaseAttestationFindingCode =
  | 'missing-delivery-evidence-download'
  | 'missing-delivery-evidence-copy'
  | 'missing-attestation-subject'
  | 'missing-required-evidence-subject'
  | 'missing-verification-root'
  | 'missing-signer-workflow'
  | 'missing-source-digest'
  | 'missing-source-binding'
  | 'missing-plan-binding'
  | 'missing-admission-binding'
  | 'missing-independent-verifier';

export interface ReleaseAttestationFinding {
  readonly code: ReleaseAttestationFindingCode;
  readonly detail: string;
}

function missing(
  findings: ReleaseAttestationFinding[],
  text: string,
  fragment: string,
  code: ReleaseAttestationFindingCode,
  detail: string,
): void {
  if (!text.includes(fragment)) findings.push({ code, detail });
}

/**
 * Inspect the release workflow without running Actions. Each finding describes
 * a mutation that would weaken the build-once, attest-all, publish-exactly law.
 */
export function releaseAttestationFindings(workflow: string): readonly ReleaseAttestationFinding[] {
  const certified = workflowJob(workflow, 'release-certified', 'publish');
  const publish = workflowJob(workflow, 'publish');
  const findings: ReleaseAttestationFinding[] = [];
  const requiredSubjectsStart = publish.indexOf('required_subjects=(');
  const requiredSubjectsEnd = requiredSubjectsStart < 0 ? -1 : publish.indexOf('\n          )', requiredSubjectsStart);
  const requiredSubjects =
    requiredSubjectsStart < 0 || requiredSubjectsEnd < 0
      ? ''
      : publish.slice(requiredSubjectsStart, requiredSubjectsEnd);

  missing(
    findings,
    certified,
    'name: delivery-evidence',
    'missing-delivery-evidence-download',
    'certification does not download the admitted delivery-evidence artifact',
  );
  missing(
    findings,
    certified,
    'scripts/verify-release-delivery-evidence.ts',
    'missing-independent-verifier',
    'certification does not independently validate the admitted receipt DAG',
  );
  missing(
    findings,
    publish,
    'scripts/verify-release-delivery-evidence.ts',
    'missing-independent-verifier',
    'publish does not independently revalidate the frozen receipt DAG',
  );
  missing(
    findings,
    certified,
    'cp -R .liteship/delivery-evidence/reports/. release-artifacts/evidence/',
    'missing-delivery-evidence-copy',
    'certification does not freeze the complete admitted evidence bundle',
  );
  for (const subject of RELEASE_ATTESTATION_PATTERNS) {
    missing(findings, certified, subject, 'missing-attestation-subject', `certification does not attest ${subject}`);
  }

  for (const subject of RELEASE_REQUIRED_PUBLISH_SUBJECTS) {
    missing(
      findings,
      requiredSubjects,
      subject,
      'missing-required-evidence-subject',
      `publish does not require ${subject}`,
    );
  }
  for (const root of [
    'find release-artifacts/tarballs release-artifacts/evidence release-artifacts/capsules',
  ] as const) {
    missing(
      findings,
      publish,
      root,
      'missing-verification-root',
      'publish does not enumerate every frozen tarball, evidence file, and ShipCapsule',
    );
  }
  missing(
    findings,
    publish,
    '--signer-workflow "$GITHUB_REPOSITORY/.github/workflows/release.yml"',
    'missing-signer-workflow',
    'publish accepts attestations from an unspecified workflow',
  );
  missing(
    findings,
    publish,
    '--source-digest "$GITHUB_SHA"',
    'missing-source-digest',
    'publish accepts attestations for an unspecified source revision',
  );
  missing(
    findings,
    publish,
    'test "$(jq -er .sourceCommit "$BUNDLE")" = "$GITHUB_SHA"',
    'missing-source-binding',
    'the frozen release manifest is not bound to the publishing source SHA',
  );
  missing(
    findings,
    publish,
    '.plan.id == $plan',
    'missing-plan-binding',
    'the delivery manifest is not bound to the frozen release plan id',
  );
  for (const fragment of [
    '.verdict == "accepted"',
    '.verifier == "delivery-evidence/standalone-v2"',
    '.manifestId == $manifest',
    '.headSha == $head',
    '.github.repository == $repository',
    '.github.workflow == $workflow',
    '.github.runId == $runId',
    '.github.runAttempt == $runAttempt',
    '.github.ref == $ref',
    '.receiptChain.path == "reports/delivery-receipt-chain.json"',
    '.receiptChain.digest == $chainDigest',
    '.receiptChain.stages == $chainStages',
    'CHAIN_DIGEST="sha256:$(sha256sum "$CHAIN"',
    '[.receipts[] | {kind, receiptId: .hash}]',
    '(keys | sort) == ["headSha", "manifestId", "planId", "receipts", "schemaVersion"]',
    '[.receipts[].kind] == ["delivery-intent", "delivery-plan", "delivery-verification", "delivery-artifact", "delivery-policy", "delivery-release"]',
    '[.receiptChain.stages[].kind] == ["delivery-intent", "delivery-plan", "delivery-verification", "delivery-artifact", "delivery-policy", "delivery-release"]',
  ] as const) {
    missing(findings, publish, fragment, 'missing-admission-binding', `publish admission omits ${fragment}`);
  }

  return findings;
}
