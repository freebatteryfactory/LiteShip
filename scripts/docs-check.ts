#!/usr/bin/env tsx
/**
 * Proves TypeDoc still builds a COMPLETE projection from the live source
 * TSDoc. `docs/api` is a build artifact, not committed truth (W8.5), so there
 * is no committed copy to diff against — and there never needed to be: the
 * only consumer of those 3,556 committed files was this check comparing them
 * to a fresh build.
 *
 * The cheap staleness signal is the committed input fingerprint in
 * `traceability/`, asserted before the expensive build runs.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertTypeDocInputFingerprint } from './lib/typedoc-input-fingerprint.js';
import {
  awaitLocalDocsAdmission,
  formatLocalResourcePlan,
  withAdmittedNodeHeap,
} from './lib/local-resource-profile.js';
import {
  buildTypeDocProofIdentity,
  countTypeDocMarkdown,
  readTypeDocProofReceipt,
  writeTypeDocProofReceipt,
} from './lib/typedoc-proof-cache.js';
import { spawnArgv } from './lib/spawn.js';

/**
 * Non-vacuity floor for the emitted projection. Observed 3,555 markdown pages
 * at the W8.5 decommit; the floor sits below that so ordinary surface churn
 * does not trip it, while a truncated build (a TypeDoc OOM can exit 0 through
 * the pnpm exec chain) cannot pass as success.
 */
const TYPEDOC_COMPLETENESS_FLOOR = 3000;
const REPO_ROOT = process.cwd();
const useLocalCache = process.argv.includes('--local-cache') && process.env.CI !== 'true';
const printPlan = process.argv.includes('--plan');
const json = process.argv.includes('--json');

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

  // docs/api is a BUILD ARTIFACT, not committed truth (W8.5): 3,556 files
  // that are a pure function of source bought only review noise — they were
  // 52% of a branch's changed files for 10% of its content, and the only
  // consumer of the committed bytes was this very check diffing them against
  // a fresh build. What remains worth proving is what a committed copy could
  // never prove on its own: that TypeDoc still builds from the live TSDoc and
  // emits a COMPLETE projection. The committed input fingerprint (now in
  // traceability/, outside the ignored tree) carries the cheap staleness
  // signal, and it is asserted above before any of this runs.
  const freshLocal = countTypeDocMarkdown(tempDir);
  if (freshLocal < TYPEDOC_COMPLETENESS_FLOOR) {
    throw new Error(
      `TypeDoc emitted ${freshLocal} markdown pages, below the ${TYPEDOC_COMPLETENESS_FLOOR}-page completeness floor — ` +
        `the build did not finish (a typedoc OOM can exit 0 through the pnpm exec chain).`,
    );
  }

  if (useLocalCache) writeTypeDocProofReceipt(REPO_ROOT, proofIdentity);
  console.log(
    `docs:check passed — TypeDoc builds from source TSDoc; ${freshLocal} pages emitted (floor ${TYPEDOC_COMPLETENESS_FLOOR}).` +
      (useLocalCache ? ` Proof ${proofIdentity.proofKey} cached locally.` : ''),
  );
} catch (error) {
  console.error(`docs:check — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
