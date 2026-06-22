/**
 * The claim-property gate (Slice C, the claim-vs-reality tier — the family BEYOND
 * perf) — the gate that catches a SEMANTIC PROPERTY claim shipped in published source
 * with NO MEASURABLE confirmer: `deterministic` (no determinism/DST/property test),
 * `pure` (an ambient-entropy read inside the documented declaration), or
 * `content-addressed`/`canonical` (no round-trip identity test). These tests pin:
 * (1) it self-proves via the authority ratchet (red caught / green clean / mutation
 * killed); (2) each of the THREE confirmers fires on its own missing-evidence case and
 * stays clean when confirmed; (3) the PURITY confirmer is DECLARATION-SCOPED — a `pure`
 * doc above one symbol is NOT contradicted by the sanctioned, waived ambient read in a
 * SIBLING declaration (the `clock.ts` false positive a blocking gate must never ship);
 * (4) the use-vs-mention precision anchors hold (backtick / quote / string-literal
 * mentions never fire); and (5) THE REAL REPO IS GREEN — every semantic claim is
 * confirmed (the genuine green, like perf-claim's 39→0).
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { verifyGate, runGates, memoryContext, nodeContext } from '@czap/gauntlet';
import {
  claimPropertyGate,
  CLAIM_PROPERTY_RULE_ID,
} from '../../../packages/gauntlet/src/gates/claim-property.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');

describe('claim-property gate — self-proof (the authority ratchet)', () => {
  it('self-proves: red caught, green clean, mutation killed, blocking-eligible', () => {
    const proof = verifyGate(claimPropertyGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });

  it('is an L3 gate with the reserved rule id', () => {
    expect(claimPropertyGate.level).toBe('L3');
    expect(claimPropertyGate.id).toBe(CLAIM_PROPERTY_RULE_ID);
  });

  it('earns BLOCKING authority through the engine (self-proven → its errors block)', () => {
    const result = runGates([claimPropertyGate], claimPropertyGate.fixtures.green.context);
    const outcome = result.outcomes.find((o) => o.gateId === CLAIM_PROPERTY_RULE_ID);
    expect(outcome?.authority).toBe('blocking');
    expect(result.blocked).toBe(false); // green fixture → blocking gate, no errors
  });

  it('the red fixture catches all THREE claim kinds (one finding each)', () => {
    const findings = claimPropertyGate.run(claimPropertyGate.fixtures.red.context);
    const titles = findings.map((f) => f.title).sort();
    expect(titles).toEqual([
      'Content-addressing claim with no confirmer',
      'Determinism claim with no confirmer',
      'Purity claim contradicted by ambient entropy with no confirmer',
    ]);
  });
});

describe('THE CLAIM-VS-REALITY LAW — DETERMINISM confirmer (a determinism/DST/property test)', () => {
  it('CATCHES a `deterministicFold` symbol with NO determinism test naming it', () => {
    const findings = claimPropertyGate.run(
      memoryContext({ 'packages/widget/src/fold.ts': 'export function deterministicFold(): number { return 1; }\n' }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toBe('Determinism claim with no confirmer');
    expect(findings[0]?.severity).toBe('error');
  });

  it('STAYS CLEAN when a determinism/property test names the claiming symbol', () => {
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/fold.ts': 'export function deterministicFold(): number { return 1; }\n',
        'tests/unit/widget/fold.prop.test.ts':
          "import { it } from 'vitest';\nit('deterministicFold replays byte-identical', () => {});\n",
      }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe('THE CLAIM-VS-REALITY LAW — PURITY confirmer (an in-declaration ambient-entropy check)', () => {
  it('CATCHES a `pure` doc whose OWN declaration reads ambient entropy (the contradiction)', () => {
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/p.ts': '/** A pure projection. */\nexport function project(): number {\n  return Date.now();\n}\n',
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toBe('Purity claim contradicted by ambient entropy with no confirmer');
    // The finding points at the CONTRADICTION line (the ambient read), not the doc.
    expect(findings[0]?.location?.line).toBe(3);
  });

  it('STAYS CLEAN when the documented declaration is genuinely pure (injected clock)', () => {
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/p.ts':
          '/** A pure projection. */\nexport function project(clock: { now(): number }): number {\n  return clock.now();\n}\n',
      }),
    );
    expect(findings).toHaveLength(0);
  });

  it('DECLARATION-SCOPED — a `pure` doc is NOT contradicted by a SIBLING declaration\'s ambient read', () => {
    // The clock.ts shape: a `pure` doc above `fixedClock` (genuinely pure) and a
    // sibling `systemClock` whose `Date.now()` is the SANCTIONED, no-nondeterminism-
    // WAIVED entropy boundary. A file-level purity check would falsely red this; the
    // declaration-scoped check must NOT — blocking a correct waived boundary is the
    // exact false positive a hard gate cannot ship.
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/clock.ts':
          'export const systemClock = {\n  now: (): number => Date.now(),\n};\n' +
          '/** Pure: the same `ms` always yields the same readings. */\n' +
          'export const fixedClock = (ms: number) => ({ now: (): number => ms });\n',
      }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe('THE CLAIM-VS-REALITY LAW — CONTENT-ADDRESS confirmer (a round-trip identity test)', () => {
  it('CATCHES a `canonicalize` symbol with NO content-address round-trip test naming it', () => {
    const findings = claimPropertyGate.run(
      memoryContext({ 'packages/widget/src/canon.ts': 'export function canonicalize(x: number): number { return x; }\n' }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toBe('Content-addressing claim with no confirmer');
  });

  it('STAYS CLEAN when a round-trip test through the content-address kernel names it', () => {
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/canon.ts': 'export function canonicalize(x: number): number { return x; }\n',
        'tests/unit/widget/canon.test.ts':
          "import { it } from 'vitest';\nimport { addressedDigestOf } from '@czap/canonical';\nit('canonicalize round-trips: equal value, equal address', () => { void addressedDigestOf; });\n",
      }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe('PRECISION — mention-form keywords never fire (no dirty green floor)', () => {
  it('does NOT flag a claim keyword inside a STRING literal (a vocabulary list)', () => {
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/vocab.ts': "export const KINDS = ['deterministic', 'pure', 'canonical'];\n",
      }),
    );
    expect(findings).toHaveLength(0);
  });

  it('does NOT flag a claim keyword inside a BACKTICK / QUOTE span in a comment (a mention)', () => {
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/doc.ts':
          '// the `deterministic` kind and the "content-addressed" term it enumerates\nexport const y = 1;\n',
      }),
    );
    expect(findings).toHaveLength(0);
  });

  it('only scans PUBLISHED src — a semantic claim in a test file is out of scope', () => {
    const findings = claimPropertyGate.run(
      memoryContext({ 'tests/widget/canonicalize.ts': 'export function canonicalize(x: number): number { return x; }\n' }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe('THE REAL REPO IS GREEN — every semantic claim in packages/*/src is confirmed', () => {
  const GLOBS = ['packages/*/src/**/*.ts', 'tests/**/*.ts'];

  it('finds ZERO unconfirmed semantic claims across the real published source tree', () => {
    const ctx = nodeContext(REPO_ROOT, GLOBS);
    // Sanity: the glob matched real source (a zero-file context would be a hollow pass).
    expect(ctx.files().length).toBeGreaterThan(0);

    const findings = claimPropertyGate.run(ctx);
    const listed = findings.map((f) => `${f.location?.file}:${f.location?.line} — ${f.title}`).sort();
    const message = [
      `claim-without-confirmer found ${findings.length} unconfirmed semantic claim(s) — the floor is ZERO.`,
      'Each is a deterministic/pure/content-addressed claim with no measurable confirmer — confirm it or soften the wording:',
      ...listed.map((s) => `  + ${s}`),
    ].join('\n');
    expect(listed, message).toEqual([]);
  });

  it('is a DETERMINISTIC fold — same repo state, same findings twice', () => {
    const run = (): readonly string[] =>
      claimPropertyGate.run(nodeContext(REPO_ROOT, GLOBS)).map((f) => `${f.location?.file}:${f.location?.line}`);
    expect(run()).toEqual(run());
  });
});
