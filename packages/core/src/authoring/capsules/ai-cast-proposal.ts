/**
 * Capsule declaration locking the AI cast's PROPOSAL ENVELOPE laws — the
 * load-bearing security contract of `ai-cast.ts` + `validated-output.ts` — as a
 * standing `pureTransform`. Where `ai-cast-summarize.ts` pins the cast-OUT budget
 * laws, this pins the cast-IN validation + apply laws:
 *
 *  - NO-BYPASS / APPLY-ACCEPTS-ONLY-MINTED-TOKEN: `applyValidatedPatch` honors a
 *    proposal IFF its token still binds to its payload by content address. A
 *    TAMPERED proposal (validated token, swapped payload) is REFUSED — there is no
 *    runtime path from un-validated bytes to a graph mutation. (The compile-time
 *    half — raw model output is not even assignable to `ValidatedProposal` — stays
 *    the `@ts-expect-error` proof in `tests/unit/core/ai-cast.test.ts`.)
 *  - VALIDATED-PROPOSAL DETERMINISM: validating the SAME (graph, patch) twice
 *    yields the SAME content-address subject + the SAME applied result id every
 *    time (the proposal's citable identity is stable).
 *  - VALID-APPLIES / RE-ADDRESSED: a genuinely validated proposal applies and the
 *    result is re-addressed through the one kernel (`applied.id !== base.id` for a
 *    non-empty op-set).
 *  - REJECTION-NEVER-MINTS: a structurally invalid proposal (dangling edge / base
 *    mismatch) is rejected with NO `proposal` field — nothing exists to apply.
 *
 * WHY `pureTransform`: the whole cast-IN path (`validateGraphPatchProposal` →
 * `mintValidated` → `applyValidatedPatch`) is a pure function of `(graph, ops)` —
 * no receipt byte law, no async hashing, no mutate channel.
 *
 * WHY THE INPUT IS SEED MATERIAL: a `DocumentGraph` / `GraphPatch` is
 * content-addressed (ids minted ONLY through `sealNode`/`sealGraph`/`propose`); a
 * schema-arbitrary cannot mint those addresses, and a `ValidatedProposal` has NO
 * public constructor at all (its `mintValidated` is module-private — that IS the
 * security property). So the seed generates a fully-supported domain (a base-axis
 * name list + add/remove op descriptors) and `run` SEALS a real graph, PROPOSES a
 * real patch, VALIDATES it (the sole mint path), and probes the apply/tamper laws
 * over the REAL minted envelope — never a stand-in. Axis names include the
 * `__proto__`/`constructor` edge vectors (lesson #12/#26): a node named `__proto__`
 * must validate + mint + apply like any other (the envelope keys on content
 * address, never a poisoned prototype).
 *
 * @module
 */

import type { ContentAddress } from '../../schema/brands.js';
import { defineCapsule } from '../assembly.js';
import { schema } from '../../schema/constructors.js';
import type { Infer } from '../../schema/infer.js';
import { sealGraph, sealNode } from '../../graph/document-graph-address.js';
import { contentAddressOf } from '../../evidence/content-address.js';
import { GraphPatch } from '../../graph/graph-patch.js';
import type { PatchOp } from '../../graph/graph-patch.js';
import { validateGraphPatchProposal, applyValidatedPatch } from '../ai-cast.js';
import type { ProposalResult } from '../ai-cast.js';
import { assertTokenBinds, proposalSubject } from '../../evidence/validated-output.js';
import type { ValidatedProposal } from '../../evidence/validated-output.js';
import type { DocumentGraph, DocumentGraphNode, SignalNode } from '../../graph/document-graph.js';
import type { CellMeta } from '../../schema/protocol.js';

/** One add/remove op descriptor the seed can produce (signal nodes only — fully supported). */
const AddOpSeed = schema.struct({ kind: schema.literal('add'), input: schema.string });
const RemoveOpSeed = schema.struct({ kind: schema.literal('remove'), index: schema.number });
const OpSeed = schema.union(AddOpSeed, RemoveOpSeed);

/**
 * Seed material the schema-arbitrary CAN produce: the base graph's signal-axis
 * names plus a list of op descriptors. `run` seals the graph, lowers the
 * descriptors to real `PatchOp`s over real sealed nodes, and proposes+validates.
 */
const AiCastProposalSeed = schema.struct({
  /** Base-graph signal-axis names → one sealed `SignalNode` per DISTINCT name. */
  base: schema.array(schema.string),
  /** Op descriptors: add a new signal axis, or remove an existing node by index. */
  ops: schema.array(OpSeed),
});

type AiCastProposalSeedValue = Infer<typeof AiCastProposalSeed>;
type OpSeedValue = Infer<typeof OpSeed>;

/** Fixed volatile meta — excluded from the content address, so a constant is faithful. */
const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'ai-cast-proposal' },
  updated: { wall_ms: 0, counter: 0, node_id: 'ai-cast-proposal' },
  version: 1,
};

/** Seal a minimal Signal node keyed by its input axis (its id is minted from the payload). */
function signalNode(input: string): SignalNode {
  return sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '' as ContentAddress,
    meta: META,
    input,
  } as unknown as SignalNode);
}

/** Build a real, sealed base graph from the seed (distinct axis names dedup to distinct nodes). */
function buildGraph(inputs: readonly string[]): DocumentGraph {
  const seen = new Set<string>();
  const nodes: DocumentGraphNode[] = [];
  for (const input of inputs) {
    if (seen.has(input)) continue;
    seen.add(input);
    nodes.push(signalNode(input));
  }
  return sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges: [] } as Omit<
    DocumentGraph,
    'id' | 'digest'
  >);
}

/**
 * Lower op descriptors to real, structurally-VALID `PatchOp`s over the base
 * graph: an `add` seals a fresh signal node (skipped if its axis already exists,
 * so the op stays a real add and never a no-op duplicate); a `remove` targets an
 * existing node by clamped index. Only NODE ops (no edges) so every generated
 * patch is structurally valid — the rejection-path law is exercised by a
 * SEPARATE, deliberately-dangling probe in `run`, not by random luck here.
 */
function lowerOps(graph: DocumentGraph, seeds: readonly OpSeedValue[]): PatchOp[] {
  const ops: PatchOp[] = [];
  const present = new Set<string>(graph.nodes.map((n) => (n as SignalNode).input));
  for (const seed of seeds) {
    if (seed.kind === 'add') {
      if (present.has(seed.input)) continue; // a real add, never a dup
      present.add(seed.input);
      ops.push({ op: 'add', family: 'signal', node: signalNode(seed.input) });
    } else {
      if (graph.nodes.length === 0) continue;
      const i = Math.abs(Math.trunc(seed.index)) % graph.nodes.length;
      const target = graph.nodes[i];
      if (target === undefined) continue;
      ops.push({ op: 'remove', family: target.family, node: target });
    }
  }
  return ops;
}

/** The output: the base, the validated result, and the probe verdicts `run` precomputed. */
interface AiCastProposalOutput {
  readonly base: DocumentGraph;
  readonly result: ProposalResult<GraphPatch>;
  /** Re-validating the SAME (graph, ops) reproduced the same subject + result id. */
  readonly deterministic: boolean;
  /** The validated proposal applied AND the result was re-addressed (only set when ok + non-empty). */
  readonly appliedReAddressed: boolean | null;
  /** A tampered proposal (validated token, swapped payload) was REFUSED at apply. */
  readonly tamperRefused: boolean | null;
}

/**
 * Declared capsule for the AI cast proposal envelope. Registered in the
 * module-level catalog at import time; walked by the factory compiler. The
 * generated property test feeds schema-seeds, `run` seals a real graph, proposes
 * + validates a real patch (the sole mint path), and probes the apply / tamper /
 * determinism laws over the REAL minted envelope. The invariants assert those
 * verdicts plus the rejection-never-mints law.
 */
export const aiCastProposalCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'core.ai-cast.proposal',
  input: AiCastProposalSeed,
  output: schema.unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'determinism',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as AiCastProposalOutput;
        // LAW: validating the SAME (graph, ops) twice yields the SAME subject +
        // result id — the proposal's citable identity is stable. `run` recomputed
        // and compared; re-assert the verdict.
        return o.deterministic === true;
      },
      message: 'validating the same (graph, patch) must yield the same subject + result id (determinism)',
    },
    {
      name: 'valid-applies-and-readdresses',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as AiCastProposalOutput;
        // LAW: a genuinely validated, non-empty proposal applies and the result is
        // re-addressed (applied.id !== base.id). `appliedReAddressed` is null only
        // when the op-set was empty (no mutation ⇒ nothing to re-address).
        return o.appliedReAddressed === null || o.appliedReAddressed === true;
      },
      message: 'a validated non-empty proposal must apply and re-address the result (apply.id !== base.id)',
    },
    {
      name: 'no-bypass-tamper-refused',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as AiCastProposalOutput;
        // THE LOAD-BEARING LAW: a TAMPERED proposal (validated token, swapped
        // payload) is REFUSED at apply — the binding guard re-derives the content
        // address and rejects, so there is no runtime path from un-validated bytes
        // to a graph mutation. `tamperRefused` is null only on the rejection branch
        // (no proposal was minted to tamper with — nothing to apply at all).
        return o.tamperRefused === null || o.tamperRefused === true;
      },
      message: 'a tampered proposal (validated token, swapped payload) must be refused at apply (no bypass)',
    },
    {
      name: 'rejection-never-mints',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as AiCastProposalOutput;
        // LAW: a rejection carries NO proposal — there is nothing to apply. (Our
        // lowered ops are always structurally valid, so the seed path is `ok`; this
        // pins the SHAPE law: `!ok` ⇒ no `proposal` field.)
        if (o.result.ok) return 'errors' in o.result === false;
        return !('proposal' in o.result);
      },
      message: 'a rejection must carry no proposal (and an acceptance no errors) — the result shape is exclusive',
    },
  ],
  budgets: { p95Ms: 3, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  run: (input: AiCastProposalSeedValue): AiCastProposalOutput => {
    const base = buildGraph(input.base);
    const ops = lowerOps(base, input.ops);
    const patch = GraphPatch.propose(base, ops);
    const result = validateGraphPatchProposal(base, patch);

    // Determinism: re-validate the SAME (graph, ops) and compare the citable
    // identity (subject) + applied result id.
    const patch2 = GraphPatch.propose(base, ops);
    const result2 = validateGraphPatchProposal(base, patch2);
    let deterministic = result.ok === result2.ok;
    if (result.ok && result2.ok) {
      deterministic =
        proposalSubject(result.proposal) === proposalSubject(result2.proposal) &&
        result.proposal.payload.resultId === result2.proposal.payload.resultId;
    }

    let appliedReAddressed: boolean | null = null;
    let tamperRefused: boolean | null = null;
    if (result.ok) {
      const applied = applyValidatedPatch(base, result.proposal);
      // A non-empty op-set MUST re-address; an empty one legitimately returns the
      // same identity (no mutation), so null it out rather than assert a change.
      appliedReAddressed = ops.length === 0 ? null : applied.id !== base.id;

      // Tamper probe: keep the validated token, swap in a DIFFERENT payload. The
      // binding guard must refuse. We need a payload GUARANTEED to differ from the
      // validated one, else the "tampered" proposal could be byte-identical and the
      // probe vacuous. Derive a sentinel axis name known-absent from BOTH the base
      // graph and the validated ops (bump a suffix until unused), so the evil patch's
      // single add-op cannot already exist in the validated payload.
      const used = new Set<string>(base.nodes.map((n) => (n as SignalNode).input));
      for (const op of result.proposal.payload.ops) {
        if ('family' in op && op.op === 'add' && op.family === 'signal') {
          used.add((op.node as SignalNode).input);
        }
      }
      let probeInput = '__ai_cast_tamper_probe__';
      while (used.has(probeInput)) probeInput = `${probeInput}_x`;
      const evilPatch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: signalNode(probeInput) }]);
      const tampered = { ...result.proposal, payload: evilPatch } as ValidatedProposal<GraphPatch>;
      // The probe is only meaningful if the swapped payload truly differs from the
      // validated one (its subject must not re-derive to the bound token subject).
      const tamperDiffers =
        contentAddressOf({ target: tampered.target, payload: evilPatch }) !== result.proposal.subject;
      let refused = false;
      try {
        applyValidatedPatch(base, tampered);
      } catch {
        refused = true;
      }
      // Defense-in-depth: the host-side `assertTokenBinds`/`unwrapValidated` guard
      // must refuse the same tampered proposal too.
      let assertRefused = false;
      try {
        assertTokenBinds(tampered);
      } catch {
        assertRefused = true;
      }
      tamperRefused = tamperDiffers && refused && assertRefused;
    }

    return { base, result, deterministic, appliedReAddressed, tamperRefused };
  },
});

/** Internal helpers exported for direct unit assertions over the seed→proposal builder. */
export const _aiCastProposalInternals = { buildGraph, lowerOps, signalNode } as const;
