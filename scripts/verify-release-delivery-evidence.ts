/** CLI host for frozen release/publish delivery-evidence validation. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { verifyReleaseDeliveryEvidence } from './lib/release-delivery-evidence.js';

function env(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) throw new TypeError(`${name} is required`);
  return value;
}

const planPath = process.argv[2];
const evidenceRoot = process.argv[3];
if (planPath === undefined || evidenceRoot === undefined) {
  throw new TypeError('usage: verify-release-delivery-evidence <plan.json> <evidence-root>');
}
await verifyReleaseDeliveryEvidence({
  planBytes: readFileSync(planPath),
  manifestBytes: readFileSync(join(evidenceRoot, 'delivery-evidence-manifest.json')),
  receiptBytes: readFileSync(join(evidenceRoot, 'delivery-admission-receipt.json')),
  chainBytes: readFileSync(join(evidenceRoot, 'delivery-receipt-chain.json')),
  expected: {
    headSha: env('GITHUB_SHA'),
    repository: env('GITHUB_REPOSITORY'),
    workflow: env('GITHUB_WORKFLOW'),
    runId: env('GITHUB_RUN_ID'),
    runAttempt: env('GITHUB_RUN_ATTEMPT'),
    ref: env('GITHUB_REF'),
  },
});
process.stdout.write('release delivery evidence verified\n');
