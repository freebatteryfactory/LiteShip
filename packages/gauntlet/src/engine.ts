/**
 * The engine — compose gates into a run.
 *
 * `runGates` verifies each gate against its fixtures (the authority ratchet),
 * runs the qualified gates over the real context, and applies each gate's
 * EARNED authority to its findings: a self-proven gate's `error` findings can
 * block; an unproven gate's findings are capped to `advisory` (they surface but
 * never fail the run). The result carries the findings, the per-gate proofs
 * (the receipts), and the single blocking verdict.
 *
 * This is the metacircular core: the gauntlet's own gates are just gates, run
 * through this same path, qualified by this same ratchet.
 *
 * @module
 */

import type { GateContext, Gate } from './gate.js';
import type { Finding, Severity } from './finding.js';
import { verifyGate, earnedAuthority, type Authority, type GateProof } from './authority.js';

/** A gate's outcome within a run: its proof, earned authority, and findings. */
export interface GateOutcome {
  readonly gateId: string;
  readonly proof: GateProof;
  readonly authority: Authority;
  readonly findings: readonly Finding[];
}

/** The result of a gauntlet run. */
export interface GauntletResult {
  /** All findings across all gates, with authority already applied to severity. */
  readonly findings: readonly Finding[];
  /** Per-gate outcomes (proofs = the qualification receipts). */
  readonly outcomes: readonly GateOutcome[];
  /** True iff any self-proven (blocking) gate emitted an `error` finding. */
  readonly blocked: boolean;
}

/** Cap a finding's severity to `advisory` (for gates that have not self-proven). */
function asAdvisory(f: Finding): Finding {
  return f.severity === 'advisory' ? f : { ...f, severity: 'advisory' };
}

/**
 * Run a set of gates over `context`. Each gate is first verified against its own
 * fixtures; unproven gates run but are demoted to advisory. Returns the merged
 * findings, the proofs, and whether a blocking gate failed.
 */
export function runGates(gates: readonly Gate[], context: GateContext): GauntletResult {
  const outcomes: GateOutcome[] = [];
  const allFindings: Finding[] = [];
  let blocked = false;

  for (const gate of gates) {
    const proof = verifyGate(gate);
    const authority = earnedAuthority(proof);
    const raw = gate.run(context);
    const findings = authority === 'blocking' ? raw : raw.map(asAdvisory);
    for (const f of findings) {
      allFindings.push(f);
      if (authority === 'blocking' && f.severity === 'error') blocked = true;
    }
    outcomes.push({ gateId: gate.id, proof, authority, findings });
  }

  return { findings: allFindings, outcomes, blocked };
}

/**
 * An in-memory {@link GateContext} over a `path → text` map — the substrate for
 * fixtures and tests. A gate written against {@link GateContext} runs against
 * this identically to the real repo, so red/green fixtures need no filesystem.
 */
export function memoryContext(files: Readonly<Record<string, string>>, repoRoot = '/virtual'): GateContext {
  const map = new Map(Object.entries(files));
  return {
    repoRoot,
    readFile: (relativePath: string): string | undefined => map.get(relativePath),
    files: (): readonly string[] => [...map.keys()],
  };
}

/** Severity rollup helper re-exported for report headers. */
export type { Severity };
