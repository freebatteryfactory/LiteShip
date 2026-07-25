#!/usr/bin/env tsx
/**
 * Regenerates docs/api/ to a temp directory and diffs it against the committed
 * docs/api/. Fails non-zero if they differ — prevents committed API docs from
 * silently drifting away from source TSDoc.
 *
 * Run this in CI after every gauntlet pass. Run `pnpm run docs:build` locally
 * when TSDoc blocks change to refresh the committed output.
 */

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
import { spawnArgv, spawnArgvCapture } from './lib/spawn.js';

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
  const inheritedNodeOptions = process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS = withAdmittedNodeHeap(inheritedNodeOptions, resourcePlan.docs.heapMiB);
  let build: Awaited<ReturnType<typeof spawnArgv>>;
  try {
    build = await spawnArgv('pnpm', ['exec', 'typedoc', '--out', tempDir], { stdio: 'inherit' });
  } finally {
    if (inheritedNodeOptions === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = inheritedNodeOptions;
  }
  if (build.exitCode !== 0) throw new Error(`typedoc build failed (exit ${build.exitCode})`);

  // A typedoc OOM can be laundered to exit 0 through the pnpm exec chain,
  // leaving PARTIAL output that diffs as phantom mass-deletion drift. File
  // count is the honest signal: a fresh build that produced far fewer pages
  // than the committed tree did not finish — fail with the real cause.
  const committedCount = countTypeDocMarkdown(COMMITTED_DIR);
  const freshCount = countTypeDocMarkdown(tempDir);
  assertCompleteTypeDocProjection(committedCount, freshCount);

  // The manifest is part of committed generated truth. TypeDoc itself does not
  // emit it, so project the same live input fingerprint into the fresh tree
  // before the exact no-index diff.
  writeTypeDocInputFingerprint(REPO_ROOT, join(tempDir, '.typedoc-input-fingerprint.json'));

  const diff = await spawnArgvCapture('git', ['diff', '--no-index', '--stat', COMMITTED_DIR, tempDir]);
  const diffOutput = diff.stdout + diff.stderr;

  if (diff.exitCode !== 0 || diffOutput.trim().length > 0) {
    throw new Error(
      `committed ${COMMITTED_DIR}/ is out of sync with source TSDoc:\n${diffOutput}\n` +
        `Run 'pnpm run docs:build' and commit the result.`,
    );
  }

  if (useLocalCache) writeTypeDocProofReceipt(REPO_ROOT, proofIdentity);
  console.log(
    `docs:check passed — committed ${COMMITTED_DIR}/ matches source TSDoc.` +
      (useLocalCache ? ` Proof ${proofIdentity.proofKey} cached locally.` : ''),
  );
} catch (error) {
  console.error(`docs:check — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
