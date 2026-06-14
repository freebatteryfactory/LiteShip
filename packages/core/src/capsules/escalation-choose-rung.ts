/**
 * Capsule declaration locking {@link chooseRung} — the escalation chooser, the
 * READER of {@link PolicyNode} — as a standing `pureTransform` contract. Where
 * `graph-patch-identity.ts` proves the structural differ inverts itself, this
 * pins the chooser's MINIMAL-DOWNGRADE law: the rung it returns never escalates
 * ABOVE `requires`, only as far down as budgets/grants force, and the targets it
 * admits are a fresh, scoped copy — never a shared reference to the memoized
 * `RUNG_TARGETS` const (the memoization scar `compute` defends against).
 *
 * WHY `pureTransform`: `chooseRung` is a pure function of `(policy, site)` — no
 * receipt byte law, no async hashing, no mutate channel. The chooser's memo is an
 * internal cache keyed by the policy's content address + site; it is a pure
 * function up to that cache, so the determinism law (same seed → same result) is
 * exactly what the pure-transform harness's property test fits.
 *
 * WHY THE INPUT IS SEED MATERIAL (not a raw `PolicyNode`): a `PolicyNode` is a
 * content-addressed graph node — its `id` is minted ONLY through `sealNode` over
 * its payload, and `chooseRung` keys its memo on that `id`. A schema-arbitrary
 * cannot mint that address, so the input schema generates a fully-supported seed
 * (the policy's `requires`/`grants`/`sites`/`budgets` fields plus the runtime
 * site to choose on), and `run` SEALS a real `PolicyNode` from it before calling
 * the chooser. The invariants then assert over the REAL chooser verdict, never a
 * weakened stand-in. To keep determinism honest under the shared memo, `run`
 * resets the memo per call (the memo is a process-global cache, not part of the
 * value-level contract under test).
 *
 * @module
 */

import { Schema } from 'effect';
import type { ContentAddress } from '../brands.js';
import { defineCapsule } from '../assembly.js';
import { sealNode } from '../document-graph-address.js';
import { Cap } from '../caps.js';
import type { PolicyNode, RuntimeSite } from '../document-graph.js';
import type { CellMeta } from '../protocol.js';
import {
  chooseRung,
  RUNG_TARGETS,
  _resetEscalationMemo,
} from '../escalation.js';
import type { EscalationResult, RungChoice } from '../escalation.js';

/** The five rungs, as a schema literal union the arbitrary fully supports. */
const CapLevelSchema = Schema.Union([
  Schema.Literal('static'),
  Schema.Literal('styled'),
  Schema.Literal('reactive'),
  Schema.Literal('animated'),
  Schema.Literal('gpu'),
]);

/** The four runtime sites, as a schema literal union. */
const RuntimeSiteSchema = Schema.Union([
  Schema.Literal('node'),
  Schema.Literal('browser'),
  Schema.Literal('worker'),
  Schema.Literal('edge'),
]);

/** Optional allocation class — the only budget axis with a categorical floor. */
const AllocClassSchema = Schema.Union([
  Schema.Literal('zero'),
  Schema.Literal('bounded'),
  Schema.Literal('unbounded'),
]);

/**
 * Seed material the schema-arbitrary CAN produce: the policy's capability /
 * constraint fields plus the runtime site the chooser reads on. `run` seals a
 * real {@link PolicyNode} from this and calls `chooseRung`.
 */
const EscalationSeed = Schema.Struct({
  /** The required {@link CapLevel} — the rung ceiling the chooser starts at and only DOWNGRADES from. */
  requires: CapLevelSchema,
  /** The granted rungs — a rung the chooser would pick must be granted here. */
  grants: Schema.Array(CapLevelSchema),
  /** The runtime sites the policy admits. */
  sites: Schema.Array(RuntimeSiteSchema),
  /** The site the chooser reads on — may or may not be in `sites` (the unsat path). */
  site: RuntimeSiteSchema,
  /** Optional p95 latency budget (ms) — below a rung's floor forces a downgrade. */
  p95Ms: Schema.optional(Schema.Number),
  /** Optional working-set budget (MB) — below a rung's floor forces a downgrade. */
  memoryMb: Schema.optional(Schema.Number),
  /** Optional allocation class — `'zero'` forbids the heap-hungry `gpu` rung. */
  allocClass: Schema.optional(AllocClassSchema),
});

type EscalationSeedValue = Schema.Schema.Type<typeof EscalationSeed>;

/** Fixed volatile meta — excluded from the content address, so a constant is faithful. */
const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'escalation-choose-rung' },
  updated: { wall_ms: 0, counter: 0, node_id: 'escalation-choose-rung' },
  version: 1,
};

/** Build the budgets sub-record from the seed, omitting unspecified axes (so they stay `undefined`). */
function buildBudgets(seed: EscalationSeedValue): PolicyNode['budgets'] {
  if (seed.p95Ms === undefined && seed.memoryMb === undefined && seed.allocClass === undefined) {
    return undefined;
  }
  return {
    ...(seed.p95Ms !== undefined ? { p95Ms: seed.p95Ms } : {}),
    ...(seed.memoryMb !== undefined ? { memoryMb: seed.memoryMb } : {}),
    ...(seed.allocClass !== undefined ? { allocClass: seed.allocClass } : {}),
  };
}

/** Seal a real, content-addressed {@link PolicyNode} from a seed (its `id` is minted from the payload). */
function buildPolicy(seed: EscalationSeedValue): PolicyNode {
  return sealNode({
    _tag: 'DocGraphPolicyNode',
    _version: 1,
    family: 'policy',
    id: '' as ContentAddress,
    meta: META,
    // No content-addressed applies-to targets in the seed: `[]` is faithful (the
    // chooser never reads `appliesTo`; it gates on requires/grants/sites/budgets).
    appliesTo: [],
    requires: seed.requires,
    grants: Cap.from(seed.grants),
    sites: seed.sites,
    budgets: buildBudgets(seed),
  } as PolicyNode);
}

/** The output: the sealed policy, the site chosen on, and the chooser verdict. */
interface EscalationOutput {
  readonly policy: PolicyNode;
  readonly site: RuntimeSite;
  readonly result: EscalationResult;
}

/** Narrow an {@link EscalationResult} to the success branch. */
function isChoice(r: EscalationResult): r is RungChoice {
  return !('error' in r);
}

/**
 * Declared capsule for the escalation chooser. Registered in the module-level
 * catalog at import time; walked by the factory compiler. The generated property
 * test feeds schema-seeds, `run` seals a real policy and calls `chooseRung`, and
 * the invariants assert the minimal-downgrade / site-gate / determinism / fresh-Set
 * laws over the REAL verdict.
 */
export const escalationChooseRungCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'core.escalation.choose-rung',
  input: EscalationSeed,
  output: Schema.Unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'never-escalates-above-requires',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as EscalationOutput;
        // LAW: the chooser only DOWNGRADES. On success the chosen rung sits at or
        // below `policy.requires` on the `Cap.ordinal` ladder — it never climbs
        // above what the policy required.
        if (!isChoice(o.result)) return true; // error branch: nothing to assert here
        return Cap.ordinal(o.result.rung) <= Cap.ordinal(o.policy.requires);
      },
      message: 'chosen rung must be at or below policy.requires (the chooser only downgrades, never escalates)',
    },
    {
      name: 'admitted-subset-of-rung-targets',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as EscalationOutput;
        // LAW: the admitted targets are a subset of the chosen rung's own table.
        if (!isChoice(o.result)) return true;
        const table = RUNG_TARGETS[o.result.rung];
        for (const t of o.result.admittedTargets) {
          if (!table.has(t as never)) return false;
        }
        return true;
      },
      message: 'admittedTargets must be a subset of RUNG_TARGETS[rung]',
    },
    {
      name: 'site-gate-forces-error',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as EscalationOutput;
        // LAW: a site the policy does not admit is unsatisfiable — the result MUST
        // be the `{error}` branch. (The converse — every admitted site succeeds —
        // is NOT a law: grants/budgets can still force unsat, so we only pin one
        // direction.)
        if (!o.policy.sites.includes(o.site)) {
          return !isChoice(o.result);
        }
        return true;
      },
      message: 'a site not in policy.sites must yield the {error} branch (the site gate is total)',
    },
    {
      name: 'determinism',
      check: (input: unknown, output: unknown): boolean => {
        const o = output as EscalationOutput;
        const seed = input as EscalationSeedValue;
        // LAW: same seed → same verdict. Re-run from a COLD memo (reset first) so
        // this proves the chooser's value-level determinism, not just a memo hit.
        _resetEscalationMemo();
        const policy2 = buildPolicy(seed);
        const result2 = chooseRung(policy2, seed.site);
        return deepEqualsResult(o.result, result2);
      },
      message: 'same seed must yield the same chooser verdict (determinism, cold-memo)',
    },
    {
      name: 'admitted-targets-fresh-set',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as EscalationOutput;
        // LAW (the memoization scar): the returned admittedTargets is a FRESH Set,
        // never a shared reference to the memoized `RUNG_TARGETS[rung]` const. A
        // caller mutating the result must not corrupt the const or the memo.
        if (!isChoice(o.result)) return true;
        const table = RUNG_TARGETS[o.result.rung];
        // Reference identity: a fresh copy is a DIFFERENT object than the shared const.
        return (o.result.admittedTargets as unknown) !== (table as unknown);
      },
      message: 'admittedTargets must be a fresh Set, not a reference to the shared RUNG_TARGETS const',
    },
  ],
  budgets: { p95Ms: 0.2, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  run: (input: EscalationSeedValue): EscalationOutput => {
    // Reset the process-global memo so each run starts cold — the value-level
    // contract under test is the chooser, not the cache's warm/cold state.
    _resetEscalationMemo();
    const policy = buildPolicy(input);
    const result = chooseRung(policy, input.site);
    return { policy, site: input.site, result };
  },
});

/** Structural equality over an {@link EscalationResult} (error string OR rung+targets multiset). */
function deepEqualsResult(a: EscalationResult, b: EscalationResult): boolean {
  const aChoice = isChoice(a);
  const bChoice = isChoice(b);
  if (aChoice !== bChoice) return false;
  if (!aChoice || !bChoice) {
    return (a as { error: string }).error === (b as { error: string }).error;
  }
  if (a.rung !== b.rung) return false;
  if (a.admittedTargets.size !== b.admittedTargets.size) return false;
  for (const t of a.admittedTargets) if (!b.admittedTargets.has(t)) return false;
  return true;
}

/** Internal helpers exported for direct unit assertions over the seed→policy builder. */
export const _escalationChooseRungInternals = { buildPolicy, buildBudgets, deepEqualsResult, isChoice } as const;
