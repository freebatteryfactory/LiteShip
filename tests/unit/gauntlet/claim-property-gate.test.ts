/**
 * The claim-property gate (Slice C, the claim-vs-reality tier — the family BEYOND
 * perf) — the gate that catches a SEMANTIC PROPERTY claim shipped in published source
 * with NO MEASURABLE confirmer. PRECISE about the Rice cut: a NAME-based claim
 * (`deterministicFold`, `canonicalize`) without a confirmer and a PURITY CONTRADICTION
 * (an in-declaration ambient read under a `pure` claim) are HARD (`error`, blocking); a
 * DECLARATION-LEADING DOC claim without a confirmer is ADVISORY (Rice: a prose claim's
 * confirmer is undecidable); FREE-FLOATING prose (a comment leading no declaration) is
 * NOT a finding at all. These tests pin:
 * (1) it self-proves via the authority ratchet (red caught / green clean / mutation
 * killed); (2) each of the THREE confirmers fires on its own missing-evidence case and
 * stays clean when confirmed; (3) the PURITY confirmer is DECLARATION-SCOPED — a `pure`
 * doc above one symbol is NOT contradicted by the sanctioned, waived ambient read in a
 * SIBLING declaration (the `clock.ts` false positive a blocking gate must never ship);
 * (4) the use-vs-mention precision anchors hold (backtick / quote / string-literal
 * mentions never fire) AND the hard-vs-advisory cut holds (name HARD, prose advisory,
 * free-floating prose dropped, ambiguous `canonical<Noun>` not hard-flagged); and
 * (5) THE HONEST PRODUCTION COUNT — run the gate EXACTLY as `check --ir` does
 * (production scope + the engine's L3 level-scoping): ZERO HARD findings, with the
 * genuine ADVISORY work-list surfaced and pinned (not a masked 0).
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import {
  verifyGate,
  runGates,
  memoryContext,
  nodeContext,
  scopeContextByLevel,
  LITESHIP_ASSURANCE_MAP,
} from '@czap/gauntlet';
import { claimPropertyGate, CLAIM_PROPERTY_RULE_ID } from '../../../packages/gauntlet/src/gates/claim-property.js';

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

  it('the red fixture catches all THREE claim kinds (one finding each, all HARD)', () => {
    const findings = claimPropertyGate.run(claimPropertyGate.fixtures.red.context);
    const titles = findings.map((f) => f.title).sort();
    expect(titles).toEqual([
      'Content-addressing claim with no confirmer',
      'Determinism claim with no confirmer',
      'Purity claim contradicted by ambient entropy',
    ]);
    // The red fixture's three claims are NAME-based (deterministicFold / canonicalize)
    // or a purity contradiction — every one is HARD (`error`), so the gate that earns
    // blocking authority blocks on them. (Doc-only advisory claims never appear here.)
    expect(findings.every((f) => f.severity === 'error')).toBe(true);
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
        'packages/widget/src/p.ts':
          '/** A pure projection. */\nexport function project(): number {\n  return Date.now();\n}\n',
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toBe('Purity claim contradicted by ambient entropy');
    expect(findings[0]?.severity).toBe('error'); // a contradiction is HARD regardless of origin
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

  it("DECLARATION-SCOPED — a `pure` doc is NOT contradicted by a SIBLING declaration's ambient read", () => {
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
      memoryContext({
        'packages/widget/src/canon.ts': 'export function canonicalize(x: number): number { return x; }\n',
      }),
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
      memoryContext({
        'tests/widget/canonicalize.ts': 'export function canonicalize(x: number): number { return x; }\n',
      }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe('PRECISION — the hard-vs-advisory Rice cut (name/contradiction HARD, prose ADVISORY or DROPPED)', () => {
  it('DROPS free-floating prose — a claim word in a comment that leads NO declaration is NOT a finding', () => {
    // A module header / explanatory aside mentioning the vocabulary, not bound to any
    // symbol — unprovable which symbol it claims, so NOT a finding at any severity. This
    // is the exact shape that flagged the gate's OWN vocabulary documentation (1000+
    // false positives); it must produce nothing.
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/header.ts':
          '/**\n * This module is about determinism and content-addressing in the abstract.\n * It explains the canonical, deterministic ideas the package documents.\n */\n\nconst unrelated = 1;\nexport { unrelated };\n',
      }),
    );
    expect(findings).toHaveLength(0);
  });

  it('a DECLARATION-LEADING doc determinism claim with no confirmer is ADVISORY, not HARD', () => {
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/w.ts':
          '/** A deterministic fold over the inputs. */\nexport function combine(a: number, b: number): number {\n  return a + b;\n}\n',
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('advisory');
    expect(findings[0]?.title).toContain('advisory — undecidable');
    // It is attributed to the SPECIFIC declared symbol the doc leads (not free prose).
    expect(findings[0]?.detail).toContain('`combine`');
  });

  it('a NAME-based content-address claim (a producer verb) with no confirmer is HARD', () => {
    const findings = claimPropertyGate.run(
      memoryContext({ 'packages/widget/src/c.ts': 'export function canonicalize(x: number): number { return x; }\n' }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('error');
  });

  it('does NOT hard-flag an AMBIGUOUS `canonical<Noun>` name (the ordinary adjective, not a producer)', () => {
    // `canonicalBytes`, `canonicalHead`, `canonicalRule` use `canonical` as "the
    // standard/normalized one" — an ambiguous name cannot earn a BLOCKING verdict. No
    // doc claim ⟹ no advisory either; the bare-adjective name alone is NOT a finding.
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/n.ts':
          'export function build(): number {\n  const canonicalBytes = 1;\n  const canonicalHead = 2;\n  return canonicalBytes + canonicalHead;\n}\n',
      }),
    );
    expect(findings).toHaveLength(0);
  });

  it('a NAME claim + its leading DOC of the SAME kind is ONE finding (deduped per declaration)', () => {
    // `/** A pure projection. */ function pureProject` claims purity by NAME and by DOC.
    // That is one claim about one symbol — emit it once (and, with the Date.now read,
    // as the HARD contradiction).
    const findings = claimPropertyGate.run(
      memoryContext({
        'packages/widget/src/p.ts':
          '/** A pure projection. */\nexport function pureProject(): number {\n  return Date.now();\n}\n',
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toBe('Purity claim contradicted by ambient entropy');
  });
});

describe('THE REAL REPO — the HONEST production count (test runs the gate EXACTLY as `check --ir` does)', () => {
  // The production scope: DEFAULT_GAUNTLET_GLOBS — published source ONLY for the JUDGED
  // surface; the confirmer corpus (the test tree) is unioned into the UNSCOPED
  // `allFiles()` by nodeContext (CONFIRMER_CORPUS_GLOBS), never into the judged `files()`.
  // The gate is then run through the SAME level-scoping the engine applies on `check --ir`
  // (`scopeContextByLevel` at the gate's L3, with the committed assurance map). This is NOT
  // a narrow re-glob that masks production — it IS the exact production composition.
  const GLOBS = ['packages/*/src/**/*.ts'];
  const productionScoped = () =>
    scopeContextByLevel(nodeContext(REPO_ROOT, GLOBS), claimPropertyGate.level, LITESHIP_ASSURANCE_MAP);

  // The HONEST production reality after tuning: ZERO HARD (blocking) findings — no
  // NAME-based determinism/content-address claim and no purity contradiction is
  // unconfirmed — and exactly ONE genuine ADVISORY: the `CapsuleDef` leading-doc
  // "content-addressed id" claim in core/assembly.ts, which no round-trip test
  // references BY NAME/MODULE. Advisory ⟹ non-blocking (Rice: a prose claim's confirmer
  // is undecidable), so it is a calibration work-item for the owner, never a red gate.
  // This is a REAL count, not a masked 0: if a hard claim regresses (a new
  // `canonicalize` without a round-trip test), this test fails LOUD with the file:line.
  const EXPECTED_ADVISORY: readonly string[] = [
    'packages/core/src/assembly.ts:16 — Content-addressing claim with no confirmer (advisory — undecidable)',
  ];

  it('emits ZERO HARD (blocking) claim findings across the real production surface', () => {
    const ctx = productionScoped();
    // Sanity: the JUDGED surface matched real source (a zero-file context would be a
    // hollow pass) AND the confirmer corpus is populated (the honesty-bug guard).
    expect(ctx.files().length).toBeGreaterThan(0);
    expect(ctx.allFiles?.().some((f) => /(?:^|\/)tests\//.test(f))).toBe(true);

    const findings = claimPropertyGate.run(ctx);
    const hard = findings.filter((f) => f.severity === 'error');
    const listed = hard.map((f) => `${f.location?.file}:${f.location?.line} — ${f.title}`).sort();
    const message = [
      `claim-without-confirmer found ${hard.length} HARD (blocking) unconfirmed claim(s) — the blocking floor is ZERO.`,
      'Each is a NAME-based determinism/content-address claim with no test, or a purity contradiction:',
      ...listed.map((s) => `  + ${s}`),
    ].join('\n');
    expect(listed, message).toEqual([]);
  });

  it('surfaces the genuine ADVISORY work-list (the honest, non-zero, NON-blocking count)', () => {
    const findings = claimPropertyGate.run(productionScoped());
    const advisory = findings
      .filter((f) => f.severity === 'advisory')
      .map((f) => `${f.location?.file}:${f.location?.line} — ${f.title}`)
      .sort();
    // The advisory work-list is honest and PINNED: it is exactly the genuine
    // declaration-leading prose claims that lack a name/module-matched confirmer. A
    // change here is a real signal (a new prose claim, or one that just got tested) — not
    // a silent drift. None of these block (`check --ir` stays green on them).
    expect(advisory).toEqual([...EXPECTED_ADVISORY]);
  });

  it('is a DETERMINISTIC fold — same repo state, same findings twice', () => {
    const run = (): readonly string[] =>
      claimPropertyGate.run(productionScoped()).map((f) => `${f.location?.file}:${f.location?.line}:${f.severity}`);
    expect(run()).toEqual(run());
  });
});
