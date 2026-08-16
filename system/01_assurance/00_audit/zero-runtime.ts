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
 * script outside every home and grew from there. The difference is
 * ownership: this is a repository program, repository programs live in
 * `system/`, and assurance acquisition lives in `00_audit`. If a second audit
 * appears, it belongs beside this one — not in a new top-level folder.
 *
 * It belongs to the separately checked system implementation population, not
 * the declaration-only specification population it audits.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const REPO = join(import.meta.dirname, '..', '..', '..');
const TSC = join(REPO, 'node_modules', 'typescript', 'bin', 'tsc');

/** The extension TypeScript emits for a module in this project. */
export const EMITTED_EXTENSION = '.js';

/**
 * Whether one emitted file carries anything that runs.
 *
 * The whole audit reduces to this predicate, so it is separable and tested
 * rather than buried in the loop that applies it. Whitespace is removed before
 * comparison because emit formatting is not the subject; `export {};` and
 * `export{};` are the same absence of behaviour.
 */
export const carriesExecutableContent = (text: string): boolean => text.replaceAll(/\s/gu, '') !== 'export{};';

export interface EmittedJavaScript {
  readonly path: string;
  readonly text: string;
}

export type ZeroRuntimeInspection =
  | { readonly kind: 'empty' }
  | { readonly kind: 'inspected'; readonly executable: readonly string[] };

/** Inspect one complete emitted population; zero subjects are never a clean result. */
export const inspectEmittedJavaScript = (
  emitted: readonly EmittedJavaScript[],
): ZeroRuntimeInspection =>
  emitted.length === 0
    ? { kind: 'empty' }
    : {
        kind: 'inspected',
        executable: emitted
          .filter((file) => carriesExecutableContent(file.text))
          .map((file) => file.path),
      };

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : join(dir, entry.name),
  );

// Only when run as a command. The predicate above is imported by the audit
// self-test, and importing a module must not emit a project as a side effect.
if (import.meta.main) {
  const out = mkdtempSync(join(tmpdir(), 'liteship-emit-'));
  try {
    execFileSync(
      process.execPath,
      [TSC, '-p', join(REPO, 'tsconfig.json'), '--noEmit', 'false', '--declaration', 'false', '--removeComments', '--outDir', out],
      { stdio: 'inherit', cwd: REPO },
    );

    const emitted = walk(out)
      .filter((file) => file.endsWith(EMITTED_EXTENSION))
      .map((path) => ({ path, text: readFileSync(path, 'utf8') }));
    const inspection = inspectEmittedJavaScript(emitted);

    if (inspection.kind === 'empty') {
      console.error('zero-runtime: FAILED — nothing was emitted, so nothing was audited');
      process.exit(1);
    }

    console.log(
      `zero-runtime: ${emitted.length} emitted, ${inspection.executable.length} carrying executable content`,
    );
    for (const file of inspection.executable) {
      console.error(`  executable content: ${relative(out, file)}`);
    }
    process.exit(inspection.executable.length === 0 ? 0 : 1);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}
