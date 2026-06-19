/**
 * Plumb-completeness gate — the gate the gauntlet never had.
 *
 * Fails when:
 *  - the unwired-capsule inventory DRIFTS from `PLUMB_FLOOR` (a NEW unwired
 *    capsule appears, or a floor entry got wired and the floor wasn't shrunk), or
 *  - a published package is missing a `PACKAGE_PLUMB` classification.
 *
 * Per-primitive plumb-truth (a module wired into the live cast path) is proven
 * by each primitive's end-to-end acceptance test, NOT by a noisy reachability
 * heuristic — see scripts/plumb-registry.ts for why.
 *
 * @module
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from '../vitest.shared.js';
import { isDirectExecution } from './audit/shared.js';
import { PACKAGE_PLUMB, PLUMB_FLOOR } from './plumb-registry.js';

export interface PlumbGateResult {
  readonly ok: boolean;
  /** Inventory entries present now but NOT in PLUMB_FLOOR — new unwired capsules. */
  readonly added: readonly string[];
  /** PLUMB_FLOOR entries no longer present — wired (or renamed); shrink the floor. */
  readonly removed: readonly string[];
  /** Published packages with no PACKAGE_PLUMB classification. */
  readonly unclassified: readonly string[];
  readonly inventorySize: number;
}

function collectInventory(root: string): { inventory: string[]; manifestPresent: boolean } {
  const inventory: string[] = [];
  const manifestPath = resolve(root, 'reports', 'capsule-manifest.json');
  const manifestPresent = existsSync(manifestPath);
  if (manifestPresent) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      capsules?: readonly { name: string; wired?: boolean }[];
    };
    for (const capsule of manifest.capsules ?? []) {
      if (capsule.wired === false) inventory.push(`capsule:${capsule.name}`);
    }
  }
  return { inventory: inventory.sort(), manifestPresent };
}

function publishedPackages(root: string): string[] {
  const names: string[] = [];
  const dir = resolve(root, 'packages');
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = resolve(dir, entry.name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string; private?: boolean };
    if (pkg.name && !pkg.private) names.push(pkg.name);
  }
  return names.sort();
}

export function runPlumbGate(root = repoRoot): PlumbGateResult {
  const { inventory, manifestPresent } = collectInventory(root);
  const floor = new Set(PLUMB_FLOOR);
  const present = new Set(inventory);
  const added = inventory.filter((entry) => !floor.has(entry));
  // The floor is capsule-only and only checkable once `capsule:compile` has
  // written the manifest (it runs as an early gauntlet phase). Under a bare
  // `pnpm test` (the smoke jobs) the manifest is absent, so we cannot tell a
  // wired capsule from an absent manifest — skip the `removed` diff rather than
  // report a false drift. The gauntlet's plumb:gate phase has the fresh manifest.
  const removed = manifestPresent ? PLUMB_FLOOR.filter((entry) => !present.has(entry)).sort() : [];
  const unclassified = publishedPackages(root).filter((name) => !(name in PACKAGE_PLUMB));
  return {
    ok: added.length === 0 && removed.length === 0 && unclassified.length === 0,
    added,
    removed,
    unclassified,
    inventorySize: inventory.length,
  };
}

function main(): void {
  const result = runPlumbGate();
  if (!result.ok) {
    if (result.added.length > 0) {
      process.stderr.write(
        'PLUMB GATE FAILED — NEW unwired capsule(s) (wire the binding, or — if genuinely ' +
          'intentional — add to PLUMB_FLOOR in scripts/plumb-registry.ts):\n',
      );
      for (const entry of result.added) process.stderr.write(`  + ${entry}\n`);
    }
    if (result.removed.length > 0) {
      process.stderr.write(
        'PLUMB GATE — these PLUMB_FLOOR entries are gone (wired/renamed). Remove them from the floor:\n',
      );
      for (const entry of result.removed) process.stderr.write(`  - ${entry}\n`);
    }
    if (result.unclassified.length > 0) {
      process.stderr.write(
        'PLUMB GATE FAILED — published packages missing a PACKAGE_PLUMB classification ' +
          '(runtime | tooling | deferred):\n',
      );
      for (const name of result.unclassified) process.stderr.write(`  ? ${name}\n`);
    }
    process.stderr.write(
      JSON.stringify({
        status: 'failed',
        command: 'plumb-gate',
        added: result.added.length,
        removed: result.removed.length,
        unclassified: result.unclassified.length,
        inventorySize: result.inventorySize,
        timestamp: new Date().toISOString(),
      }) + '\n',
    );
    process.exit(1);
  }
  process.stdout.write(
    JSON.stringify({
      status: 'ok',
      command: 'plumb-gate',
      inventorySize: result.inventorySize,
      timestamp: new Date().toISOString(),
    }) + '\n',
  );
}

if (isDirectExecution(import.meta.url)) {
  main();
}
