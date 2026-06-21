/**
 * Slice B (B3) — the symbol-orphan-divergence gate (the LanguageService ⊕
 * file-proxy cross-check).
 *
 * The gate folds the IR's `symbol-orphan`/symbol-evidenced facts (emitted by
 * `@czap/audit`'s LanguageService oracle) against the IR's file-proxy `refs`
 * reverse index, and reports a self-explaining divergence wherever the two
 * oracles disagree about whether an exported symbol is referenced across files.
 * This test proves:
 *   • AGREEMENT (both orphan, or both referenced) → 0 findings;
 *   • DISAGREEMENT → a divergence finding naming BOTH oracles + both coverage
 *     classes, at advisory severity (the cross-class retire-the-weak-graph signal);
 *   • the self-proof: red/green/mutation — `verifyGate` returns fully self-proven,
 *     and the mutant that ignores the symbol-evidenced facts is killed;
 *   • the head-probe LAW: the verdict is computed from the LIVE IR facts + refs,
 *     so flipping the symbol-evidenced fact flips the gate's conclusion.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
// The gate is NOT yet exported from @czap/gauntlet's barrel — the integrator wires
// that (this agent builds in NEW files only, touching no shared index). Import it
// via its src path (the established "src-path import = no public surface" pattern),
// so the self-contained gate + its proof are fully tested before the ~10-line wire-in.
import { symbolOrphanDivergenceGate } from '../../../packages/gauntlet/src/gates/symbol-orphan-divergence.js';
import {
  makeRepoIR,
  memoryContext,
  verifyGate,
  type GateContext,
  type RepoIR,
  type RefSite,
  type SymbolId,
} from '@czap/gauntlet';

const SYMBOL_ORACLE = 'ts-language-service';
const DECL = 'packages/x/src/decl.ts';
const CONSUMER = 'packages/x/src/consumer.ts';
const FILE_PROXY = 'file-proxy-only' as const;

/** Build an IR with one exported symbol whose two oracles' verdicts are set explicitly. */
function irFor(opts: {
  readonly name: string;
  readonly symbolEvidencedOrphan: boolean;
  readonly externalReferenceCount: number;
  /** Whether the file-proxy refs graph credits a cross-file reference. */
  readonly fileProxyReferenced: boolean;
}): RepoIR {
  const refs = new Map<SymbolId, readonly RefSite[]>();
  if (opts.fileProxyReferenced) {
    refs.set(`${DECL}#${opts.name}`, [{ fromFile: CONSUMER, coverageClass: FILE_PROXY }]);
  }
  return makeRepoIR({
    files: [
      { id: DECL, contentDigest: 'placeholder:no-content-address', packageName: '@czap/x' },
      { id: CONSUMER, contentDigest: 'placeholder:no-content-address', packageName: '@czap/x' },
    ],
    symbols: [
      { id: `${DECL}#${opts.name}`, name: opts.name, kind: 'const', file: DECL, location: { file: DECL, line: 1 } },
    ],
    refs,
    facts: [
      {
        file: DECL,
        line: 1,
        property: 'symbol-orphan',
        value: { name: opts.name, isOrphan: opts.symbolEvidencedOrphan, externalReferenceCount: opts.externalReferenceCount },
        oracleId: SYMBOL_ORACLE,
        coverageClass: 'symbol-evidenced',
      },
    ],
  });
}

function ctx(ir: RepoIR): GateContext {
  return { ...memoryContext({}), ir };
}

describe('symbolOrphanDivergenceGate — symbol-evidenced ⊕ file-proxy orphan cross-check', () => {
  it('emits NOTHING when both oracles AGREE the symbol is referenced', () => {
    const findings = symbolOrphanDivergenceGate.run(
      ctx(irFor({ name: 'used', symbolEvidencedOrphan: false, externalReferenceCount: 1, fileProxyReferenced: true })),
    );
    expect(findings).toHaveLength(0);
  });

  it('emits NOTHING when both oracles AGREE the symbol is an orphan', () => {
    const findings = symbolOrphanDivergenceGate.run(
      ctx(irFor({ name: 'lonely', symbolEvidencedOrphan: true, externalReferenceCount: 0, fileProxyReferenced: false })),
    );
    expect(findings).toHaveLength(0);
  });

  it('REPORTS a divergence when symbol-evidenced says orphan but file-proxy credits a reference', () => {
    const findings = symbolOrphanDivergenceGate.run(
      ctx(irFor({ name: 'widget', symbolEvidencedOrphan: true, externalReferenceCount: 0, fileProxyReferenced: true })),
    );
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    // Names BOTH oracles + both coverage classes (REPORT-not-DECIDE, self-explaining).
    expect(f.detail).toContain('ts-language-service');
    expect(f.detail).toContain('symbol-evidenced');
    expect(f.detail).toContain('file-proxy');
    // Cross-class pair → advisory (the retire-the-weak-graph signal), carried class = symbol-evidenced.
    expect(f.severity).toBe('advisory');
    expect(f.coverageClass).toBe('symbol-evidenced');
    expect(f.location).toEqual({ file: DECL, line: 1 });
  });

  it('REPORTS a divergence when symbol-evidenced resolves a reference the file-proxy graph missed', () => {
    const findings = symbolOrphanDivergenceGate.run(
      ctx(irFor({ name: 'hidden', symbolEvidencedOrphan: false, externalReferenceCount: 2, fileProxyReferenced: false })),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail).toContain('2 cross-file reference');
    expect(findings[0]?.severity).toBe('advisory');
  });

  it('is fully self-proven by its own red/green/mutation fixtures', () => {
    const proof = verifyGate(symbolOrphanDivergenceGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });

  it('the head-probe LAW — flipping ONLY the symbol-evidenced fact flips the verdict', () => {
    // Same file-proxy state (referenced); flip the symbol-evidenced orphan bit.
    // orphan=true vs file-proxy-referenced → divergence; orphan=false → agreement.
    const diverge = symbolOrphanDivergenceGate.run(
      ctx(irFor({ name: 's', symbolEvidencedOrphan: true, externalReferenceCount: 0, fileProxyReferenced: true })),
    );
    const agree = symbolOrphanDivergenceGate.run(
      ctx(irFor({ name: 's', symbolEvidencedOrphan: false, externalReferenceCount: 1, fileProxyReferenced: true })),
    );
    expect(diverge).toHaveLength(1);
    expect(agree).toHaveLength(0);
  });

  it('a divergence is reported IFF the two verdicts differ (property-based, computed from live facts)', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (symbolEvidencedOrphan, fileProxyReferenced) => {
        const findings = symbolOrphanDivergenceGate.run(
          ctx(
            irFor({
              name: 'p',
              symbolEvidencedOrphan,
              externalReferenceCount: symbolEvidencedOrphan ? 0 : 1,
              fileProxyReferenced,
            }),
          ),
        );
        // symbol-evidenced "referenced" = !orphan; disagreement ⟺ verdicts differ.
        const symbolEvidencedReferenced = !symbolEvidencedOrphan;
        const shouldDiverge = symbolEvidencedReferenced !== fileProxyReferenced;
        expect(findings).toHaveLength(shouldDiverge ? 1 : 0);
      }),
    );
  });
});

describe('symbol-orphan divergence — cross-module mirror drift-guard', () => {
  // The lean @czap/gauntlet gate HARDCODES the oracle id + property strings it folds
  // over ('ts-language-service' / 'symbol-orphan'), because it cannot import from
  // @czap/audit (that would invert the dep direction + pull `typescript` into the lean
  // engine — the same reason no-default-export-divergence mirrors 'ts-ast'). This pins
  // the canonical values the audit oracle EMITS against those mirrors: if the oracle
  // ever renames them, this fails LOUD, flagging that the gate's mirror must move in
  // lockstep (the head-probe LAW: the cross-check is only honest if both sides agree on
  // the fact vocabulary).
  it('the audit oracle constants match the strings the gauntlet gate mirrors', async () => {
    const { LANGUAGE_SERVICE_ORACLE_ID, SYMBOL_ORPHAN_PROPERTY } = await import('@czap/audit');
    expect(LANGUAGE_SERVICE_ORACLE_ID).toBe('ts-language-service');
    expect(SYMBOL_ORPHAN_PROPERTY).toBe('symbol-orphan');
  });
});
