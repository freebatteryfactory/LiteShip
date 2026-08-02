/**
 * The BLOCKING consumer of the CSS-identity surface oracle (Codex review on
 * PR #197, confirmed P1): every `css-identity-unescaped` fact the host's
 * `cssIdentitySurfaceOracle` emits folds into an error finding.
 *
 * The oracle (the 2.7 owner resolution) walks anchored CSS template literals
 * in shipped source and records each interpolation that bypasses the core
 * escape as a fact carrying the exact path/line/column/expression. Before
 * this gate existed the facts were produced and read by nothing — an
 * advisory-only surface wearing a scanner's name, the exact
 * production-without-consumption shape the hardening batch exists to kill.
 *
 * It folds facts (never rescans text), so it REQUIRES the injected IR and
 * rides {@link LITESHIP_IR_ONLY_GATES} — the host path builds the IR with the
 * oracle attached; the lean MCP/command path does not run it.
 *
 * @module
 */

import { defineGate, requireIR, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { makeRepoIR, type Fact, type RepoIR } from '../repo-ir.js';

const RULE_ID = 'gauntlet/css-identity-unescaped';

/** True iff `fact` is the CSS-identity oracle's unescaped-interpolation observation. */
function isUnescapedIdentityFact(fact: Fact): boolean {
  return fact.property === 'css-identity-unescaped' && fact.oracleId === 'css-identity-surface';
}

/** Fold the IR's `css-identity-unescaped` facts into findings — one per site. */
function fold(context: GateContext): readonly Finding[] {
  const ir = requireIR(context, RULE_ID);
  const findings: Finding[] = [];
  for (const fact of ir.facts) {
    if (!isUnescapedIdentityFact(fact)) continue;
    const value = fact.value as { readonly column?: number; readonly reason?: string; readonly expression?: string };
    findings.push(
      finding({
        ruleId: RULE_ID,
        severity: 'error',
        level: 'L1',
        title: 'Unescaped interpolation into an anchored CSS identity',
        detail:
          `${fact.file}:${fact.line ?? 0}${value.column !== undefined ? `:${value.column}` : ''} interpolates ` +
          `${value.expression ?? 'an expression'} into anchored CSS without the core escape` +
          `${value.reason !== undefined ? ` (${value.reason})` : ''}. ` +
          'A caller-influenced name reaches generated CSS syntax unescaped — the identity kernel exists so this cannot happen.',
        location: { file: fact.file, ...(fact.line !== undefined ? { line: fact.line } : {}) },
        coverageClass: fact.coverageClass,
        remediation: {
          kind: 'instruction',
          description: 'Route the interpolation through the core CSS-identity escape.',
          steps: [
            'Import the escape used by the generated default selectors (packages/core/src/motion/css-identity.ts).',
            'Wrap the interpolated expression; caller-owned complete selectors stay caller-owned — only identity fragments are escaped.',
          ],
        },
      }),
    );
  }
  return findings;
}

/** A {@link GateContext} carrying ONLY an in-memory IR (no file map) — fixtures. */
function irContext(ir: RepoIR): GateContext {
  return { ...memoryContext({}), ir };
}

/** An in-memory IR with one unescaped-identity fact at `file:line`. */
function irWithUnescapedIdentity(file: string, line: number): RepoIR {
  return makeRepoIR({
    files: [{ id: file, contentDigest: 'placeholder:no-content-address', packageName: null }],
    facts: [
      {
        file,
        line,
        property: 'css-identity-unescaped',
        value: { column: 12, reason: 'unescaped-interpolation', expression: 'component.name' },
        oracleId: 'css-identity-surface',
        coverageClass: 'file-proxy-only',
      },
    ],
  });
}

/**
 * The css-identity-unescaped gate — fixtures are in-memory {@link RepoIR}s,
 * proving the gate folds the oracle's facts. Self-proves via the same ratchet
 * as every gate.
 */
export const cssIdentityUnescapedGate: Gate = defineGate({
  id: RULE_ID,
  level: 'L1',
  describe:
    "Flags unescaped interpolations into anchored CSS identities by folding the IR's `css-identity-unescaped` facts (the blocking consumer of the CSS-identity surface oracle).",
  access: { ir: ['facts'] },
  run: fold,
  fixtures: {
    red: {
      name: 'an IR carrying a css-identity-unescaped fact',
      context: irContext(irWithUnescapedIdentity('bad.ts', 341)),
    },
    green: {
      name: 'an IR whose CSS-identity facts are anchor receipts only',
      context: irContext(
        makeRepoIR({
          files: [{ id: 'good.ts', contentDigest: 'placeholder:no-content-address', packageName: null }],
          // The oracle's anchor-count receipt (a DIFFERENT property) must NOT fold.
          facts: [
            {
              file: 'good.ts',
              line: 1,
              property: 'css-identity-anchor-count',
              value: 3,
              oracleId: 'css-identity-surface',
              coverageClass: 'file-proxy-only',
            },
          ],
        }),
      ),
    },
    mutation: {
      describe:
        "A mutant that folds facts WITHOUT checking the property (counts every css-identity-surface fact as unescaped) flags the green IR's anchor receipt — the green fixture must then go red and kill it.",
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] => {
          const ir = requireIR(context, RULE_ID);
          // Mutant: ignore the property guard — fold EVERY oracle fact,
          // anchor receipts included. The green fixture then yields a
          // finding, so the mutant fails green-clean and is killed.
          return ir.facts
            .filter((f) => f.oracleId === 'css-identity-surface')
            .map((f) => finding({ ruleId: RULE_ID, severity: 'error', level: 'L1', title: 'mutant', detail: f.file }));
        },
      }),
    },
  },
});
