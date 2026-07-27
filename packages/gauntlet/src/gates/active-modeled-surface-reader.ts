/**
 * Gate: active-modeled-surface-has-reader — field-level orphan detection (#132).
 *
 * A live modeled surface whose load-bearing fields no interpreter/lowerer/runtime path
 * reads is an unfinished capability — dead data inside a live type (`TransitionNode`
 * with unread `routing`/`durationMs`). This FactGate folds the host-produced
 * {@link ActiveSurfaceFacts} and reports unread fields; it proves **wired, not correct**.
 *
 * LEAN BY CONSTRUCTION: no `typescript` import — the audit oracle produces facts;
 * this gate only decides. Earns blocking authority via red/green/mutation fixtures;
 * the live TransitionNode orphan reports as **advisory** until #130 lands the reader.
 *
 * @module
 */

import { defineFactGate, type FactBundle, type FactGate, type Gate, type GateContext } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { ActiveSurfaceEntry, ActiveSurfaceFacts, ActiveSurfacePromotion } from '../facts/active-surface-facts.js';

/** The gate id — namespaces every {@link Finding} it emits. */
const RULE_ID = 'gauntlet/active-modeled-surface-reader';

/** Build one finding for an active surface with unread load-bearing fields. */
function unreadFieldsFinding(entry: ActiveSurfaceEntry): Finding {
  const severity = entry.promotion === 'blocking' ? 'error' : 'advisory';
  const unread = entry.unreadFields.join(', ');
  const read = entry.readFields.length > 0 ? entry.readFields.join(', ') : '(none)';
  const readers = entry.readerFiles.join(', ');
  return finding({
    ruleId: RULE_ID,
    severity,
    level: 'L2',
    title: `Active surface '${entry.family}' has unread fields: ${unread}`,
    detail: `The '${entry.family}' node family is ACTIVE (live in the document graph) but ${entry.unreadFields.length} load-bearing field(s) — ${unread} — have NO read in the enrolled reader path(s) (${readers}). Fields read: ${read}. Required: ${entry.requiredFields.join(', ')}. This is field-level orphan detection (#132): a declaration without its consumer. Severity ${severity} (${entry.promotion}) — blocking when the interpreter lands (#130).`,
    location: { file: entry.readerFiles[0] ?? 'packages/core/src/graph/document-graph.ts', line: 1 },
    coverageClass: 'symbol-evidenced',
    remediation: {
      kind: 'instruction',
      description: 'Wire the reader — an active modeled surface must be completed by a projection.',
      steps: [
        `Implement or extend the '${entry.family}' interpreter/lowerer to READ ${unread}.`,
        'Derive obligations from the type union — do not hand-maintain a string symbol list.',
        'Re-run the active-surface oracle so the unread list clears.',
      ],
    },
  });
}

/**
 * THE DECISION — data in, findings out, NO context. One finding per active surface
 * with ≥1 unread required field; inactive or fully-read surfaces emit nothing.
 */
export function decideActiveSurfaceReaders(facts: FactBundle): readonly Finding[] {
  const pack = facts.activeSurfaceFacts;
  if (pack === undefined) return [];
  const findings: Finding[] = [];
  for (const entry of pack.surfaces) {
    if (!entry.active || entry.unreadFields.length === 0) continue;
    findings.push(unreadFieldsFinding(entry));
  }
  return findings;
}

// ── Fixtures (synthetic TransitionNode — born red, no motion symbols) ───────

function factContext(facts: ActiveSurfaceFacts): GateContext {
  return { ...memoryContext({}), activeSurfaceFacts: facts };
}

function surface(
  readFields: readonly string[],
  promotion: ActiveSurfacePromotion,
  unreadFields: readonly string[],
): ActiveSurfaceFacts {
  const required = ['fromPose', 'toPose', 'routing', 'durationMs'] as const;
  return Object.freeze({
    surfaces: Object.freeze([
      Object.freeze({
        family: 'transition',
        requiredFields: Object.freeze([...required]),
        readFields: Object.freeze([...readFields]),
        active: true,
        readerFiles: Object.freeze(['fixtures/transition-orphan.ts']),
        unreadFields: Object.freeze([...unreadFields]),
        promotion,
      }),
    ]),
  });
}

/** RED — active transition with routing/durationMs unread (synthetic orphan). */
const RED_FACTS = surface([], 'blocking', ['fromPose', 'toPose', 'routing', 'durationMs']);

/** GREEN — all four TransitionNode fields observed in a reader. */
const GREEN_FACTS = surface(['fromPose', 'toPose', 'routing', 'durationMs'], 'blocking', []);

/**
 * The active-modeled-surface-has-reader gate — #132 completeness backstop.
 * Self-proves via synthetic TransitionNode fixtures; live repo orphan is advisory.
 */
export const activeModeledSurfaceReaderGate: FactGate = defineFactGate({
  id: RULE_ID,
  level: 'L2',
  describe:
    'FactGate: declares it consumes ActiveSurfaceFacts and reports load-bearing fields on active modeled surfaces that no enrolled reader path reads (field-level orphan). TransitionNode is the first target; live orphan is advisory until #130.',
  requires: ['activeSurfaceFacts'],
  decide: (facts) => decideActiveSurfaceReaders(facts),
  fixtures: {
    red: {
      name: 'an active TransitionNode with no reader — all four fields unread',
      context: factContext(RED_FACTS),
    },
    green: {
      name: 'a TransitionNode whose reader reads fromPose, toPose, routing, and durationMs',
      context: factContext(GREEN_FACTS),
    },
    mutation: {
      describe:
        'A mutant that IGNORES ActiveSurfaceFacts (returns no findings) reports NO orphan on the red fixture — red is no longer flagged and the mutant is killed.',
      mutate: (gate: Gate): Gate => {
        const blind = (): readonly Finding[] => [];
        return {
          ...gate,
          decide: blind,
          run: (): readonly Finding[] => blind(),
        };
      },
    },
  },
});
