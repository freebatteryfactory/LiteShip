#!/usr/bin/env tsx
/**
 * THE ONE regen command. Regenerates every committed derivable artifact
 * declared in {@link DERIVED_ARTIFACTS}, in declaration order.
 *
 * Before this existed there were six spellings — `docs:build`,
 * `gen-roster --write`, and four distinct `LITESHIP_UPDATE_*` env vars each
 * paired with its own target test — enumerated nowhere. Remembering five of
 * six shipped drift with a green local gate and failed nine CI jobs.
 *
 * Usage:
 *   pnpm run regen              # every fast artifact
 *   pnpm run regen --all        # + artifacts whose regen needs a full pack/install
 *   pnpm run regen --list       # print the plan, run nothing
 *   pnpm run regen <id> [...]   # only the named artifacts
 *
 * @module
 */

import { spawnArgv } from './lib/spawn.js';
import {
  DERIVED_ARTIFACTS,
  CI_ONLY_REASON,
  selectDerivedArtifacts,
  isUnknownSelection,
} from './lib/derived-artifacts.js';

const RULE = '='.repeat(64);
const argv = process.argv.slice(2);
const listOnly = argv.includes('--list');

const selection = selectDerivedArtifacts(argv);
if (isUnknownSelection(selection)) {
  process.stderr.write(`regen: unknown artifact id(s): ${selection.unknown.join(', ')}\n`);
  process.stderr.write(`regen: known ids: ${DERIVED_ARTIFACTS.map((a) => a.id).join(', ')}\n`);
  process.exit(2);
}
const plan = selection;

if (listOnly) {
  for (const artifact of DERIVED_ARTIFACTS) {
    const chosen = plan.includes(artifact) ? '*' : ' ';
    const env = Object.entries(artifact.regenEnv)
      .map(([key, value]) => `${key}=${value} `)
      .join('');
    process.stdout.write(`${chosen} ${artifact.id.padEnd(28)} ${env}pnpm ${artifact.regen.join(' ')}\n`);
    if (!artifact.inPreflight) process.stdout.write(`    (--all only: ${CI_ONLY_REASON[artifact.id]})\n`);
  }
  process.exit(0);
}

let failed = 0;
for (const artifact of plan) {
  process.stdout.write(`\n${RULE}\n  regen → ${artifact.id}\n${RULE}\n`);
  // The canonical spawn helper deliberately takes no `env` — it inherits, so
  // subprocess coverage capture keeps working. Set the opt-in on this
  // process for the duration of the child and restore it after, rather than
  // widening a shared contract for one caller.
  const restore = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries<string>(artifact.regenEnv)) {
    restore.set(key, process.env[key]);
    process.env[key] = value;
  }
  let result;
  try {
    result = await spawnArgv('pnpm', [...artifact.regen], { stdio: ['ignore', 'inherit', 'inherit'] });
  } finally {
    for (const [key, previous] of restore) {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  }
  if (result.exitCode !== 0) {
    process.stderr.write(`  ${artifact.id} FAILED (exit ${result.exitCode})\n`);
    failed += 1;
  } else {
    process.stdout.write(`  ${artifact.id} ok\n`);
  }
}

process.stdout.write(`\n${RULE}\n`);
if (failed > 0) {
  process.stdout.write(`  regen: ${failed} of ${plan.length} artifact(s) FAILED\n${RULE}\n`);
  process.exitCode = 1;
} else {
  const skipped = DERIVED_ARTIFACTS.length - plan.length;
  process.stdout.write(
    `  regen: ${plan.length} artifact(s) regenerated${skipped > 0 ? `; ${skipped} need --all` : ''}.\n` +
      `  Review the diff — a ratchet's diff IS the review artifact.\n${RULE}\n`,
  );
}
