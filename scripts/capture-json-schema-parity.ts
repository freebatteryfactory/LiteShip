#!/usr/bin/env tsx
/**
 * capture-json-schema-parity — freeze the byte-parity cage over the CURRENT
 * Effect-AST JSON-Schema deriver (packages/core/src/json-schema-from-schema.ts)
 * BEFORE any schema producer changes.
 *
 * WHAT IS CAGED: every command descriptor slot whose JSON-Schema is derived via
 * `schemaToJsonSchema` — the 13 command files' call sites, which surface as the
 * handler-backed descriptors' `inputSchema` / `outputSchema`. Those fields ARE
 * the deriver's output (computed at module load), so enumerating the registry
 * captures exactly "run each schema through the current Effect deriver". The
 * cli-orchestration descriptors carry hand-authored `inputSchema` literals (no
 * derivation, no `outputSchema`) and are OUT of the cage. No capsule contract
 * derives JSON-Schema in the current tree — `schemaToJsonSchema` has no other
 * production caller — so the command descriptors are the whole cage.
 *
 * DETERMINISM (a re-run MUST be byte-identical): the descriptor schemas are
 * static; {@link stableSerialize} is recursively key-sorted (object-key order is
 * canonicalized away, array order — `required` / `enum` — is preserved as it is
 * semantic); the map keys are emitted in sorted order. The value at each key is
 * the stableSerialize string of that slot's derived schema — the canonical bytes
 * the Wave-1 as-const rewrite must reproduce.
 *
 * RESOLUTION: run from the repo root via tsx. `@czap/command` and `@czap/gauntlet`
 * are not root workspace deps, so they are imported by RELATIVE source path (the
 * scripts/capsule-compile.ts idiom); their transitive `@czap/*` bare imports
 * resolve to source through the built dist or a tsconfig-paths mapping.
 *
 * @module
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { commandRegistry } from '../packages/command/src/catalog.js';
import { stableSerialize } from '../packages/gauntlet/src/verdict-cache.js';

/** Repo-root-relative path of the committed parity fixture. */
export const FIXTURE_RELATIVE_PATH = 'tests/fixtures/json-schema-parity/effect-derived.json';

/** The two derived slots a handler descriptor carries. */
type DerivedSlot = 'inputSchema' | 'outputSchema';

/**
 * The stable identifier for one derived slot: `<command name>#<slot>`. Stable
 * across the as-const migration (the command name and slot never change), so the
 * fixture keys survive the producer rewrite the cage guards.
 */
function slotId(name: string, slot: DerivedSlot): string {
  return `${name}#${slot}`;
}

/**
 * The keyed parity map: every handler-backed descriptor's derived
 * `inputSchema` (+ `outputSchema` when present), stableSerialized, keyed by
 * {@link slotId}. Handler-backed descriptors are EXACTLY the schemaToJsonSchema
 * call sites; cli-orchestration descriptors are excluded (hand-authored, not
 * derived).
 */
export function buildParityMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const descriptor of commandRegistry.list()) {
    if (descriptor.executionKind !== 'handler') continue;
    map[slotId(descriptor.name, 'inputSchema')] = stableSerialize(descriptor.inputSchema);
    if (descriptor.outputSchema !== undefined) {
      map[slotId(descriptor.name, 'outputSchema')] = stableSerialize(descriptor.outputSchema);
    }
  }
  return map;
}

/**
 * The exact fixture bytes: the parity map with keys in sorted order, 2-space
 * JSON, trailing newline. Byte-identical on every re-run.
 */
export function buildParityFixtureContent(): string {
  const map = buildParityMap();
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

/** Write the committed fixture. Only runs on direct invocation (never on import). */
function main(): void {
  const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const target = resolve(repoRoot, FIXTURE_RELATIVE_PATH);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buildParityFixtureContent());
  process.stdout.write(`captured ${Object.keys(buildParityMap()).length} slots -> ${FIXTURE_RELATIVE_PATH}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
