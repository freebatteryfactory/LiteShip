/**
 * Gate: supply-chain — the avionics-tier (L4) fold over the host-supplied
 * {@link SupplyChainFacts} (Slice C).
 *
 * "Runtime determinism is clown shoes without a hermetic build." This gate is
 * how the build's hermeticity is PINNED into the assurance ratchet: it folds
 * four already-decided fact families into Findings —
 *
 *  - LOCKFILE POLICY: no git/URL deps, no floating (unhashed) resolutions, no
 *    unsanctioned prerelease ranges, a frozen single-truth lockfile.
 *  - SBOM COMPLETENESS: the emitted bill of materials covers every package the
 *    lockfile pins (no gaps, no phantoms) and is content-addressed.
 *  - PROVENANCE: a ShipCapsule's recorded `lockfile_address` provably equals the
 *    LIVE pnpm-lock.yaml's address (the release was built from the committed
 *    lockfile, not a drifted tree), plus a well-formed `source_commit`.
 *  - NO AMBIENT CI AUTHORITY: no long-lived publish secret (`NPM_TOKEN`, …) in
 *    the workflows — publish authority is the short-lived OIDC token only.
 *
 * LEAN BY CONSTRUCTION (ADR-0012): the gate parses NO YAML, decodes NO CBOR, and
 * touches NO workspace. The HOST (the CLI's `@czap/cli` analyzer) computes the
 * facts and injects them via {@link GateContext.supplyChain}; this gate only
 * folds. An ABSENT fact family is reported as an HONEST advisory "not-evidenced"
 * finding (a host that supplied no supply-chain facts at all gets four
 * advisories, never a silent green) — under-coverage is surfaced, never hidden.
 *
 * It ships red / green / mutation fixtures, so it self-proves against the
 * authority ratchet.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { SupplyChainFacts, SupplyChainViolation } from '../supply-chain-facts.js';

const RULE_NS = 'gauntlet/supply-chain';

/** Project one decided violation into an error Finding at the avionics level. */
function violationFinding(family: string, v: SupplyChainViolation): Finding {
  return finding({
    ruleId: `${RULE_NS}/${family}/${v.code}`,
    severity: 'error',
    level: 'L4',
    title: `Supply-chain violation (${family}): ${v.code}`,
    detail: `${v.subject}: ${v.detail}`,
    location: { file: v.subject },
    remediation: {
      kind: 'instruction',
      description: 'Restore the hermetic-build invariant this fact pins.',
      steps: [
        `The supply-chain analyzer decided a ${family} violation: ${v.detail}.`,
        'Fix the underlying artifact (lockfile entry, SBOM coverage, ShipCapsule, or CI workflow) — the gate folds facts, it never weakens the policy.',
        'Re-run the host analyzer so the corrected facts are re-folded; the violation must clear, not be waived.',
      ],
    },
  });
}

/** The advisory finding for a fact family the host did NOT supply. */
function notEvidencedFinding(family: string): Finding {
  return finding({
    ruleId: `${RULE_NS}/${family}/not-evidenced`,
    severity: 'advisory',
    level: 'L4',
    title: `Supply-chain ${family} not evidenced`,
    detail: `No ${family} facts were injected on the GateContext, so the gate cannot attest this family. This is honest under-coverage (advisory), never a silent pass — a host (the CLI supply-chain analyzer) must compute the ${family} facts and inject them via context.supplyChain.`,
    remediation: {
      kind: 'instruction',
      description: `Supply the ${family} facts so the avionics gate can attest them.`,
      steps: [
        `Run the @czap/cli supply-chain analyzer, which builds the ${family} facts.`,
        `Inject the resulting SupplyChainFacts via the GateContext (context.supplyChain.${family}).`,
      ],
    },
  });
}

/** The fold: project the injected supply-chain facts into Findings. */
function fold(context: GateContext): readonly Finding[] {
  const facts: SupplyChainFacts | undefined = context.supplyChain;
  const findings: Finding[] = [];

  // lockfile policy
  if (facts?.lockfile === undefined) {
    findings.push(notEvidencedFinding('lockfile'));
  } else {
    for (const v of facts.lockfile.violations) findings.push(violationFinding('lockfile', v));
  }

  // SBOM completeness
  if (facts?.sbom === undefined) {
    findings.push(notEvidencedFinding('sbom'));
  } else {
    for (const v of facts.sbom.violations) findings.push(violationFinding('sbom', v));
  }

  // ShipCapsule provenance
  if (facts?.provenance === undefined) {
    findings.push(notEvidencedFinding('provenance'));
  } else {
    for (const v of facts.provenance.violations) findings.push(violationFinding('provenance', v));
  }

  // no-ambient-CI-authority
  if (facts?.ci === undefined) {
    findings.push(notEvidencedFinding('ci'));
  } else {
    for (const v of facts.ci.violations) findings.push(violationFinding('ci', v));
  }

  return findings;
}

/** A GateContext carrying a literal SupplyChainFacts record (fixture helper). */
function factsContext(facts: SupplyChainFacts): GateContext {
  return { ...memoryContext({}), supplyChain: facts };
}

/** A fully-attested, clean supply chain — the green floor. */
const CLEAN_FACTS: SupplyChainFacts = {
  lockfile: { lockfileVersion: '9.0', packageCount: 3, violations: [] },
  sbom: {
    artifactPath: 'reports/sbom.json',
    contentAddress: 'addr-fixture',
    componentCount: 3,
    violations: [],
  },
  provenance: {
    packageName: '@czap/example',
    sourceCommit: '0'.repeat(40),
    sourceDirty: false,
    violations: [],
  },
  ci: { workflowsScanned: ['.github/workflows/release.yml'], violations: [] },
};

/** A supply chain with one decided violation in every family — the red. */
const DIRTY_FACTS: SupplyChainFacts = {
  lockfile: {
    lockfileVersion: '9.0',
    packageCount: 3,
    violations: [
      {
        code: 'git-url-dependency',
        subject: 'some-pkg@github:owner/repo#abc',
        detail: 'resolved from a git source — not a registry artifact; breaks reproducible, hermetic installs.',
      },
    ],
  },
  sbom: {
    artifactPath: 'reports/sbom.json',
    contentAddress: 'addr-fixture',
    componentCount: 2,
    violations: [
      {
        code: 'incomplete-sbom',
        subject: 'left-pad@1.0.0',
        detail: 'present in the lockfile but absent from the SBOM — the bill of materials is incomplete.',
      },
    ],
  },
  provenance: {
    packageName: '@czap/example',
    sourceCommit: 'not-a-sha',
    sourceDirty: true,
    violations: [
      {
        code: 'lockfile-address-drift',
        subject: '@czap/example',
        detail:
          "the ShipCapsule's recorded lockfile_address does not equal the live pnpm-lock.yaml address — the release was built from a drifted tree.",
      },
    ],
  },
  ci: {
    workflowsScanned: ['.github/workflows/release.yml'],
    violations: [
      {
        code: 'ambient-publish-token',
        subject: '.github/workflows/release.yml',
        detail:
          'references a long-lived NPM_TOKEN secret — ambient publish authority; the OIDC trusted-publishing invariant requires the short-lived id-token only.',
      },
    ],
  },
};

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const supplyChainGate: Gate = defineGate({
  id: RULE_NS,
  level: 'L4',
  describe:
    'Avionics-tier fold over host-supplied supply-chain facts: lockfile policy, SBOM completeness, ShipCapsule provenance, and no-ambient-CI-authority — pins the build hermeticity runtime determinism depends on.',
  run: fold,
  fixtures: {
    red: {
      name: 'a supply chain with a git-URL dep, an incomplete SBOM, a drifted lockfile address, and an ambient NPM_TOKEN',
      context: factsContext(DIRTY_FACTS),
    },
    green: {
      name: 'a fully-attested, policy-clean supply chain (every family evidenced, zero violations)',
      context: factsContext(CLEAN_FACTS),
    },
    mutation: {
      describe:
        'A gate that ignores the injected violations (folds nothing) leaves the red fixture unflagged — the mutant must then fail the red.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: drop every decided violation on the floor (a toothless fold).
        run: (): readonly Finding[] => [],
      }),
    },
  },
});
