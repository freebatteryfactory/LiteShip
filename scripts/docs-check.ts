#!/usr/bin/env tsx
/**
 * Regenerates docs/api/ to a temp directory and diffs it against the committed
 * docs/api/. Fails non-zero if they differ — prevents committed API docs from
 * silently drifting away from source TSDoc.
 *
 * Run this in CI after every gauntlet pass. Run `pnpm run docs:build` locally
 * when TSDoc blocks change to refresh the committed output.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertTypeDocInputFingerprint, writeTypeDocInputFingerprint } from './lib/typedoc-input-fingerprint.js';
import {
  awaitLocalDocsAdmission,
  formatLocalResourcePlan,
  withAdmittedNodeHeap,
} from './lib/local-resource-profile.js';
import {
  buildTypeDocProofIdentity,
  assertCompleteTypeDocProjection,
  countTypeDocMarkdown,
  readTypeDocProofReceipt,
  writeTypeDocProofReceipt,
} from './lib/typedoc-proof-cache.js';

const COMMITTED_DIR = 'docs/api';
const REPO_ROOT = process.cwd();
const useLocalCache = process.argv.includes('--local-cache') && process.env.CI !== 'true';
const printPlan = process.argv.includes('--plan');
const json = process.argv.includes('--json');

if (!existsSync(COMMITTED_DIR)) {
  console.error(`docs:check — ${COMMITTED_DIR} does not exist. Run 'pnpm run docs:build' first.`);
  process.exit(1);
}

try {
  assertTypeDocInputFingerprint(REPO_ROOT);
} catch (error) {
  console.error(`docs:check — ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const proofIdentity = buildTypeDocProofIdentity(REPO_ROOT);
const cacheHit = useLocalCache && readTypeDocProofReceipt(REPO_ROOT, proofIdentity) !== null;
if (cacheHit) {
  const receipt = {
    schema: 'liteship/local-docs-plan@1',
    action: 'reuse-proof',
    cacheHit: true,
    proofKey: proofIdentity.proofKey,
  } as const;
  console.log(json ? JSON.stringify(receipt, null, 2) : `docs:check local proof hit — ${proofIdentity.proofKey}`);
  process.exit(0);
}

let resourcePlan: Awaited<ReturnType<typeof awaitLocalDocsAdmission>>;
try {
  resourcePlan = await awaitLocalDocsAdmission({
    ci: process.env.CI === 'true',
    onObservation: printPlan && json ? undefined : (plan) => console.error(formatLocalResourcePlan(plan)),
  });
} catch (error) {
  console.error(`docs:check — ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (printPlan) {
  const receipt = {
    schema: 'liteship/local-docs-plan@1',
    action: 'run-full-proof',
    cacheHit: false,
    proofKey: proofIdentity.proofKey,
    resource: resourcePlan,
  } as const;
  console.log(
    json ? JSON.stringify(receipt, null, 2) : `${formatLocalResourcePlan(resourcePlan)}; full proof required`,
  );
  process.exit(0);
}

const tempDir = mkdtempSync(join(tmpdir(), 'liteship-docs-check-'));

try {
  const build = spawnSync('pnpm', ['exec', 'typedoc', '--out', tempDir], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: withAdmittedNodeHeap(process.env.NODE_OPTIONS, resourcePlan.docs.heapMiB),
    },
  });
  if (build.status !== 0) {
    console.error('docs:check — typedoc build failed');
    process.exit(1);
  }

  // A typedoc OOM can be laundered to exit 0 through the pnpm exec chain,
  // leaving PARTIAL output that diffs as phantom mass-deletion drift. File
  // count is the honest signal: a fresh build that produced far fewer pages
  // than the committed tree did not finish — fail with the real cause.
  const committedCount = countTypeDocMarkdown(COMMITTED_DIR);
  const freshCount = countTypeDocMarkdown(tempDir);
  try {
    assertCompleteTypeDocProjection(committedCount, freshCount);
  } catch (error) {
    console.error(`docs:check — ${error instanceof Error ? error.message : String(error)}.`);
    process.exit(1);
  }

  // The manifest is part of committed generated truth. TypeDoc itself does not
  // emit it, so project the same live input fingerprint into the fresh tree
  // before the exact no-index diff.
  writeTypeDocInputFingerprint(REPO_ROOT, join(tempDir, '.typedoc-input-fingerprint.json'));

  const diff = spawnSync('git', ['diff', '--no-index', '--stat', COMMITTED_DIR, tempDir], {
    stdio: 'pipe',
    shell: true,
  });
  const diffOutput = (diff.stdout?.toString() ?? '') + (diff.stderr?.toString() ?? '');

  if (diff.status !== 0 || diffOutput.trim().length > 0) {
    console.error(`docs:check — committed ${COMMITTED_DIR}/ is out of sync with source TSDoc:`);
    console.error(diffOutput);
    console.error(`Run 'pnpm run docs:build' and commit the result.`);
    process.exit(1);
  }

  if (useLocalCache) writeTypeDocProofReceipt(REPO_ROOT, proofIdentity);
  console.log(
    `docs:check passed — committed ${COMMITTED_DIR}/ matches source TSDoc.` +
      (useLocalCache ? ` Proof ${proofIdentity.proofKey} cached locally.` : ''),
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
