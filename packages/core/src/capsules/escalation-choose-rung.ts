/**
 * Capsule declaration locking {@link chooseRung} — the escalation chooser, the
 * READER of {@link PolicyNode} — as a standing `policyGate` contract. This is the
 * FIRST concrete `policyGate` instance (ADR-0008's closure rule requires one):
 * `chooseRung` is the canonical permission/authz check in LiteShip — it admits
 * (`allow`) or rejects (`deny`) a capability RUNG for a policy on a runtime site,
 * with a reason naming WHY. The arm ADR-0008 reserved for "permission / authz
 * check" finally has the decision it was reserved for.
 *
 * WHY `policyGate` (not `pureTransform`): a policyGate's job is to resolve a
 * verdict — `allow`/`deny` + a reason chain — against a typed subject. That is
 * exactly `chooseRung`: a `{policy, site}` subject in, a verdict out. Filing it as
 * a `pureTransform` (the prior classification) only described what it ISN'T (no
 * receipt byte law, no mutate channel); `policyGate` describes what it IS. The
 * `decide` core stays PURE and TOTAL (the same determinism discipline a
 * `pureTransform` `run` holds), so the harness can drive allow/deny coverage,
 * reason-chain integrity, and determinism for real. A policyGate returns a
 * verdict; it never enforces it — the side-effecting admission (refusing the
 * projection target) lives downstream in the compositor escalation gate
 * (`compositor.ts`), per ADR-0014 "no built-in authority".
 *
 * WHY THE SUBJECT IS SEED MATERIAL (not a raw `PolicyNode`): a `PolicyNode` is a
 * content-addressed graph node — its `id` is minted ONLY through `sealNode` over
 * its payload, and `chooseRung` keys its memo on that `id`. A schema-arbitrary
 * cannot mint that address, so the SUBJECT schema generates a fully-supported seed
 * (the policy's `requires`/`grants`/`sites`/`budgets` fields plus the runtime
 * site to decide on), and `decide` SEALS a real `PolicyNode` from it before calling
 * the chooser. The invariants then assert over the REAL chooser verdict, never a
 * weakened stand-in. To keep determinism honest under the shared memo, `decide`
 * resets the memo per call (the memo is a process-global cache, not part of the
 * value-level contract under test).
 *
 * @module
 */

import type { ContentAddress } from '../brands.js';
import { defineCapsule } from '../assembly.js';
import { S } from '../schema/index.js';
import type { Infer } from '../schema/index.js';
import type { Decision } from '../capsule.js';
import { sealNode } from '../document-graph-address.js';
import { Cap } from '../caps.js';
import type { PolicyNode } from '../document-graph.js';
import type { CellMeta } from '../protocol.js';
import { chooseRung, rungTargets, _resetEscalationMemo } from '../escalation.js';
import type { EscalationResult, RungChoice } from '../escalation.js';

/** The five rungs, as a schema literal union the arbitrary fully supports. */
const CapTierSchema = S.union(
  S.literal('static'),
  S.literal('styled'),
  S.literal('reactive'),
  S.literal('animated'),
  S.literal('gpu'),
);

/** The four runtime sites, as a schema literal union. */
const RuntimeSiteSchema = S.union(S.literal('node'), S.literal('browser'), S.literal('worker'), S.literal('edge'));

/** Optional allocation class — the only budget axis with a categorical floor. */
const AllocClassSchema = S.union(S.literal('zero'), S.literal('bounded'), S.literal('unbounded'));

/**
 * Seed material the schema-arbitrary CAN produce: the policy's capability /
 * constraint fields plus the runtime site the chooser decides on. `decide` seals a
 * real {@link PolicyNode} from this and calls `chooseRung`. This IS the policyGate
 * SUBJECT — the typed thing the verdict is resolved against.
 */
const EscalationSubject = S.struct({
  /** The required {@link CapTier} — the rung ceiling the chooser starts at and only DOWNGRADES from. */
  requires: CapTierSchema,
  /** The granted rungs — a rung the chooser would pick must be granted here. */
  grants: S.array(CapTierSchema),
  /** The runtime sites the policy admits. */
  sites: S.array(RuntimeSiteSchema),
  /** The site the chooser decides on — may or may not be in `sites` (the deny path). */
  site: RuntimeSiteSchema,
  /** Optional p95 latency budget (ms) — below a rung's floor forces a downgrade. */
  p95Ms: S.optional(S.number),
  /** Optional working-set budget (MB) — below a rung's floor forces a downgrade. */
  memoryMb: S.optional(S.number),
  /** Optional allocation class — `'zero'` forbids the heap-hungry `gpu` rung. */
  allocClass: S.optional(AllocClassSchema),
});

type EscalationSubjectValue = Infer<typeof EscalationSubject>;

/**
 * The verdict schema — the {@link Decision} shape the policyGate harness decodes
 * each verdict against. `output` IS this schema, so the reason-chain check
 * round-trips every verdict through it (the policyGate analogue of the receipt
 * byte law).
 */
const ReasonSchema = S.struct({
  code: S.string,
  message: S.string,
});
const DecisionSchema = S.struct({
  effect: S.union(S.literal('allow'), S.literal('deny')),
  reasons: S.array(ReasonSchema),
});

/** Fixed volatile meta — excluded from the content address, so a constant is faithful. */
const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'escalation-choose-rung' },
  updated: { wall_ms: 0, counter: 0, node_id: 'escalation-choose-rung' },
  version: 1,
};

/** Build the budgets sub-record from the subject, omitting unspecified axes (so they stay `undefined`). */
function buildBudgets(subject: EscalationSubjectValue): PolicyNode['budgets'] {
  if (subject.p95Ms === undefined && subject.memoryMb === undefined && subject.allocClass === undefined) {
    return undefined;
  }
  return {
    ...(subject.p95Ms !== undefined ? { p95Ms: subject.p95Ms } : {}),
    ...(subject.memoryMb !== undefined ? { memoryMb: subject.memoryMb } : {}),
    ...(subject.allocClass !== undefined ? { allocClass: subject.allocClass } : {}),
  };
}

/** Seal a real, content-addressed {@link PolicyNode} from a subject (its `id` is minted from the payload). */
function buildPolicy(subject: EscalationSubjectValue): PolicyNode {
  return sealNode({
    _tag: 'DocGraphPolicyNode',
    _version: 1,
    family: 'policy',
    id: '' as ContentAddress,
    meta: META,
    // No content-addressed applies-to targets in the subject: `[]` is faithful (the
    // chooser never reads `appliesTo`; it gates on requires/grants/sites/budgets).
    appliesTo: [],
    requires: subject.requires,
    grants: Cap.from(subject.grants),
    sites: subject.sites,
    budgets: buildBudgets(subject),
  } as PolicyNode);
}

/** Narrow an {@link EscalationResult} to the success branch. */
function isChoice(r: EscalationResult): r is RungChoice {
  return !('error' in r);
}

/**
 * Classify a deny `EscalationResult` into a stable, machine-readable reason
 * `code`. The site gate is the only branch the chooser distinguishes by message
 * ("does not admit runtime site"); every other unsatisfiability collapses to "no
 * rung admits". The `message` is the REAL chooser error string verbatim — never a
 * fabricated reason.
 */
function denyCode(error: string): string {
  return error.includes('does not admit runtime site') ? 'site-not-admitted' : 'no-rung-admits';
}

/**
 * The pure verdict core: seal a real policy from the subject, run the chooser, and
 * map its result to a {@link Decision}. The reason chain justifies a REJECTION:
 * an `allow` is a bare admission with an EMPTY chain (there is nothing to refuse);
 * a `deny` carries exactly one reason whose `message` is the REAL chooser error
 * string verbatim — never a fabricated reason. This keeps the policyGate law
 * crisp: `reasons` is non-empty EXACTLY when the verdict is `deny`.
 *
 * PURE + TOTAL: every well-formed subject yields exactly one verdict, no throw.
 * The memo is reset per call so the value-level determinism law is proved cold,
 * not via a warm-cache hit.
 */
function decideEscalation(subject: EscalationSubjectValue): Decision {
  // Reset the process-global memo so each decision starts cold — the value-level
  // contract under test is the chooser, not the cache's warm/cold state.
  _resetEscalationMemo();
  const policy = buildPolicy(subject);
  const result = chooseRung(policy, subject.site);
  if (isChoice(result)) {
    // Admission carries no rejection reason — the chosen rung + its targets are
    // the chooser's OUTPUT (read by the compositor escalation gate), not a reason
    // to refuse anything. An allow's reason chain is empty.
    return { effect: 'allow', reasons: [] };
  }
  return {
    effect: 'deny',
    reasons: [{ code: denyCode(result.error), message: result.error }],
  };
}

/**
 * Declared policyGate capsule for the escalation chooser. Registered in the
 * module-level catalog at import time; walked by the factory compiler. The
 * generated traversal samples subjects from {@link EscalationSubject}, drives the
 * REAL `decide` (which seals a real policy and calls `chooseRung`), and the
 * invariants assert the minimal-downgrade / site-gate / verdict-shape laws over
 * the REAL verdict.
 */
export const escalationChooseRungCapsule = defineCapsule({
  _kind: 'policyGate',
  name: 'core.escalation.choose-rung',
  input: EscalationSubject,
  output: DecisionSchema,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'deny-iff-nonempty-reasons',
      check: (_subject: unknown, verdict: unknown): boolean => {
        const v = verdict as Decision;
        // LAW: the reason chain justifies a REJECTION — a deny names why (non-empty
        // chain, no silent denial), an allow is a bare admission (empty chain). The
        // chain is non-empty EXACTLY when the verdict is `deny`.
        return (v.effect === 'deny') === v.reasons.length > 0;
      },
      message: 'reason chain is non-empty exactly when the verdict is deny',
    },
    {
      name: 'site-gate-forces-deny',
      check: (subject: unknown, verdict: unknown): boolean => {
        const s = subject as EscalationSubjectValue;
        const v = verdict as Decision;
        // LAW: a site the policy does not admit is unsatisfiable — the verdict MUST
        // be `deny` with the `site-not-admitted` reason. (The converse — every
        // admitted site is allowed — is NOT a law: grants/budgets can still force
        // deny, so we only pin one direction.)
        if (!s.sites.includes(s.site)) {
          return v.effect === 'deny' && v.reasons.some((r) => r.code === 'site-not-admitted');
        }
        return true;
      },
      message: 'a site not in policy.sites must yield a deny with the site-not-admitted reason',
    },
    {
      name: 'allow-rung-never-escalates-above-requires',
      check: (subject: unknown, verdict: unknown): boolean => {
        const s = subject as EscalationSubjectValue;
        const v = verdict as Decision;
        // LAW: the chooser only DOWNGRADES. On an `allow`, the admitted rung sits at
        // or below the policy's `requires`. We re-run the chooser to read the rung
        // (the chooser is the source of truth) and assert the ordinal bound.
        if (v.effect !== 'allow') return true;
        _resetEscalationMemo();
        const result = chooseRung(buildPolicy(s), s.site);
        return isChoice(result) && Cap.ordinal(result.rung) <= Cap.ordinal(s.requires);
      },
      message: 'an admitted rung must be at or below policy.requires (the chooser only downgrades)',
    },
    {
      name: 'allow-targets-subset-of-rung-targets',
      check: (subject: unknown, verdict: unknown): boolean => {
        const s = subject as EscalationSubjectValue;
        const v = verdict as Decision;
        // LAW: on an `allow`, the chooser's admitted targets are a subset of the
        // chosen rung's own table — the verdict never invents a target the rung
        // does not gate.
        if (v.effect !== 'allow') return true;
        _resetEscalationMemo();
        const result = chooseRung(buildPolicy(s), s.site);
        if (!isChoice(result)) return false;
        const table = rungTargets(result.rung);
        for (const t of result.admittedTargets) {
          if (!table.has(t as never)) return false;
        }
        return true;
      },
      message: 'admitted targets must be a subset of RUNG_TARGETS[rung]',
    },
  ],
  budgets: { p95Ms: 0.2, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  decide: decideEscalation,
});

/** Internal helpers exported for direct unit assertions over the subject→policy builder and verdict core. */
export const _escalationChooseRungInternals = {
  buildPolicy,
  buildBudgets,
  isChoice,
  denyCode,
  decideEscalation,
} as const;
