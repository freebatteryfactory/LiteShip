/**
 * THE CAPABILITY-GATE — the capability-link dataflow proof (codex round-8 #1b) run OVER THE REAL REPO.
 *
 * Sibling of {@link file://./standards-integrity-gate.ts} and `plumb:gate`: the sanctioned-skip
 * INTEGRITY family. The `capabilityGateLinkGate` fold is exercised in unit tests with INJECTED facts
 * (`tests/unit/gauntlet/capability-gate-link.test.ts`) — that proves the fold; but a gate nothing runs
 * over the real repo is a hole. This script closes it: it builds the SAME {@link CapabilityLinkFacts}
 * the production `liteship check --ir --capability-gate` path builds (the host oracle resolves each
 * sanctioned skip's guard against the canonical capability symbol table via a `ts.Program`/checker and
 * proves it DERIVES FROM its declared capability's probe) and reds on any skip whose guard does not.
 *
 * Why a standalone phase (not folded into `gauntlet:full`'s `liteship check --ir`): the avionics IR gates
 * (taint/mutate/…) are opt-in and NOT CI-wired, but the capability-gate belongs to the sanctioned-skip
 * integrity family (`standards:gate` / `plumb:gate`) that IS CI-gating — so it runs HERE, next to them,
 * as its own ~ts.Program phase, without dragging the whole `--ir` avionics surface into CI.
 *
 * FAIL-CLOSED: an UNRESOLVED sanctioned site (allowlist drift — the skip text no longer locates) is a
 * failing result, never a silent drop, so the gate proves the WHOLE allowlist or reds.
 *
 * @module
 */

import { repoRoot } from '../vitest.shared.js';
import { buildCapabilityLinkFacts, type CapabilityLinkFacts } from '../packages/audit/src/index.js';
import {
  LITESHIP_CAPABILITY_MODULES,
  LITESHIP_CAPABILITY_IDS,
  resolveCapabilitySites,
} from '../packages/cli/src/lib/capability-policy.js';
import { isDirectExecution } from './audit/shared.js';

/** Build the capability-link facts over `root` through the production policy (modules + ids + sites). */
export function runCapabilityGate(root = repoRoot): CapabilityLinkFacts {
  return buildCapabilityLinkFacts({
    repoRoot: root,
    capabilityModules: LITESHIP_CAPABILITY_MODULES,
    capabilityIds: LITESHIP_CAPABILITY_IDS,
    sites: resolveCapabilitySites(root),
  });
}

export function main(root = repoRoot): void {
  const facts = runCapabilityGate(root);
  const unlinked = facts.results.filter((r) => !r.linked);
  console.log(
    `capability-gate: proved ${facts.results.length} sanctioned skip(s) against the canonical capability symbol table (${facts.definedCapabilities.length} capabilities defined).`,
  );
  if (unlinked.length > 0) {
    for (const r of unlinked) {
      const derived = r.linkedCapabilities.length > 0 ? `{${r.linkedCapabilities.join(', ')}}` : 'no capability probe';
      console.error(`  FAIL ${r.file}:${r.line} [${r.declaredCapability}] guard="${r.guardText}" → ${derived}`);
    }
    throw new Error(
      `Capability-gate failed — ${unlinked.length} sanctioned skip(s) whose guard does NOT derive from its declared capability's probe (an unrelated / mislabeled / reimplemented guard, or an unresolved allowlist entry). Route each guard through the canonical capability export (the camelCase of its capability id) in tests/helpers/capabilities*.ts / ffmpeg.ts.`,
    );
  }
  console.log('Capability-gate passed — every sanctioned skip is gated by its declared capability.');
}

if (isDirectExecution(import.meta.url)) {
  main();
}
