#!/usr/bin/env tsx
/** Resource-admitted canonical TypeDoc build. @module */

import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  awaitLocalDocsAdmission,
  formatLocalResourcePlan,
  withAdmittedNodeHeap,
} from './lib/local-resource-profile.js';
import { spawnArgv } from './lib/spawn.js';
import { writeTypeDocInputFingerprint } from './lib/typedoc-input-fingerprint.js';
import {
  assertCompleteTypeDocProjection,
  buildTypeDocProofIdentity,
  countTypeDocMarkdown,
  writeTypeDocProofReceipt,
} from './lib/typedoc-proof-cache.js';

const repoRoot = resolve(import.meta.dirname, '..');
const committedDir = resolve(repoRoot, 'docs', 'api');
const scratchRoot = resolve(repoRoot, '.liteship', 'tmp');
mkdirSync(scratchRoot, { recursive: true });
const tempDir = mkdtempSync(join(scratchRoot, 'typedoc-build-'));
const backupDir = resolve(repoRoot, 'docs', `.api-backup-${process.pid}`);

try {
  const plan = await awaitLocalDocsAdmission({
    ci: process.env.CI === 'true',
    onObservation: (observation) => console.error(formatLocalResourcePlan(observation)),
  });
  const committedCount = countTypeDocMarkdown(committedDir);
  const inheritedNodeOptions = process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS = withAdmittedNodeHeap(inheritedNodeOptions, plan.docs.heapMiB);
  let build: Awaited<ReturnType<typeof spawnArgv>>;
  try {
    build = await spawnArgv('pnpm', ['exec', 'typedoc', '--out', tempDir], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  } finally {
    if (inheritedNodeOptions === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = inheritedNodeOptions;
  }
  if (build.exitCode !== 0) throw new Error(`TypeDoc exited ${String(build.exitCode)}`);
  const freshCount = countTypeDocMarkdown(tempDir);
  assertCompleteTypeDocProjection(committedCount, freshCount);
  const fingerprint = writeTypeDocInputFingerprint(repoRoot, resolve(tempDir, '.typedoc-input-fingerprint.json'));
  if (existsSync(backupDir)) rmSync(backupDir, { recursive: true, force: true });
  if (existsSync(committedDir)) renameSync(committedDir, backupDir);
  try {
    renameSync(tempDir, committedDir);
  } catch (error) {
    if (!existsSync(committedDir) && existsSync(backupDir)) renameSync(backupDir, committedDir);
    throw error;
  }
  rmSync(backupDir, { recursive: true, force: true });
  const receipt = writeTypeDocProofReceipt(repoRoot, buildTypeDocProofIdentity(repoRoot));
  console.log(`docs:build passed — ${fingerprint.digest}; local proof ${receipt.proofKey}`);
} catch (error) {
  console.error(`docs:build failed — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
