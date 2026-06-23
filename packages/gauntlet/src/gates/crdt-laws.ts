/**
 * Slice C (avionics tier) — the CRDT / linearizability LAW-COVERAGE gate (L4).
 *
 * The HLC (hybrid logical clock) and GraphPatch (the document-graph CRDT) are the
 * causal/CRDT trust spine: "if this lies, downstream trusts bad reality". The L4
 * `requires` ladder (`assurance.ts`) demands "linearizability / CRDT laws" — but a
 * REQUIREMENT nobody pins is a hole in the safety case. This gate is the META-CHECK
 * that the formal CRDT laws are actually pinned by property tests: it folds over the
 * repo's test files and REPORTS a finding for any required law family whose pinning
 * test is absent, empty, or missing a representative law marker.
 *
 * It is a PURE `(context) => Finding[]` fold over the {@link GateContext} file map —
 * no `@czap/core` import (that would add a heavy dep edge + risk a cycle into the lean
 * engine), no `typescript` dep, no I/O of its own. It reads ONLY through the context,
 * so the same gate runs against the real repo and against an in-memory fixture
 * unchanged. The laws themselves are proven IN the property tests (deterministic
 * fast-check); this gate proves those proofs EXIST and stay wired — the coverage rail
 * that keeps the L4 ladder's "CRDT laws" rung from silently rotting away.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { stableEvidenceDigest } from '../verdict-cache.js';

/** The shared rule id — namespaces every finding for traceability. */
const RULE_ID = 'gauntlet/crdt-laws-pinned';

/**
 * A required CRDT/linearizability law family: the property-test file that MUST
 * pin it, and the canonical markers that prove the representative laws are present
 * (not merely a stub file). A family is COVERED iff its file exists, is non-empty,
 * and contains EVERY marker. The markers are the law NAMES the tests assert under —
 * stable, human-meaningful anchors (e.g. `IDEMPOTENCE`, `COMMUTATIVITY`,
 * `CONVERGENCE`, `TRANSITIVITY`).
 */
interface LawFamily {
  /** Human label for the family in findings. */
  readonly label: string;
  /** Repo-relative path of the property test that pins this family's laws. */
  readonly file: string;
  /** Canonical law markers that MUST all appear in the file (the representative laws). */
  readonly markers: readonly string[];
}

/**
 * The L4 CRDT/linearizability law families the avionics tier requires pinned. The
 * markers are the formal-law anchors the property tests assert under; a missing
 * marker means a representative law is no longer pinned (a hole in the spine).
 */
const REQUIRED_LAW_FAMILIES: readonly LawFamily[] = [
  {
    label: 'HLC (hybrid logical clock) — join-semilattice + total-order laws',
    file: 'tests/property/hlc-crdt-laws.prop.test.ts',
    // The join semilattice (idempotent/commutative/associative LUB), the total
    // order (transitivity/totality), and the merge clock-advance contract.
    markers: ['IDEMPOTENCE', 'COMMUTATIVITY', 'ASSOCIATIVITY', 'TRANSITIVITY', 'TOTALITY', 'HLC.merge'],
  },
  {
    label: 'GraphPatch (document-graph CRDT) — SEC + conflict-boundary laws',
    file: 'tests/property/graph-patch-crdt-laws.prop.test.ts',
    // Idempotence, commutativity of non-conflicting patches, convergence (strong
    // eventual consistency), and the LWW conflict-boundary surfaced via fork detection.
    markers: ['IDEMPOTENCE', 'COMMUTATIVITY', 'CONVERGENCE', 'CONFLICT', 'forkOf'],
  },
];

/** The markers absent from `text` (a family is covered iff this is empty). */
function missingMarkers(text: string, markers: readonly string[]): readonly string[] {
  return markers.filter((m) => !text.includes(m));
}

/**
 * The fold: for each required law family, read its pinning test through the
 * context and emit an L4 finding if the file is absent, empty, or missing any
 * representative-law marker.
 */
function fold(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const family of REQUIRED_LAW_FAMILIES) {
    const text = context.readFile(family.file);
    if (text === undefined || text.trim() === '') {
      findings.push(
        finding({
          ruleId: RULE_ID,
          severity: 'error',
          level: 'L4',
          title: `L4 CRDT law family not pinned: ${family.label}`,
          detail: `${family.file} is absent or empty. The L4 assurance ladder requires the linearizability / CRDT laws to be PINNED by a property test. Without it, the ${family.label} family is unproven — a hole in the causal/CRDT trust spine ("if this lies, downstream trusts bad reality").`,
          location: { file: family.file },
          remediation: {
            kind: 'instruction',
            description: `Pin the ${family.label} laws with a deterministic property test.`,
            steps: [
              `Create ${family.file} as a fast-check property suite with a fixed seed (deterministic, never flaky).`,
              `Assert each representative law: ${family.markers.join(', ')}.`,
              'If a law genuinely does not hold, that is a REAL substrate bug — report it; never weaken the test to go green.',
            ],
          },
        }),
      );
      continue;
    }
    const missing = missingMarkers(text, family.markers);
    if (missing.length > 0) {
      findings.push(
        finding({
          ruleId: RULE_ID,
          severity: 'error',
          level: 'L4',
          title: `L4 CRDT law(s) missing from ${family.file}: ${missing.join(', ')}`,
          detail: `${family.file} exists but does not pin every required law of the ${family.label} family. Missing representative law marker(s): ${missing.join(', ')}. Each marker is a formal CRDT/linearizability law the avionics tier requires proven; a missing one is an unpinned law on the trust spine.`,
          location: { file: family.file },
          remediation: {
            kind: 'instruction',
            description: `Add the missing law(s) to ${family.file}.`,
            steps: missing.map(
              (m) =>
                `Pin the ${m} law as a deterministic fast-check property (or its honest, investigated contract if the naive form does not hold).`,
            ),
          },
        }),
      );
    }
  }
  return findings;
}

/**
 * The OUT-OF-IR evidence digest — the verdict-cache soundness fold. This gate's verdict
 * depends ENTIRELY on the `tests/property/*-crdt-laws.prop.test.ts` files it reads (the
 * {@link REQUIRED_LAW_FAMILIES} paths), which live UNDER `tests/` — OUTSIDE the IR. The
 * coverage digest (package source) never sees them, so editing or deleting a law file
 * WITHOUT touching package source would serve a stale verdict unless this is folded.
 * We fold each required family file's `(path, body)`; an absent file folds the distinct
 * `«absent»` marker, so deleting a law file (a real verdict change) flips the digest.
 */
function crdtLawsEvidenceDigest(context: GateContext): string {
  const entries: [string, string][] = REQUIRED_LAW_FAMILIES.map((family) => {
    const text = context.readFile(family.file);
    // Tag presence so an ABSENT file ("A") can never alias a PRESENT file ("P") whose
    // body coincidentally equals the absent text — the present/absent flip the verdict
    // hinges on must always flip the digest.
    return [family.file, text === undefined ? 'A' : `P${text}`];
  });
  return stableEvidenceDigest(entries);
}

// ---------------------------------------------------------------------------
// Fixtures — in-memory file maps (the GateContext file map IS the world here).
// ---------------------------------------------------------------------------

/** A {@link GateContext} backed ONLY by an in-memory file map — fixtures, no fs. */
function fileContext(files: Readonly<Record<string, string>>): GateContext {
  return {
    repoRoot: '/virtual',
    readFile: (relativePath: string): string | undefined => files[relativePath],
    files: (): readonly string[] => Object.keys(files),
  };
}

/** A file body that pins EVERY marker of both families (the known-GOOD world). */
const GREEN_HLC = 'IDEMPOTENCE COMMUTATIVITY ASSOCIATIVITY TRANSITIVITY TOTALITY HLC.merge — all pinned';
const GREEN_GRAPH_PATCH = 'IDEMPOTENCE COMMUTATIVITY CONVERGENCE CONFLICT forkOf — all pinned';

/**
 * The CRDT-law-coverage gate — self-proves via the authority ratchet. RED: a repo
 * MISSING a law family's pinning file. GREEN: both families present + every marker
 * pinned. MUTATION: a gate that only checks file PRESENCE (ignores the markers)
 * passes a stub file that pins NO law — the marker-aware red fixture then goes green
 * under the mutant, killing it.
 */
export const crdtLawsGate: Gate = defineGate({
  id: RULE_ID,
  level: 'L4',
  describe:
    'Verifies the L4 CRDT / linearizability laws (HLC + GraphPatch) are PINNED by deterministic property tests — the coverage rail for the causal/CRDT trust spine.',
  run: fold,
  evidenceDigest: crdtLawsEvidenceDigest,
  fixtures: {
    red: {
      // Both files are PRESENT but INCOMPLETE — each pins only some laws. The real
      // (marker-aware) gate flags the missing laws; a presence-only mutant sees both
      // files as present and flags NOTHING, so the mutant fails red-catch and is killed.
      name: 'a repo whose CRDT law files are present but pin only SOME of the required laws',
      context: fileContext({
        // Present but INCOMPLETE — missing ASSOCIATIVITY, TRANSITIVITY, TOTALITY, HLC.merge.
        'tests/property/hlc-crdt-laws.prop.test.ts': 'IDEMPOTENCE COMMUTATIVITY only',
        // Present but INCOMPLETE — missing CONVERGENCE, CONFLICT, forkOf.
        'tests/property/graph-patch-crdt-laws.prop.test.ts': 'IDEMPOTENCE COMMUTATIVITY only',
      }),
    },
    green: {
      name: 'a repo with both CRDT law families present and every representative law pinned',
      context: fileContext({
        'tests/property/hlc-crdt-laws.prop.test.ts': GREEN_HLC,
        'tests/property/graph-patch-crdt-laws.prop.test.ts': GREEN_GRAPH_PATCH,
      }),
    },
    mutation: {
      describe:
        'A mutant that checks ONLY file PRESENCE (drops the marker check) treats a present-but-incomplete file as covered. The red fixture (both files present but pinning only SOME laws) then yields ZERO findings under the mutant — so the mutant fails red-catch and the ratchet kills it. The green fixture stays clean either way.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] => {
          // Mutant: PRESENCE-ONLY — ignore the markers entirely. A file that exists is
          // "covered" even if it pins zero laws. The plausible-but-wrong variant: it cannot
          // tell an incomplete law file from a complete one, so the red fixture (present but
          // incomplete) slips through with no finding → red not caught → mutant killed.
          const findings: Finding[] = [];
          for (const family of REQUIRED_LAW_FAMILIES) {
            const text = context.readFile(family.file);
            if (text === undefined || text.trim() === '') {
              findings.push(
                finding({
                  ruleId: RULE_ID,
                  severity: 'error',
                  level: 'L4',
                  title: 'mutant: absent',
                  detail: family.file,
                }),
              );
            }
          }
          return findings;
        },
      }),
    },
  },
});
