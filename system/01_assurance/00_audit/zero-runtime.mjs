/**
 * Audit: this repository emits no executable JavaScript.
 *
 * The claim is the repository's central one — every `.ts` file here is a
 * declaration surface, and nothing in it becomes code. No compiler flag proves
 * it. `erasableSyntaxOnly` rejects `enum` and value `namespace` and nothing
 * else: `export const x = 1`, `export function`, and `export class` all pass it
 * and all emit real JavaScript.
 *
 * So the proof is to emit and look. Compile the project with emit on, then
 * require every produced file to be exactly `export {};` once whitespace is
 * removed. That catches any value declaration, including forms nobody thought
 * to forbid, which is what a syntax denylist cannot do.
 *
 * This file is the first executable byte in the repository, and it lives here
 * rather than at the root deliberately. `verification/` began as one small
 * script outside every home and grew to fifty-one entries. The difference is
 * ownership: this is a repository program, repository programs live in
 * `system/`, and assurance acquisition lives in `00_audit`. If a second audit
 * appears, it belongs beside this one — not in a new top-level folder.
 *
 * It is `.mjs` rather than `.ts` for a reason worth keeping: the audited
 * population is the TypeScript project, and this file is not in it. An auditor
 * inside its own subject would have to exempt itself, and an exemption is the
 * thing this repository refuses to grow.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TSC = join(REPO, 'node_modules', 'typescript', 'bin', 'tsc');

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : join(dir, entry.name),
  );

const out = mkdtempSync(join(tmpdir(), 'liteship-emit-'));
try {
  execFileSync(
    process.execPath,
    [TSC, '-p', join(REPO, 'tsconfig.json'), '--noEmit', 'false', '--declaration', 'false', '--removeComments', '--outDir', out],
    { stdio: 'inherit', cwd: REPO },
  );

  const emitted = walk(out).filter((file) => file.endsWith('.js'));
  const executable = emitted.filter(
    (file) => readFileSync(file, 'utf8').replace(/\s/gu, '') !== 'export{};',
  );

  // An empty population would pass every check below, so say the number out
  // loud. Zero emitted files means the project resolved nothing, not that the
  // repository is clean.
  console.log(`zero-runtime: ${emitted.length} emitted, ${executable.length} carrying executable content`);
  if (emitted.length === 0) {
    console.error('zero-runtime: FAILED — nothing was emitted, so nothing was audited');
    process.exit(1);
  }
  for (const file of executable) console.error(`  executable content: ${relative(out, file)}`);
  process.exit(executable.length === 0 ? 0 : 1);
} finally {
  rmSync(out, { recursive: true, force: true });
}
