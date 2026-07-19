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
 * `pnpm run report:semantic-convergence`. Deterministic — no timestamp, no injected
 * per-commit SHA (the report is itself a committed, reproducible artifact).
 *
 * CONTENT-BOUND (PR #158, finding #6). Every evidence row carries a `contentDigest`
 * — a sha256 of the indexed artifact's BYTES — and `evidenceDigest` folds those
 * digests in. So editing ANY indexed gate / fixture / ADR / snapshot / receipt
 * changes `evidenceDigest`; the earlier digest hashed only the report's own paths +
 * prose, so an evidence edit left it unchanged (a catalog that could not tell it had
 * gone stale). Freshness is INHERITED from each artifact's own attestation, not an
 * independent re-run against this head: the consumed effect-shed receipt's attested
 * `sourceSha` and suite are surfaced verbatim in `provenance.consumedReceipt` rather
 * than silently reported as "current".
 *
 * CLOSURE STATUS: every issue is "evidence-complete — ready to close on branch
 * merge", never "closed". The branch is not merged; claiming closure ahead of merge
 * is green theatre (scar-ledger discipline). The act of closing happens at merge; the
 * WORK of closure — these evidence rows — is what lands in 8.5.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { repoRoot, isDirectExecution, writeTextFile } from './audit/shared.js';
import { stableSerialize } from '../packages/gauntlet/src/verdict-cache.js';

/** One indexed piece of evidence — a committed artifact, never a re-run. */
interface EvidenceRow {
  readonly artifact: string;
  readonly kind:
    'gate' | 'acceptance-test' | 'invariant' | 'receipt' | 'snapshot' | 'adr' | 'ratchet' | 'admission-table';
  readonly proves: string;
  /** sha256 of the artifact's BYTES — binds the row (and `evidenceDigest`) to CONTENT, not just its path. */
  readonly contentDigest: string;
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
  /**
   * How this report is BOUND to its evidence and where its freshness comes from —
   * so a reader can tell a content-bound index from a claim of independent currency.
   */
  readonly provenance: {
    readonly binding: string;
    readonly note: string;
    readonly consumedReceipt: {
      readonly artifact: string;
      readonly attestedSourceSha: string;
      readonly attestedSuite: string;
      readonly freshness: string;
    };
  };
  readonly issues: readonly IssueClosure[];
  readonly evidenceDigest: string;
}

/**
 * Index an artifact: assert it exists (collect the miss for a batch throw) AND bind
 * its CONTENT digest — a sha256 of the bytes. Folding this digest into the report
 * body is what makes `evidenceDigest` sensitive to an edit of the artifact itself,
 * not just to a change in the report's own path/prose text (finding #6).
 */
function indexArtifact(rel: string, kind: EvidenceRow['kind'], proves: string, missing: string[]): EvidenceRow {
  const abs = resolve(repoRoot, rel);
  if (!existsSync(abs)) {
    missing.push(rel);
    return { artifact: rel, kind, proves, contentDigest: 'sha256:MISSING' };
  }
  const contentDigest = `sha256:${createHash('sha256').update(readFileSync(abs)).digest('hex')}`;
  return { artifact: rel, kind, proves, contentDigest };
}

function buildReport(): ConvergenceReport {
  const missing: string[] = [];
  const idx = (rel: string, kind: EvidenceRow['kind'], proves: string): EvidenceRow =>
    indexArtifact(rel, kind, proves, missing);

  // ── Issue evidence (each row an indexed artifact, CONTENT-digested, never a re-run) ──
  const shedEvidence: readonly EvidenceRow[] = [
    idx(
      'traceability/effect-shed-receipt.json',
      'receipt',
      'every Effect reference count (production, test, declaration, peer, dep, root, override, catalog, scaffold, example, script, lockfile) is 0; cold-install proof; declared-dependency-closure passed',
    ),
    idx(
      'tests/unit/core/invariants.test.ts',
      'invariant',
      'Invariant 14 — the permanent tripwire: no .ts under packages/<pkg>/src imports from effect',
    ),
    idx(
      'tests/unit/devops/docs-effect-residue.test.ts',
      'acceptance-test',
      'the shipped-docs residue gate: no package README / root README / GETTING-STARTED carries an Effect install, version pin, import, or usage instruction (the ecosystem-zero claim now covers consumer docs, not just src)',
    ),
    idx(
      'docs/adr/0042-effect-shed.md',
      'adr',
      'the shed decision + the per-responsibility migration bridge (Scope→Lifetime, SubscriptionRef/Stream→CellKernel, typed channel→Result)',
    ),
    idx(
      'packages/cli/src/lib/declared-dependency-closure.ts',
      'gate',
      'the declared-dependency-closure law minted from the fast-check scar (#157): a shipped load-time import must be a declared dependency',
    ),
    idx(
      'tests/unit/devops/declared-dependency-closure.test.ts',
      'acceptance-test',
      'every publishable package is dependency-closed across EVERY public runtime export (not just `.`); the fast-check-via-./harness and vite-via-./dev leaks are declared as optional peers',
    ),
  ];

  const reactiveEvidence: readonly EvidenceRow[] = [
    idx(
      'tests/component/reactive-no-effect-containment.test.ts',
      'acceptance-test',
      'a realistic consumer over the public @czap/core barrel: every read a plain typed value, full idempotent teardown, no effect import (with permanent negative controls)',
    ),
    idx(
      'docs/adr/0043-reactive-convergence.md',
      'adr',
      'the CellKernel convergence, the deliberate EmissionPolicy, injected-clock HLC, LiveCell-atomic (S2.3), retired combinators, and the public constitution',
    ),
    idx(
      'tests/property/compositor-zero-alloc.test.ts',
      'ratchet',
      'the live-subscriber reactive publish is 0 B/op (the CellKernel fanout that replaced the Effect Queue bridge)',
    ),
    idx(
      'tests/unit/gauntlet/transition-conformance.test.ts',
      'gate',
      'the bisimulation cage: the reactive primitives observationally match the single-oracle model over seeded op histories',
    ),
  ];

  const spineEvidence: readonly EvidenceRow[] = [
    idx(
      'packages/gauntlet/src/gates/spine-relation.ts',
      'gate',
      'the two-axis spine relation gate: Authority × SurfaceRelation; a drift is an observed relation that no longer satisfies its admitted relation',
    ),
    idx(
      'packages/audit/src/spine-relation-build.ts',
      'gate',
      'the ts.Program probe host — the compiler is the oracle (bidirectional assignability), driven mechanically over the complete admitted set',
    ),
    idx(
      'tests/fixtures/spine-relation-admissions.ts',
      'admission-table',
      'the frozen admission table seeded from the current pins — every currently-pinned mirror type, so absorbing the pins opens no authority gap',
    ),
    idx(
      'tests/unit/audit/spine-relation.test.ts',
      'acceptance-test',
      'green on the reconciled spine; RED on all three historical drift fixtures (CapSet Set→array, Millis brand loss, WGSL omission) + a removed-type case; self-proving via the authority ratchet',
    ),
    idx(
      'packages/audit/src/type-export-surface.ts',
      'gate',
      'the tsc-AST TYPE-export enumerator that closes the value-only api-surface snapshot blind spot',
    ),
    idx(
      'tests/fixtures/type-export-surface.json',
      'snapshot',
      'the committed public TYPE surface over the public package roster + the _spine mirror — a dropped/renamed type reds (the exact count is the counts.typeSurfacePackages field, read from the snapshot)',
    ),
    idx(
      'tests/unit/spine-conformance.test.ts',
      'acceptance-test',
      'the type-by-type mirror pins are absorbed (Conflict-1 / S5.2 closed); only the utility asserts + runtime-existence checks the gate cannot cover remain',
    ),
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
    sourceSha: string;
    counts: { activeProductionReferences: number; activeTestReferences: number };
    verification: { fullSuite: string };
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
        'the packed artifact runs on the dependencies it declares — proven by the declared-dependency-closure gate, widened to every public runtime export: fast-check-via-./harness is now a declared optional peer; vite-via-./dev is a guarded dynamic import (the sanctioned optional-integration seam, outside the load-time closure)',
      ],
    },
    provenance: {
      binding: 'content-digest — every evidence row carries a sha256 of its artifact bytes, folded into evidenceDigest',
      note:
        'This is a CONTENT-BOUND index: editing any indexed gate/fixture/ADR/snapshot/receipt changes that row\'s contentDigest and therefore evidenceDigest. It is NOT an independent re-run — it re-runs no gate (LS-001). Each row\'s currency is the currency of the committed artifact it digests.',
      consumedReceipt: {
        artifact: 'traceability/effect-shed-receipt.json',
        attestedSourceSha: receipt.sourceSha,
        attestedSuite: receipt.verification.fullSuite,
        freshness:
          'ATTESTED-AT-SOURCE-SHA, surfaced verbatim — the receipt\'s counts below are its attested values at that SHA, not re-verified against this head. The receipt is bound here by contentDigest, so any edit to it (including a refreshed SHA/suite) reflows evidenceDigest.',
      },
    },
    issues,
  };

  // A genuine compact digest: sha256 over the canonical serialization of the body,
  // which now includes every row's artifact CONTENT digest — so this single value
  // moves whenever any indexed evidence artifact's bytes change (finding #6).
  const evidenceDigest = `sha256:${createHash('sha256').update(stableSerialize(body)).digest('hex')}`;
  return { ...body, evidenceDigest };
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
  lines.push(`**Provenance & freshness.**`);
  lines.push(`- **Binding:** ${report.provenance.binding}`);
  lines.push(`- ${report.provenance.note}`);
  lines.push(
    `- **Consumed receipt** \`${report.provenance.consumedReceipt.artifact}\` — attested at source SHA ` +
      `\`${report.provenance.consumedReceipt.attestedSourceSha.slice(0, 12)}…\`, suite: ` +
      `${report.provenance.consumedReceipt.attestedSuite}. ${report.provenance.consumedReceipt.freshness}`,
    '',
  );
  for (const issue of report.issues) {
    lines.push(`## #${issue.issue} — ${issue.title}`, '');
    lines.push(`**Status:** ${issue.status}`);
    lines.push(`**Closed by:** ${issue.closedBy}`, '');
    lines.push(`| Artifact | Kind | Content digest | Proves |`, `| --- | --- | --- | --- |`);
    for (const row of issue.evidence) {
      lines.push(`| \`${row.artifact}\` | ${row.kind} | \`${row.contentDigest.slice(0, 18)}…\` | ${row.proves} |`);
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
