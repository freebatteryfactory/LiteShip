/** Independently admit exact delivery evidence and mint the final receipt. */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { HLC } from '@liteship/core';
import {
  buildDeliveryAdmissionReceipt,
  buildDeliveryReceiptChainFile,
  parseDeliveryAdmissionReceipt,
  serializeDeliveryReceiptChainFile,
} from './lib/delivery-admission-receipt.js';
import { buildDeliveryEvidenceManifest, buildDeliveryReceiptChain } from './lib/delivery-evidence.js';
import {
  verifyStandaloneDeliveryEvidence,
  type TrustedDeliveryGithubContext,
} from './lib/delivery-evidence-verifier.js';
import { parseAffectedTestPlan } from './lib/affected-test-plan.js';
import { selectCheckEvidence, type DeliveryCiEvent } from './lib/ci-evidence-selection.js';
import { fetchCompletedGithubRunJobs } from './lib/github-run-jobs.js';
import { admitVerifiedArtifactIdentity, parseDeliveryMetrics } from './lib/delivery-metrics.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) throw new TypeError(`${name} is required`);
  return value;
}

const event = requireEnv('GITHUB_EVENT_NAME') as DeliveryCiEvent;
if (!['pull_request', 'push', 'schedule', 'workflow_dispatch', 'workflow_call'].includes(event)) {
  throw new TypeError(`unsupported delivery admission event ${event}`);
}
const expectedBase = {
  event,
  headSha: requireEnv('GITHUB_SHA'),
  repository: requireEnv('GITHUB_REPOSITORY'),
  workflow: requireEnv('GITHUB_WORKFLOW'),
  runId: requireEnv('GITHUB_RUN_ID'),
  runAttempt: requireEnv('GITHUB_RUN_ATTEMPT'),
  ref: requireEnv('GITHUB_REF'),
};
const token = process.env['GH_TOKEN'] ?? requireEnv('GITHUB_TOKEN');
const planPath = process.argv[2] ?? '.liteship/affected-plan.json';
const evidenceRoot = process.argv[3] ?? '.';
const manifestPath = process.argv[4] ?? 'reports/delivery-evidence-manifest.json';
const receiptPath = process.argv[5] ?? 'reports/delivery-admission-receipt.json';
const chainPath = join(evidenceRoot, 'reports/delivery-receipt-chain.json');
const at = (path: string): string => join(evidenceRoot, ...path.split('/'));
const read = (path: string): Buffer => readFileSync(at(path));
const planBytes = readFileSync(planPath);
const plan = parseAffectedTestPlan(JSON.parse(planBytes.toString('utf8')) as unknown);
const selected = selectCheckEvidence(plan, event);
const observedJobs = await fetchCompletedGithubRunJobs({
  repository: expectedBase.repository,
  runId: expectedBase.runId,
  runAttempt: expectedBase.runAttempt,
  token,
});
const expected: TrustedDeliveryGithubContext = Object.freeze({ ...expectedBase, observedJobs });
const builderInput = {
  event,
  headSha: expected.headSha,
  github: {
    repository: expected.repository,
    workflow: expected.workflow,
    runId: expected.runId,
    runAttempt: expected.runAttempt,
    ref: expected.ref,
  },
  planBytes,
  intentBytes: read('reports/change-intent.json'),
  authorityBytes: read('reports/ci-authority.json'),
  governedExceptionsBytes: read('reports/governed-exceptions.json'),
  checkEvidenceBytes: new Map(
    selected.map((selection) => [selection.requirement.path, read(selection.requirement.path)]),
  ),
  metricsBytes: read('reports/delivery-metrics.json'),
} as const;
mkdirSync(dirname(manifestPath), { recursive: true });
const admittedMetrics = admitVerifiedArtifactIdentity(
  parseDeliveryMetrics(JSON.parse(read('reports/delivery-metrics.json').toString('utf8')) as unknown),
);
writeFileSync(at('reports/delivery-metrics.json'), `${JSON.stringify(admittedMetrics, null, 2)}\n`, 'utf8');
const manifest = buildDeliveryEvidenceManifest({
  ...builderInput,
  metricsBytes: read('reports/delivery-metrics.json'),
});
const manifestRaw = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync(manifestPath, manifestRaw, 'utf8');
verifyStandaloneDeliveryEvidence({ manifestJson: manifestRaw, rawPlanBytes: planBytes, evidenceRoot, expected });

const admittedAt = new Date().toISOString();
const receipts = await buildDeliveryReceiptChain(
  manifest,
  HLC.increment(HLC.create('delivery-admission'), Date.parse(admittedAt)),
);
const chain = buildDeliveryReceiptChainFile(manifest, receipts);
const chainRaw = serializeDeliveryReceiptChainFile(chain);
mkdirSync(dirname(chainPath), { recursive: true });
writeFileSync(chainPath, chainRaw, 'utf8');
const receipt = buildDeliveryAdmissionReceipt({ manifest, chain, rawChainBytes: chainRaw, admittedAt });
parseDeliveryAdmissionReceipt(JSON.parse(JSON.stringify(receipt)) as unknown);
mkdirSync(dirname(receiptPath), { recursive: true });
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
process.stdout.write(`${receipt.receiptId} accepted\n`);
