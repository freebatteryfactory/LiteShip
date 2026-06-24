/**
 * Self-proof of the Slice C CRDT-law-coverage gate (`crdt-laws.ts`, L4).
 *
 * The gate is the META-CHECK that the formal CRDT / linearizability laws (HLC +
 * GraphPatch) are PINNED by deterministic property tests — the coverage rail for
 * the causal/CRDT trust spine. This suite proves:
 *   • the gate PASSES the real repo (the two law files this wave shipped exist +
 *     pin every required law marker);
 *   • a repo missing a law family, or pinning only SOME laws, is FLAGGED at L4;
 *   • the authority ratchet: red caught / green clean / mutation killed (the
 *     presence-only mutant — which cannot tell an incomplete law file from a
 *     complete one — is killed by the present-but-incomplete red fixture).
 *
 * The gate is NOT yet wired into @czap/gauntlet's barrel / LITESHIP_IR_GATES — the
 * integrator wires that (this wave builds in NEW files only, like the B3.3
 * symbol-orphan gate). So the gate is imported via its src path (the established
 * "src-path import = no public surface until wired" pattern) and fully self-proven
 * here before the ~3-line wire-in.
 *
 * @module
 */
// PROVES: INV-CRDT-LAWS-PINNED
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crdtLawsGate } from '../../packages/gauntlet/src/gates/crdt-laws.js';
import { verifyGate, type GateContext } from '@czap/gauntlet';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** A real-repo GateContext that reads through the filesystem (the gate folds the file map). */
function repoContext(): GateContext {
  return {
    repoRoot: REPO_ROOT,
    readFile: (relativePath: string): string | undefined => {
      try {
        return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
      } catch {
        // The gate's whole job is to report a MISSING law file; a read miss IS the signal,
        // surfaced as `undefined` (the gate emits a finding) — never swallowed silently.
        return undefined;
      }
    },
    files: (): readonly string[] => [],
  };
}

describe('crdtLawsGate — L4 CRDT/linearizability law-coverage gate', () => {
  it('PASSES the real repo: both CRDT law families are present and every law is pinned', () => {
    const findings = crdtLawsGate.run(repoContext());
    // The two law files this wave shipped pin every required marker → zero findings.
    expect(findings).toEqual([]);
  });

  it('is L4 and namespaces its findings under the stable rule id', () => {
    expect(crdtLawsGate.level).toBe('L4');
    expect(crdtLawsGate.id).toBe('gauntlet/crdt-laws-pinned');
  });

  it('FLAGS a repo whose law file pins only SOME of the required laws (the red fixture world)', () => {
    const findings = crdtLawsGate.run(crdtLawsGate.fixtures.red.context);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    for (const f of findings) {
      expect(f.severity).toBe('error');
      expect(f.level).toBe('L4');
      expect(f.ruleId).toBe('gauntlet/crdt-laws-pinned');
    }
  });

  it('passes its OWN green fixture clean (no false positive on a fully-pinned repo)', () => {
    expect(crdtLawsGate.run(crdtLawsGate.fixtures.green.context)).toEqual([]);
  });

  it('is fully self-proven by its red/green/mutation fixtures (the authority ratchet)', () => {
    const proof = verifyGate(crdtLawsGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });
});
