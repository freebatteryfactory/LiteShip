/**
 * Gate: check-registry-complete — the check-registry PARTITION meta-gate.
 *
 * Every root `package.json` script must be EITHER a registered check (in
 * `@liteship/command`'s `CHECK_REGISTRY`, referenced by its command) OR an exempt
 * script (in `SCRIPT_EXEMPTIONS`) — the partition is TOTAL (nothing uncovered) and
 * DISJOINT (nothing in both). AND every registered check's command must resolve to a
 * script that actually exists (a command referencing a deleted script is a dangling
 * assertion). This gate is the guard that keeps the registry honest as scripts come
 * and go: a new root script that nobody registers or exempts, a script both registered
 * and exempted, or a command that resolves to nothing — each is a finding.
 *
 * LEAN BY CONSTRUCTION — a {@link FactGate}: it does NOT import `@liteship/command`
 * (the registry lives there, and `@liteship/command` deps `@liteship/gauntlet`, so the
 * arrow points one way), nor read the filesystem. A HOST (the `tests/unit/devops`
 * meta-test, or a future CLI host) folds `CHECK_REGISTRY` / `SCRIPT_EXEMPTIONS` /
 * `package.json` into the injected {@link CheckGovernanceFacts.partition}; this gate
 * only decides. Earns blocking authority via red/green/mutation fixtures; when the
 * facts are ABSENT (the lean production path) it folds an empty verdict.
 *
 * @module
 */

import { defineFactGate, type FactBundle, type FactGate, type Gate, type GateContext } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { CheckGovernanceFacts, CheckPartitionFacts } from '../facts/check-governance-facts.js';

/** The gate id — namespaces every {@link Finding} it emits. */
const RULE_ID = 'gauntlet/check-registry-complete';

/** Build one partition finding (uncovered / overlapping / unresolved). */
function partitionFinding(title: string, detail: string, remediation: string): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title,
    detail,
    location: { file: 'package.json', line: 1 },
    remediation: {
      kind: 'instruction',
      description: 'Keep the check registry and the root scripts in exact partition.',
      steps: [remediation],
    },
  });
}

/**
 * THE DECISION — data in, findings out, NO context. Reads only the partition slice:
 *  - UNCOVERED — a root script that is neither registered nor exempt.
 *  - OVERLAP   — a root script that is BOTH registered and exempt (not disjoint).
 *  - UNRESOLVED — a registered check whose command references a non-existent script.
 */
export function decideCheckRegistryComplete(facts: FactBundle): readonly Finding[] {
  const pack: CheckGovernanceFacts | undefined = facts.checkGovernance;
  if (pack === undefined) return [];
  const partition: CheckPartitionFacts = pack.partition;
  const registeredScripts = new Set(partition.registered.map((entry) => entry.script));
  const exempted = new Set(partition.exempted);
  const findings: Finding[] = [];
  for (const script of partition.scripts) {
    const isRegistered = registeredScripts.has(script);
    const isExempt = exempted.has(script);
    if (!isRegistered && !isExempt) {
      findings.push(
        partitionFinding(
          `Root script "${script}" is neither registered nor exempt`,
          `The root \`package.json\` script "${script}" appears in NO CHECK_REGISTRY command and NO SCRIPT_EXEMPTIONS entry. The registry partition must be TOTAL: every root script either ASSERTS something (a registered check referencing it) or is a workflow/component/alias/helper (an exemption).`,
          `Register a check whose command runs "${script}", or add a SCRIPT_EXEMPTIONS entry with the one-line reason it is not a distinct check.`,
        ),
      );
    }
    if (isRegistered && isExempt) {
      findings.push(
        partitionFinding(
          `Root script "${script}" is BOTH registered and exempt`,
          `The root \`package.json\` script "${script}" is referenced by a CHECK_REGISTRY command AND listed in SCRIPT_EXEMPTIONS. The partition must be DISJOINT — a script is a check XOR an exemption, never both.`,
          `Remove the SCRIPT_EXEMPTIONS entry for "${script}" (it is a registered check) or drop the check that references it.`,
        ),
      );
    }
  }
  for (const entry of partition.registered) {
    if (!entry.scriptExists) {
      findings.push(
        partitionFinding(
          `Check "${entry.id}" resolves to a non-existent script "${entry.script}"`,
          `The registered check "${entry.id}" runs a command that references the root script "${entry.script}", but no such key exists in \`package.json\`'s \`scripts\`. A command that resolves to nothing is a dangling assertion.`,
          `Restore the "${entry.script}" root script, or update "${entry.id}"'s command to reference an existing script.`,
        ),
      );
    }
  }
  return findings;
}

// ── Fixtures (synthetic partitions — a total+disjoint green, a hole/overlap red) ──

function factContext(facts: CheckGovernanceFacts): GateContext {
  return { ...memoryContext({}), checkGovernance: facts };
}

/** A well-formed facts pack carrying only the given partition (the other slices are empty/clean). */
function governance(partition: CheckPartitionFacts): CheckGovernanceFacts {
  return Object.freeze({
    partition,
    negativeControls: Object.freeze([]),
    waivers: Object.freeze([]),
  });
}

/** RED — a root script ("orphan") that is neither registered nor exempt. */
const RED_FACTS = governance(
  Object.freeze({
    scripts: Object.freeze(['build', 'typecheck', 'orphan']),
    registered: Object.freeze([{ id: 'check/typecheck', script: 'typecheck', scriptExists: true }]),
    exempted: Object.freeze(['build']),
  }),
);

/** GREEN — a total + disjoint partition where every command resolves. */
const GREEN_FACTS = governance(
  Object.freeze({
    scripts: Object.freeze(['build', 'typecheck']),
    registered: Object.freeze([{ id: 'check/typecheck', script: 'typecheck', scriptExists: true }]),
    exempted: Object.freeze(['build']),
  }),
);

/**
 * The check-registry-complete gate — the partition backstop. Self-proves via synthetic
 * partitions; a host injects the real CHECK_REGISTRY / SCRIPT_EXEMPTIONS / package.json fold.
 */
export const checkRegistryCompleteGate: FactGate = defineFactGate({
  id: RULE_ID,
  level: 'L2',
  describe:
    'FactGate: declares it consumes CheckGovernanceFacts and reports any root package.json script that is neither registered (in CHECK_REGISTRY) nor exempt (in SCRIPT_EXEMPTIONS), any script that is both, and any registered command that resolves to a non-existent script — the check-registry partition guard.',
  requires: ['checkGovernance'],
  decide: (facts) => decideCheckRegistryComplete(facts),
  fixtures: {
    red: {
      name: 'a root script "orphan" that is neither registered nor exempt',
      context: factContext(RED_FACTS),
    },
    green: {
      name: 'a total + disjoint partition where every registered command resolves',
      context: factContext(GREEN_FACTS),
    },
    mutation: {
      describe:
        'A mutant that IGNORES the facts (returns no findings) reports NO uncovered script on the red fixture — the orphan is no longer flagged and the mutant is killed.',
      mutate: (gate: Gate): Gate => {
        const blind = (): readonly Finding[] => [];
        return { ...gate, decide: blind, run: (): readonly Finding[] => blind() };
      },
    },
  },
});
