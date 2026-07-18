#!/usr/bin/env tsx
/**
 * The SEMANTIC-CONVERGENCE report — the Wave-8.5 closeout artifact for issues
 * #151 / #152 / #153 / #156.
 *
 * It is a DERIVED view: a catamorphic fold that INDEXES already-computed, committed
 * evidence (the effect-shed receipt, the Effect-free invariant, the reactive
 * containment acceptance, the spine-relation gate + admission table, the type-export
 * snapshot, the declared-dependency-closure gate, the ADRs) into ONE per-issue
 * evidence record. It RE-RUNS NOTHING — running a gate here would violate LS-001 /
 * the recompute Law (the report cites evidence, it does not regenerate it). A
 * required artifact that is MISSING is an evidence gap: the report throws rather than
 * emit a green it cannot substantiate (the report-satellite-scan discipline —
 * index what exists, never guess).
 *
 * Output (committed): `reports/semantic-convergence.json` (machine) +
 * `docs/plan/semantic-convergence.md` (narrative). Regenerate with
 * `pnpm run report:semantic-convergence`. Deterministic — no timestamp, no
 * per-commit SHA; a stable `evidenceDigest` (the verdict-cache fold currency) keys
 * the report body so a content change is visible.
 *
 * CLOSURE STATUS: every issue is "evidence-complete — ready to close on branch
 * merge", never "closed". The branch is not merged; claiming closure ahead of merge
 * is green theatre (scar-ledger discipline). The act of closing happens at merge; the
 * WORK of closure — these evidence rows — is what lands in 8.5.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot, isDirectExecution, writeTextFile } from './audit/shared.js';
import { stableSerialize } from '../packages/gauntlet/src/verdict-cache.js';

/** One indexed piece of evidence — a committed artifact, never a re-run. */
interface EvidenceRow {
  readonly artifact: string;
  readonly kind:
    'gate' | 'acceptance-test' | 'invariant' | 'receipt' | 'snapshot' | 'adr' | 'ratchet' | 'admission-table';
  readonly proves: string;
}

/** One issue's closure record — the evidence rows that substantiate it. */
interface IssueClosure {
  readonly issue: number;
  readonly title: string;
  readonly closedBy: string;
  readonly status: 'evidence-complete — ready to close on branch merge';
  readonly evidence: readonly EvidenceRow[];
}

interface ConvergenceReport {
  readonly schemaVersion: 1;
  readonly title: string;
  readonly terminalLaw: string;
  readonly derivation: string;
  readonly counts: {
    readonly activeEffectReferences: number;
    readonly spineAdmittedTypes: number;
    readonly typeSurfacePackages: number;
  };
  readonly twoAxisProof: {
    readonly declaredTypes: readonly string[];
    readonly declaredDependencies: readonly string[];
  };
  readonly issues: readonly IssueClosure[];
  readonly evidenceDigest: string;
}

/** Assert an artifact exists; collect the miss otherwise (thrown as a batch). */
function requireArtifact(rel: string, missing: string[]): string {
  if (!existsSync(resolve(repoRoot, rel))) missing.push(rel);
  return rel;
}

function buildReport(): ConvergenceReport {
  const missing: string[] = [];
  const at = (rel: string): string => requireArtifact(rel, missing);

  // ── Issue evidence (each row an indexed artifact, never a re-run) ──
  const shedEvidence: readonly EvidenceRow[] = [
    {
      artifact: at('traceability/effect-shed-receipt.json'),
      kind: 'receipt',
      proves:
        'every Effect reference count (production, test, declaration, peer, dep, root, override, catalog, scaffold, example, script, lockfile) is 0; cold-install proof; declared-dependency-closure passed',
    },
    {
      artifact: at('tests/unit/core/invariants.test.ts'),
      kind: 'invariant',
      proves: 'Invariant 14 — the permanent tripwire: no packages/*/src/**/*.ts imports from effect',
    },
    {
      artifact: at('docs/adr/0042-effect-shed.md'),
      kind: 'adr',
      proves:
        'the shed decision + the per-responsibility migration bridge (Scope→Lifetime, SubscriptionRef/Stream→CellKernel, typed channel→Result)',
    },
    {
      artifact: at('packages/cli/src/lib/declared-dependency-closure.ts'),
      kind: 'gate',
      proves:
        'the declared-dependency-closure law minted from the fast-check scar (#157): a shipped load-time import must be a declared dependency',
    },
    {
      artifact: at('tests/unit/devops/declared-dependency-closure.test.ts'),
      kind: 'acceptance-test',
      proves: 'every publishable package is main-surface dependency-closed; the fast-check leak is the red fixture',
    },
  ];

  const reactiveEvidence: readonly EvidenceRow[] = [
    {
      artifact: at('tests/component/reactive-no-effect-containment.test.ts'),
      kind: 'acceptance-test',
      proves:
        'a realistic consumer over the public @czap/core barrel: every read a plain typed value, full idempotent teardown, no effect import (with permanent negative controls)',
    },
    {
      artifact: at('docs/adr/0043-reactive-convergence.md'),
      kind: 'adr',
      proves:
        'the CellKernel convergence, the deliberate EmissionPolicy, injected-clock HLC, LiveCell-atomic (S2.3), retired combinators, and the public constitution',
    },
    {
      artifact: at('tests/property/compositor-zero-alloc.test.ts'),
      kind: 'ratchet',
      proves:
        'the live-subscriber reactive publish is 0 B/op (the CellKernel fanout that replaced the Effect Queue bridge)',
    },
    {
      artifact: at('tests/unit/gauntlet/transition-conformance.test.ts'),
      kind: 'gate',
      proves:
        'the bisimulation cage: the reactive primitives observationally match the single-oracle model over seeded op histories',
    },
  ];

  const spineEvidence: readonly EvidenceRow[] = [
    {
      artifact: at('packages/gauntlet/src/gates/spine-relation.ts'),
      kind: 'gate',
      proves:
        'the two-axis spine relation gate: Authority × SurfaceRelation; a drift is an observed relation that no longer satisfies its admitted relation',
    },
    {
      artifact: at('packages/audit/src/spine-relation-build.ts'),
      kind: 'gate',
      proves:
        'the ts.Program probe host — the compiler is the oracle (bidirectional assignability), driven mechanically over the complete admitted set',
    },
    {
      artifact: at('tests/fixtures/spine-relation-admissions.ts'),
      kind: 'admission-table',
      proves:
        'the frozen admission table seeded from the current pins — every currently-pinned mirror type, so absorbing the pins opens no authority gap',
    },
    {
      artifact: at('tests/unit/audit/spine-relation.test.ts'),
      kind: 'acceptance-test',
      proves:
        'green on the reconciled spine; RED on all three historical drift fixtures (CapSet Set→array, Millis brand loss, WGSL omission) + a removed-type case; self-proving via the authority ratchet',
    },
    {
      artifact: at('packages/audit/src/type-export-surface.ts'),
      kind: 'gate',
      proves: 'the tsc-AST TYPE-export enumerator that closes the value-only api-surface snapshot blind spot',
    },
    {
      artifact: at('tests/fixtures/type-export-surface.json'),
      kind: 'snapshot',
      proves:
        'the committed public TYPE surface over the public package roster + the _spine mirror — a dropped/renamed type reds (the exact count is the counts.typeSurfacePackages field, read from the snapshot)',
    },
    {
      artifact: at('tests/unit/spine-conformance.test.ts'),
      kind: 'acceptance-test',
      proves:
        'the type-by-type mirror pins are absorbed (Conflict-1 / S5.2 closed); only the utility asserts + runtime-existence checks the gate cannot cover remain',
    },
  ];

  const issues: readonly IssueClosure[] = [
    {
      issue: 151,
      title: 'audit: Effect shedding + god-file/reinvention sweep',
      closedBy:
        'the Wave-8 residue-scan→0 gate (Invariant 14 + the effect-shed receipt) and the declared-dependency-closure gate',
      status: 'evidence-complete — ready to close on branch merge',
      evidence: shedEvidence,
    },
    {
      issue: 152,
      title: 'audit: Effect shedding + god-file/reinvention sweep (operational baseline)',
      closedBy:
        'the same Wave-8 residue-scan→0 gate — the ship-manifest Effect cause is shed; the Op facade and the reactive/lifecycle kernels converged to native owners',
      status: 'evidence-complete — ready to close on branch merge',
      evidence: shedEvidence,
    },
    {
      issue: 153,
      title: 'reactive containment (Effect out of the reactive family)',
      closedBy: 'the reactive-no-effect-containment acceptance test + ADR-0043',
      status: 'evidence-complete — ready to close on branch merge',
      evidence: reactiveEvidence,
    },
    {
      issue: 156,
      title: 'audit sweep — spine drift class',
      closedBy:
        'the two-axis spine relation gate + the tsc-AST type-export enumerator (the drift class it named), with the frozen pins absorbed without an authority gap',
      status: 'evidence-complete — ready to close on branch merge',
      evidence: spineEvidence,
    },
  ];

  if (missing.length > 0) {
    throw new Error(
      `semantic-convergence report: ${missing.length} required evidence artifact(s) missing — the report indexes committed evidence and cannot claim closure it cannot substantiate:\n${missing.map((m) => `  - ${m}`).join('\n')}`,
    );
  }

  // ── Real counts, read from committed artifacts (never recomputed) ──
  const receipt = JSON.parse(readFileSync(resolve(repoRoot, 'traceability/effect-shed-receipt.json'), 'utf8')) as {
    counts: { activeProductionReferences: number; activeTestReferences: number };
  };
  const typeSurface = JSON.parse(
    readFileSync(resolve(repoRoot, 'tests/fixtures/type-export-surface.json'), 'utf8'),
  ) as {
    packages: Record<string, unknown>;
  };
  const admissionSource = readFileSync(resolve(repoRoot, 'tests/fixtures/spine-relation-admissions.ts'), 'utf8');
  const spineAdmittedTypes = (admissionSource.match(/^\s*(runtimeMirror|reanchoredBrand)\(/gm) ?? []).length;

  const body = {
    schemaVersion: 1 as const,
    title: 'Semantic-convergence report — the Wave-8.5 closeout (#151/#152/#153/#156)',
    terminalLaw:
      'Every projection has one source, one declared fidelity relation, one observer, and current replayable evidence.',
    derivation:
      'A derived fold over committed evidence. It re-runs no gate (LS-001 / the recompute Law); a missing artifact throws rather than emit an unsubstantiated green. Closure is "ready to close on branch merge", never "closed" — the branch is not merged.',
    counts: {
      activeEffectReferences: receipt.counts.activeProductionReferences + receipt.counts.activeTestReferences,
      spineAdmittedTypes,
      typeSurfacePackages: Object.keys(typeSurface.packages).length,
    },
    twoAxisProof: {
      declaredTypes: [
        'the packed .d.ts declares the types the runtime surface actually exposes — proven by the two-axis spine relation gate (structural fidelity) + the type-export enumerator (surface completeness)',
      ],
      declaredDependencies: [
        'the packed artifact runs on the dependencies it declares — proven by the declared-dependency-closure gate (the fast-check leak is its red fixture)',
      ],
    },
    issues,
  };

  return { ...body, evidenceDigest: stableSerialize(body) };
}

/** Render the narrative markdown twin of the JSON report. */
function renderMarkdown(report: ConvergenceReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.title}`, '');
  lines.push(`> **Generated** by \`pnpm run report:semantic-convergence\` — a derived index, not a re-run.`, '');
  lines.push(`**Terminal law.** ${report.terminalLaw}`, '');
  lines.push(`**Derivation.** ${report.derivation}`, '');
  lines.push(`**Two-axis packed-artifact truth.**`);
  lines.push(`- **Declared types:** ${report.twoAxisProof.declaredTypes[0]}`);
  lines.push(`- **Declared dependencies:** ${report.twoAxisProof.declaredDependencies[0]}`, '');
  lines.push(`**Counts (read from committed artifacts).**`);
  lines.push(`- active Effect references (production + test): **${report.counts.activeEffectReferences}**`);
  lines.push(`- spine admitted mirror types: **${report.counts.spineAdmittedTypes}**`);
  lines.push(`- type-surface packages tracked: **${report.counts.typeSurfacePackages}**`, '');
  for (const issue of report.issues) {
    lines.push(`## #${issue.issue} — ${issue.title}`, '');
    lines.push(`**Status:** ${issue.status}`);
    lines.push(`**Closed by:** ${issue.closedBy}`, '');
    lines.push(`| Artifact | Kind | Proves |`, `| --- | --- | --- |`);
    for (const row of issue.evidence) {
      lines.push(`| \`${row.artifact}\` | ${row.kind} | ${row.proves} |`);
    }
    lines.push('');
  }
  lines.push(`---`, `Evidence digest: \`${report.evidenceDigest.slice(0, 24)}…\``, '');
  return lines.join('\n');
}

function main(): void {
  const report = buildReport();
  const json = `${JSON.stringify(report, null, 2)}\n`;
  writeTextFile(resolve(repoRoot, 'reports/semantic-convergence.json'), json);
  writeTextFile(resolve(repoRoot, 'docs/plan/semantic-convergence.md'), renderMarkdown(report));
  console.log(
    `Wrote reports/semantic-convergence.json + docs/plan/semantic-convergence.md — ${report.issues.length} issues, ${report.counts.spineAdmittedTypes} spine admissions, ${report.counts.activeEffectReferences} active Effect refs.`,
  );
}

if (isDirectExecution(import.meta.url)) main();
