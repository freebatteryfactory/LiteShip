import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RELEASE_ATTESTATION_PATTERNS,
  RELEASE_REQUIRED_PUBLISH_SUBJECTS,
  releaseAttestationFindings,
  type ReleaseAttestationFindingCode,
} from '../../../scripts/lib/release-attestation-contract.js';

const release = readFileSync('.github/workflows/release.yml', 'utf8');

function expectFinding(workflow: string, code: ReleaseAttestationFindingCode): void {
  expect(releaseAttestationFindings(workflow).map((finding) => finding.code)).toContain(code);
}

describe('release evidence attestation closure', () => {
  it('attests and independently verifies the complete admitted release bundle', () => {
    expect(releaseAttestationFindings(release)).toEqual([]);
  });

  it.each(RELEASE_ATTESTATION_PATTERNS)('reds when certification omits attestation subject %s', (subject) => {
    expectFinding(release.replace(subject, '[omitted-attestation-subject]'), 'missing-attestation-subject');
  });

  it.each(RELEASE_REQUIRED_PUBLISH_SUBJECTS)('reds when publish omits required evidence %s', (subject) => {
    const publishOccurrence = release.lastIndexOf(subject);
    expect(publishOccurrence).toBeGreaterThanOrEqual(0);
    const mutated = `${release.slice(0, publishOccurrence)}[omitted-required-subject]${release.slice(publishOccurrence + subject.length)}`;
    expectFinding(mutated, 'missing-required-evidence-subject');
  });

  it('reds when publish verifies tarballs but omits evidence and capsules', () => {
    expectFinding(
      release.replace(
        'find release-artifacts/tarballs release-artifacts/evidence release-artifacts/capsules',
        'find release-artifacts/tarballs',
      ),
      'missing-verification-root',
    );
  });

  it.each([
    ['--signer-workflow "$GITHUB_REPOSITORY/.github/workflows/release.yml"', 'missing-signer-workflow'],
    ['--source-digest "$GITHUB_SHA"', 'missing-source-digest'],
  ] as const)('reds when publish drops verifier constraint %s', (fragment, code) => {
    expectFinding(release.replace(fragment, ''), code);
  });

  it('reds when the release manifest is not bound to the publishing SHA', () => {
    expectFinding(
      release.replace('test "$(jq -er .sourceCommit "$BUNDLE")" = "$GITHUB_SHA"', 'true # source check omitted'),
      'missing-source-binding',
    );
  });

  it('reds when the admitted plan is not bound to the frozen bundle', () => {
    expectFinding(release.replaceAll('.plan.id == $plan', '.plan.id != $plan'), 'missing-plan-binding');
  });

  it('reds when either independent receipt-DAG verification call is removed', () => {
    const withoutFirst = release.replace('scripts/verify-release-delivery-evidence.ts', 'scripts/removed.ts');
    expectFinding(withoutFirst, 'missing-independent-verifier');
    const last = release.lastIndexOf('scripts/verify-release-delivery-evidence.ts');
    const withoutLast = `${release.slice(0, last)}scripts/removed.ts${release.slice(last + 'scripts/verify-release-delivery-evidence.ts'.length)}`;
    expectFinding(withoutLast, 'missing-independent-verifier');
  });

  it.each([
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
  ] as const)('reds when publish drops admission binding %s', (fragment) => {
    expectFinding(release.replaceAll(fragment, 'true'), 'missing-admission-binding');
  });
});
