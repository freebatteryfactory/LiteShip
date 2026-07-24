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
import { walkFiles } from '@liteship/core/fs-walk';
import { assertTypeDocInputFingerprint, writeTypeDocInputFingerprint } from './lib/typedoc-input-fingerprint.js';

const COMMITTED_DIR = 'docs/api';
const REPO_ROOT = process.cwd();
const DOCS_NODE_OPTIONS = ['--max-old-space-size=8192', process.env.NODE_OPTIONS ?? ''].join(' ').trim();

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

const tempDir = mkdtempSync(join(tmpdir(), 'liteship-docs-check-'));

try {
  const build = spawnSync('pnpm', ['exec', 'typedoc', '--out', tempDir], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: DOCS_NODE_OPTIONS,
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
  const countMd = (dir: string): number => walkFiles(dir, { suffixes: ['.md'] }).length;
  const committedCount = countMd(COMMITTED_DIR);
  const freshCount = countMd(tempDir);
  if (freshCount < committedCount * 0.9) {
    console.error(
      `docs:check — the fresh typedoc build produced ${freshCount} pages vs ${committedCount} committed: ` +
        'the build did not finish (typically an out-of-memory abort laundered to exit 0). ' +
        'Raise --max-old-space-size in docs:build / docs-check.ts rather than committing the partial output.',
    );
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

  console.log(`docs:check passed — committed ${COMMITTED_DIR}/ matches source TSDoc.`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
