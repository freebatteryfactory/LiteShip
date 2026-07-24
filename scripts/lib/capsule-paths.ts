/**
 * Generated-artifact path resolution for the capsule factory compiler.
 *
 * `capsule:compile` WRITES generated test/bench files into this directory.
 * Default `tests/generated` (production / gauntlet unchanged); override with
 * `LITESHIP_CAPSULE_GENERATED_DIR` so parallel tests can redirect their compile
 * output to a per-test temp dir (CUT T1). This is the generated-dir twin of
 * `LITESHIP_CAPSULE_MANIFEST` / `getCapsuleManifestPath` — together they let a
 * test-spawned `capsule:compile` touch neither shared write target, so it
 * can't race other workers (or the parent vitest run that is concurrently
 * executing the committed `tests/generated/*` files) on a `renameSync`.
 *
 * @module
 */
import { resolve } from 'node:path';

const DEFAULT_GENERATED_DIR_RELATIVE = 'tests/generated';

/** Resolve the generated test/bench output dir, honoring `LITESHIP_CAPSULE_GENERATED_DIR`. */
export function getCapsuleGeneratedDir(cwd: string = process.cwd()): string {
  const raw = process.env.LITESHIP_CAPSULE_GENERATED_DIR?.trim();
  if (!raw) return resolve(cwd, DEFAULT_GENERATED_DIR_RELATIVE);
  return resolve(cwd, raw);
}
