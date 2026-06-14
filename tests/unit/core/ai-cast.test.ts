/**
 * AI cast (PRIMITIVE) — the framework half of "AI": a DocumentGraph casts OUT to
 * a deterministic, content-addressed AIContext (model-facing prompt + GraphPatch
 * output schema + token-budgeted summary); the validators cast IN, minting a
 * ValidatedProposal envelope that the host-authorized apply step is the ONLY
 * consumer of.
 *
 * The three load-bearing properties this suite proves:
 *  1. NO apply-without-validate path (the security property). `applyValidatedPatch`
 *     accepts ONLY a validation-minted `ValidatedProposal`; a forged/unvalidated
 *     payload is unrepresentable (type) and rejected at the binding guard (runtime).
 *  2. AIContext + summary content-address DETERMINISM: same graph + same options
 *     ⇒ same `id`; a different graph/budget ⇒ a different `id`.
 *  3. The genui GeneratedUITree target rides the SAME envelope discipline as the
 *     GraphPatch target — one shared `ValidatedProposal`/apply-token shape.
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { AICast, GraphPatch, sealNode, sealGraph, contentAddressOf, assertTokenBinds, proposalSubject } from '@czap/core';
import type {
  SignalNode,
  DocumentGraphNode,
  DocumentGraphEdge,
  DocumentGraph as DocumentGraphType,
  CellMeta,
  ValidatedProposal,
  GeneratedUIValidator,
} from '@czap/core';
import { validateGeneratedUITree, defineComponentCatalog } from '@czap/genui';
import type { GeneratedUINode } from '@czap/genui';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

const node = (input: string): SignalNode =>
  sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '',
    meta: META,
    input,
  } as unknown as SignalNode);

const graph = (nodes: DocumentGraphNode[], edges: DocumentGraphEdge[] = []): DocumentGraphType =>
  sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges } as Omit<
    DocumentGraphType,
    'id' | 'digest'
  >);

// ---------------------------------------------------------------------------
// 1. THE SECURITY PROPERTY — no apply-without-validate path
// ---------------------------------------------------------------------------

describe('AI cast: no apply-without-validate path (the load-bearing rule)', () => {
  test('a validated patch proposal applies; the result is re-addressed', () => {
    const base = graph([node('a')]);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);

    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    // The ONLY consumer of apply is the validation-minted proposal.
    const next = AICast.applyValidatedPatch(base, checked.proposal);
    expect(next.id).not.toBe(base.id);
    expect(next.nodes.length).toBe(2);
  });

  test('applyValidatedPatch is UNCALLABLE with raw model output — only a ValidatedProposal types', () => {
    const base = graph([node('a')]);
    const rawModelOutput = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);

    // The patch is a plain value — it is NOT a ValidatedProposal. There is no
    // public constructor for ValidatedProposal (mintValidated is not exported),
    // so a host CANNOT fabricate one to feed apply. This line documents that the
    // type system rejects the bypass; @ts-expect-error proves it at compile time.
    // @ts-expect-error — raw GraphPatch is not a ValidatedProposal<GraphPatch>; bypass is unrepresentable.
    expect(() => AICast.applyValidatedPatch(base, rawModelOutput)).toBeTypeOf('function');
  });

  test('an INVALID patch (dangling edge) is rejected — no proposal is minted, so apply is impossible', () => {
    const base = graph([node('a')]);
    // An edge to a node that does not exist → dangling endpoint → validate fails.
    const danglingEdge: DocumentGraphEdge = { from: base.nodes[0]!.id, to: 'czap:nope' as never, type: 'seq' };
    const bad = GraphPatch.propose(base, [{ op: 'add', edge: danglingEdge }]);

    const checked = AICast.validateGraphPatchProposal(base, bad);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.target).toBe('graph-patch');
    expect(checked.errors.length).toBeGreaterThan(0);
    // No `proposal` field exists on a rejection — there is nothing to apply.
    expect('proposal' in checked).toBe(false);
  });

  test('a patch whose base mismatches the cast graph is rejected (proposal must apply to the shown graph)', () => {
    const base = graph([node('a')]);
    const other = graph([node('x')]);
    const patch = GraphPatch.propose(other, [{ op: 'add', family: 'signal', node: node('y') }]);

    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.errors.some((e) => e.includes('does not match'))).toBe(true);
  });

  test('the apply token BINDS to its payload — a swapped payload is refused at apply', () => {
    const base = graph([node('a')]);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    // Forge a tampered proposal: keep the validated token, swap in a DIFFERENT
    // payload (a remove-everything patch). The binding guard re-derives the
    // address and refuses.
    const evil = GraphPatch.propose(base, [{ op: 'remove', family: 'signal', node: base.nodes[0]! }]);
    const tampered = { ...checked.proposal, payload: evil } as ValidatedProposal<GraphPatch>;
    expect(() => AICast.applyValidatedPatch(base, tampered)).toThrow(/does not bind/);
    expect(() => assertTokenBinds(tampered)).toThrow(/does not bind/);
  });

  test('a validated proposal is refused against a DIFFERENT (advanced) graph — apply-time identity guard', () => {
    const base = graph([node('a')]);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    // The host validated against `base`, then the document graph ADVANCED to a
    // different graph. Applying the validated ops to the advanced graph is refused:
    // the proposal is bound to the graph it was validated against (payload.base).
    const advanced = graph([node('a'), node('z')]);
    expect(advanced.id).not.toBe(base.id);
    expect(() => AICast.applyValidatedPatch(advanced, checked.proposal)).toThrow(/graph advanced after validation/);
    // It still applies cleanly to the graph it WAS validated against.
    expect(() => AICast.applyValidatedPatch(base, checked.proposal)).not.toThrow();
  });

  test('a model-supplied resultId is RE-STAMPED, never trusted (forge/stale guard)', () => {
    const base = graph([node('a')]);
    // The honest patch + its deterministic result id (what `propose` computes).
    const honest = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
    expect(honest.resultId).toBeDefined();

    // A model forges a stale/wrong resultId on the SAME ops.
    const forged = { ...honest, resultId: 'czap:forged-stale-id' as never } as GraphPatch;
    const checked = AICast.validateGraphPatchProposal(base, forged);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    // The minted envelope carries the RECOMPUTED result id (== the honest one), not
    // the forged value — a host that cites/caches by resultId gets the right identity.
    expect(checked.proposal.payload.resultId).toBe(honest.resultId);
    expect(checked.proposal.payload.resultId).not.toBe('czap:forged-stale-id');
  });

  test('applyValidatedPatch verifies the PRIVATE WITNESS — a forged proposal with a correct subject but no witness is refused', () => {
    const base = graph([node('a')]);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    // Forge a proposal-shaped object: SAME payload + subject — so an ADDRESS-ONLY
    // guard would pass, since `contentAddressOf` is public and a caller can compute
    // the subject itself — but a hand-built token WITHOUT the module-private
    // `ApplyTokenWitness`. The provenance gate (assertTokenBinds) must refuse it: the
    // witness is the only unforgeable part of the envelope. (Before the gate routed
    // through assertTokenBinds, this address-only impostor would have applied.)
    const forgedToken = { subject: checked.proposal.subject, target: 'graph-patch' as const };
    const forged = { ...checked.proposal, token: forgedToken } as unknown as ValidatedProposal<GraphPatch>;
    expect(() => AICast.applyValidatedPatch(base, forged)).toThrow(/not validator-minted/);
  });

  test('a malformed EDGE op (off-schema discriminant) is REJECTED before minting — not silently applied as an add', () => {
    const base = graph([node('a'), node('b')]);
    const honest = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('c') }]);
    // Untrusted model JSON supplies an EDGE op with `op:'update'` — off-schema for
    // edges (only add/remove). `GraphPatch.apply` treats any non-'remove' edge op as
    // an add, so without the discriminant gate this would apply as an edge-add, pass
    // the structural preview, and MINT a validated edge from an off-schema op. The
    // gate refuses it before the preview, so it never mints.
    const malformed = {
      ...honest,
      ops: [{ op: 'update', edge: { from: base.nodes[0]!.id, to: base.nodes[1]!.id } }],
    } as unknown as GraphPatch;
    const checked = AICast.validateGraphPatchProposal(base, malformed);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.errors.join(' ')).toMatch(/discriminant/i);
  });

  test('a REFLECTION-FORGED token (witness symbol harvested off a real proposal) is still refused — authenticity is WeakSet identity, not a property brand', () => {
    const base = graph([node('a')]);
    const real = AICast.validateGraphPatchProposal(base, GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]));
    expect(real.ok).toBe(true);
    if (!real.ok) return;

    // Harvest the module-private witness symbol off the REAL token via reflection,
    // then build a NEW token object carrying that exact symbol plus a self-consistent
    // subject. An own-property-brand check would PASS (the symbol is present and the
    // subject matches); the WeakSet identity check refuses it because this fabricated
    // object was never minted here. This is the attack Codex flagged (P1).
    const witnessSym = Object.getOwnPropertySymbols(real.proposal.token)[0]!;
    const forgedToken = { [witnessSym]: true, subject: real.proposal.subject, target: 'graph-patch' as const };
    const forged = { ...real.proposal, token: forgedToken } as unknown as ValidatedProposal<GraphPatch>;
    expect(() => AICast.applyValidatedPatch(base, forged)).toThrow(/not validator-minted/);
    // The real proposal still applies (sanity — the gate isn't over-rejecting).
    expect(() => AICast.applyValidatedPatch(base, real.proposal)).not.toThrow();
  });

  test('a minted proposal and its token are FROZEN — the bound subject cannot be mutated in place', () => {
    const base = graph([node('a')]);
    const checked = AICast.validateGraphPatchProposal(base, GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]));
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(Object.isFrozen(checked.proposal.token)).toBe(true);
    expect(Object.isFrozen(checked.proposal)).toBe(true);
  });

  test('a forged node.id (≠ its content address) is RE-SEALED to its true address — a node cannot impersonate another', () => {
    const base = graph([node('a')]);
    const honestB = node('b'); // correctly sealed: id == content address of {input:'b', …}
    // The model claims node 'b''s payload but FORGES its id to be node 'a''s id (an
    // impersonation / content-address forgery). The validator re-seals it to the TRUE id.
    const forgedNode = { ...honestB, id: base.nodes[0]!.id } as typeof honestB;
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: forgedNode }]);
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    const mintedNode = checked.proposal.payload.ops.find((o): o is Extract<typeof o, { node: unknown }> => 'node' in o)?.node;
    expect(mintedNode?.id).toBe(honestB.id); // re-sealed to the true address
    expect(mintedNode?.id).not.toBe(base.nodes[0]!.id); // NOT the forged (impersonated) id
  });

  test('the validator is TOTAL on untrusted input — a malformed envelope is REJECTED, never thrown', () => {
    const base = graph([node('a')]);
    // Parsed model JSON with a matching tag but `ops` missing / not an array would
    // crash `patch.ops.forEach` — the validator must return a rejection instead.
    const noOps = { _tag: 'GraphPatch', _version: 1, base: base.id } as unknown as GraphPatch;
    let r: ReturnType<typeof AICast.validateGraphPatchProposal> | undefined;
    expect(() => {
      r = AICast.validateGraphPatchProposal(base, noOps);
    }).not.toThrow();
    expect(r?.ok).toBe(false);
    // A wholly non-object / non-envelope patch is also a clean rejection, not a crash.
    expect(() => AICast.validateGraphPatchProposal(base, null as unknown as GraphPatch)).not.toThrow();
    expect(AICast.validateGraphPatchProposal(base, 'nope' as unknown as GraphPatch).ok).toBe(false);
    expect(AICast.validateGraphPatchProposal(base, { _tag: 'GraphPatch', ops: 'no' } as unknown as GraphPatch).ok).toBe(false);
  });

  test('a proposed edge with an off-schema type is REJECTED before minting', () => {
    const a = node('a');
    const b = node('b');
    const base = graph([a, b]);
    // An edge between existing nodes but with a type outside the closed EdgeType set.
    // GraphPatch.validate only checks endpoints/cycles, so the cast-in path must gate it.
    const patch = {
      _tag: 'GraphPatch',
      _version: 1,
      base: base.id,
      ops: [{ op: 'add', edge: { from: a.id, to: b.id, type: 'foo' } }],
    } as unknown as GraphPatch;
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.errors.join(' ')).toMatch(/invalid type|seq\|par/i);
  });

  test('a node missing its family-required fields (incomplete transition) is REJECTED before minting', () => {
    const base = graph([node('a')]);
    // A transition node carrying only its family discriminant — no fromPose/toPose/routing.
    // sealNode would happily re-address it; the family/field gate rejects it.
    const incomplete = { _tag: 'DocGraphTransitionNode', _version: 1, family: 'transition', id: '', meta: META };
    const patch = {
      _tag: 'GraphPatch',
      _version: 1,
      base: base.id,
      ops: [{ op: 'add', family: 'transition', node: incomplete }],
    } as unknown as GraphPatch;
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.errors.join(' ')).toMatch(/does not conform|schema/i);
  });

  test("a node op whose op.family disagrees with the node's own family is REJECTED", () => {
    const base = graph([node('a')]);
    const sig = node('b'); // a real, complete 'signal' node
    const patch = {
      _tag: 'GraphPatch',
      _version: 1,
      base: base.id,
      ops: [{ op: 'add', family: 'pose', node: sig }], // op claims 'pose', node is 'signal'
    } as unknown as GraphPatch;
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.errors.join(' ')).toMatch(/does not match node.family/i);
  });

  test('a node missing the DocumentGraphNode base envelope (_tag/_version/id/meta) is REJECTED', () => {
    const base = graph([node('a')]);
    // `{ family:'signal', input:'x' }` has the family + a family field but NONE of the base
    // envelope. The schema requires the full NodeBase on every family, so it is rejected.
    const patch = {
      _tag: 'GraphPatch',
      _version: 1,
      base: base.id,
      ops: [{ op: 'add', family: 'signal', node: { family: 'signal', input: 'x' } }],
    } as unknown as GraphPatch;
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.errors.join(' ')).toMatch(/does not conform|schema/i);
  });

  test('policy and export node families are RECOGNIZED — not false-rejected as unknown family', () => {
    const base = graph([node('a')]);
    const policyNode = {
      _tag: 'DocGraphPolicyNode',
      _version: 1,
      family: 'policy',
      id: '',
      meta: META,
      appliesTo: [],
      requires: 'static',
      grants: 0,
      sites: ['node'],
    };
    const patch = {
      _tag: 'GraphPatch',
      _version: 1,
      base: base.id,
      ops: [{ op: 'add', family: 'policy', node: policyNode }],
    } as unknown as GraphPatch;
    const checked = AICast.validateGraphPatchProposal(base, patch);
    // It may pass, or fail structural validate for unrelated reasons — but it must NEVER
    // be rejected for "unknown family" (the round-6 6-family table missed policy/export).
    if (!checked.ok) expect(checked.errors.join(' ')).not.toMatch(/unknown family/i);
  });

  test('a node field of the WRONG TYPE (transition fromPose as a number) is REJECTED — presence is not enough', () => {
    const base = graph([node('a')]);
    const badTransition = {
      _tag: 'DocGraphTransitionNode',
      _version: 1,
      family: 'transition',
      id: '',
      meta: META,
      fromPose: 1, // should be a ContentAddress string
      toPose: 'x',
      routing: 'seq',
    };
    const patch = {
      _tag: 'GraphPatch',
      _version: 1,
      base: base.id,
      ops: [{ op: 'add', family: 'transition', node: badTransition }],
    } as unknown as GraphPatch;
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.errors.join(' ')).toMatch(/does not conform|schema/i);
  });

  test('a pose node missing its OTHER required fields (entityRef/bindings, not just state) is REJECTED', () => {
    const base = graph([node('a')]);
    // The family table must carry EVERY required field of each of the 8 families —
    // PoseNode requires entityRef + state + bindings, not just state.
    const partialPose = { _tag: 'DocGraphPoseNode', _version: 1, family: 'pose', id: '', meta: META, state: 'mobile' };
    const patch = {
      _tag: 'GraphPatch',
      _version: 1,
      base: base.id,
      ops: [{ op: 'add', family: 'pose', node: partialPose }],
    } as unknown as GraphPatch;
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.errors.join(' ')).toMatch(/does not conform|schema/i);
  });

  test('assertTokenBinds enforces the private witness AND target consistency (runtime brand)', () => {
    const base = graph([node('a')]);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    // An impostor token that is structurally shaped (right subject) but was not minted
    // here must be refused. Authenticity is WeakSet IDENTITY: any fabricated or copied
    // token object — even one carrying the (reflectable) witness symbol — is a non-member
    // and is rejected as "not validator-minted".
    const witnessless = {
      ...checked.proposal,
      token: { subject: checked.proposal.subject, target: checked.proposal.target },
    } as unknown as ValidatedProposal<GraphPatch>;
    expect(() => assertTokenBinds(witnessless)).toThrow(/not validator-minted/);

    // A proposal whose top-level `target` diverges from its (REAL, minted) token's
    // target is refused — keep the authentic registry-member token but mislabel the
    // proposal. (Reaches the target-consistency branch, which a copied token can't,
    // since a copy fails the identity gate first.)
    const targetDiverged = {
      ...checked.proposal,
      target: 'generated-ui',
      token: checked.proposal.token,
    } as unknown as ValidatedProposal<GraphPatch>;
    expect(() => assertTokenBinds(targetDiverged)).toThrow(/target mismatch/);
  });
});

// ---------------------------------------------------------------------------
// 2. DETERMINISM — content-addressed AIContext + summary
// ---------------------------------------------------------------------------

describe('AI cast: deterministic content-addressed context + summary', () => {
  test('same graph + same options ⇒ identical AIContext id (and identical summary)', () => {
    const g = graph([node('a'), node('b'), node('c')]);
    const c1 = AICast.castContext(g, { tokenBudget: 256 });
    const c2 = AICast.castContext(g, { tokenBudget: 256 });
    expect(c1.id).toBe(c2.id);
    expect(c1.summary).toEqual(c2.summary);
    // The id is the real content address of the payload (no hidden state).
    expect(c1.id).toBe(
      contentAddressOf({ base: g.id, summary: c1.summary, proposalSchemas: c1.proposalSchemas, systemPrompt: c1.systemPrompt }),
    );
  });

  test('a different graph ⇒ a different context id', () => {
    const a = AICast.castContext(graph([node('a')]), { tokenBudget: 256 });
    const b = AICast.castContext(graph([node('a'), node('b')]), { tokenBudget: 256 });
    expect(a.id).not.toBe(b.id);
  });

  test('a smaller token budget truncates the summary deterministically', () => {
    const g = graph(Array.from({ length: 40 }, (_, i) => node(`axis-${i}`)));
    const tight = AICast.summarizeGraph(g, 20);
    const loose = AICast.summarizeGraph(g, 100000);
    expect(tight.truncated).toBe(true);
    expect(loose.truncated).toBe(false);
    expect(tight.lines.length).toBeLessThan(loose.lines.length);
    // budget is honored: estimatedTokens never exceeds the budget.
    expect(tight.estimatedTokens).toBeLessThanOrEqual(20);
    // re-running is byte-identical.
    expect(AICast.summarizeGraph(g, 20)).toEqual(tight);
    // nodeCount always reports the true total even when truncated.
    expect(tight.nodeCount).toBe(40);
  });

  test('summary walks topological order (reuses linearizeGraph)', () => {
    const a = node('a');
    const b = node('b');
    const g = graph([b, a], [{ from: a.id, to: b.id, type: 'seq' }]);
    const summary = AICast.summarizeGraph(g, 10000);
    // a → b edge means a precedes b in the topo order regardless of authoring order.
    const ia = summary.lines.findIndex((l) => l.includes('input=a'));
    const ib = summary.lines.findIndex((l) => l.includes('input=b'));
    expect(ia).toBeGreaterThanOrEqual(0);
    expect(ib).toBeGreaterThan(ia);
  });
});

// ---------------------------------------------------------------------------
// 3. PROPOSAL-SCHEMA CLOSURE — cast-out schema == cast-in validated shape
// ---------------------------------------------------------------------------

describe('AI cast: proposal-schema closure', () => {
  test('the advertised GraphPatch schema pins base to the cast graph and names the validated shape', () => {
    const g = graph([node('a')]);
    const ctx = AICast.castContext(g);
    const patchSchema = ctx.proposalSchemas.find((s) => s.target === 'graph-patch');
    expect(patchSchema).toBeDefined();
    expect(patchSchema!.name).toBe('GraphPatch');
    const props = patchSchema!.jsonSchema['properties'] as Record<string, { const?: unknown }>;
    // base is pinned to the exact graph the model was shown — closure with validate's base check.
    expect(props['base']!.const).toBe(g.id);
    expect((props['_tag'] as { const?: unknown }).const).toBe('GraphPatch');
  });
});

// ---------------------------------------------------------------------------
// 4. GENUI UNIFICATION — same envelope, same token, one discipline
// ---------------------------------------------------------------------------

describe('AI cast: genui GeneratedUITree rides the SAME validated-proposal envelope', () => {
  const catalog = defineComponentCatalog({
    version: '1',
    components: {
      Card: { props: { title: { type: 'string', required: true } }, children: 'optional' },
      Text: { props: { value: { type: 'string', required: true } }, children: 'none' },
    },
  });

  test('castContext advertises a GeneratedUITree schema enumerating catalog components', () => {
    const g = graph([node('a')]);
    const ctx = AICast.castContext(g, { targets: ['graph-patch', 'generated-ui'], catalog });
    const uiSchema = ctx.proposalSchemas.find((s) => s.target === 'generated-ui');
    expect(uiSchema).toBeDefined();
    const nameEnum = (uiSchema!.jsonSchema['properties'] as Record<string, { enum?: string[] }>)['name']!.enum;
    expect(nameEnum).toEqual(['Card', 'Text']); // sorted catalog names
  });

  test('generated-ui target without a catalog is a hard error', () => {
    const g = graph([node('a')]);
    expect(() => AICast.castContext(g, { targets: ['generated-ui'] })).toThrow(/requires a host component catalog/);
  });

  test('the advertised graph-patch schema offers add/remove/update (update = logical replace, now real)', () => {
    const g = graph([node('a')]);
    const ctx = AICast.castContext(g, { targets: ['graph-patch'] });
    const gp = ctx.proposalSchemas.find((s) => s.target === 'graph-patch')!;
    const ops = (gp.jsonSchema['properties'] as Record<string, Record<string, unknown>>)['ops']!;
    const nodeOp = (ops['items'] as Record<string, unknown[]>)['oneOf']![0] as Record<string, Record<string, Record<string, unknown>>>;
    expect(nodeOp['properties']!['op']!['enum']).toEqual(['add', 'remove', 'update']);
  });

  test('a catalog shape change (same component NAMES, different props) changes the generated-ui context id', () => {
    const g = graph([node('a')]);
    const catA = defineComponentCatalog({
      version: '1',
      components: { Card: { props: { title: { type: 'string', required: true } }, children: 'optional' } },
    });
    const catB = defineComponentCatalog({
      version: '1',
      components: { Card: { props: { title: { type: 'string', required: false } }, children: 'optional' } },
    });
    const idA = AICast.castContext(g, { targets: ['generated-ui'], catalog: catA }).id;
    const idB = AICast.castContext(g, { targets: ['generated-ui'], catalog: catB }).id;
    // Names match ('Card'), but the catalog HASH differs (required-ness changed), so the
    // advertised schema — and the content-addressed context that embeds it — differ.
    expect(idA).not.toBe(idB);
  });

  // Bind the injected validator through an EXPLICITLY-TYPED constant rather than a
  // call-site `as GeneratedUIValidator` cast: a cast hides a signature drift at the
  // call site, whereas this annotation fails at definition time (tsconfig.tests.json
  // type-checks this file) the moment genui's `validateGeneratedUITree` stops
  // conforming to the cast's `GeneratedUIValidator` contract.
  const generatedUiValidator: GeneratedUIValidator = validateGeneratedUITree;

  test('a valid UI tree validates → mints a ValidatedProposal with the SAME envelope shape as a patch', () => {
    const validNode: GeneratedUINode = { name: 'Text', props: { value: 'hi' } };
    const ui = AICast.validateGeneratedUIProposal(validNode, catalog, generatedUiValidator);
    expect(ui.ok).toBe(true);
    if (!ui.ok) return;

    // SAME envelope: _tag, target, subject, and an unforgeable token bound to the payload.
    expect(ui.proposal._tag).toBe('ValidatedProposal');
    expect(ui.proposal.target).toBe('generated-ui');
    expect(proposalSubject(ui.proposal)).toBe(ui.proposal.subject);
    // The binding guard accepts a genuinely minted UI proposal (one shared discipline).
    expect(assertTokenBinds(ui.proposal)).toEqual(validNode);

    // The patch envelope and the UI envelope are structurally identical (one discipline).
    const base = graph([node('a')]);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
    const patchChecked = AICast.validateGraphPatchProposal(base, patch);
    expect(patchChecked.ok).toBe(true);
    if (!patchChecked.ok) return;
    expect(Object.keys(ui.proposal).sort()).toEqual(Object.keys(patchChecked.proposal).sort());
  });

  test('an invalid UI tree (unknown component) is rejected — no envelope minted', () => {
    const badNode: GeneratedUINode = { name: 'Nope', props: {} };
    const ui = AICast.validateGeneratedUIProposal(badNode, catalog, generatedUiValidator);
    expect(ui.ok).toBe(false);
    if (ui.ok) return;
    expect(ui.target).toBe('generated-ui');
    expect(ui.errors[0]).toMatch(/Unknown generated UI component/);
  });

  test('applyValidatedPatch refuses a (genuinely minted) GENERATED-UI proposal — the graph-patch apply step is target-gated', () => {
    const ui = AICast.validateGeneratedUIProposal({ name: 'Text', props: { value: 'hi' } }, catalog, generatedUiValidator);
    expect(ui.ok).toBe(true);
    if (!ui.ok) return;
    // The proposal is authentic for its OWN target, but its UI-tree payload must never
    // reach GraphPatch.apply — applyValidatedPatch pins target === 'graph-patch'.
    const base = graph([node('a')]);
    expect(() => AICast.applyValidatedPatch(base, ui.proposal as unknown as ValidatedProposal<GraphPatch>)).toThrow(
      /expected a 'graph-patch'/,
    );
  });

  test('a NESTED node with non-array children is rejected (recursive totality through the injected validator)', () => {
    // The root is well-formed, but a nested Card carries `children` as a plain object.
    // genui validateNode recurses, so the malformed nested children is caught (not
    // silently read as "no children").
    const tree = {
      name: 'Card',
      props: { title: 'root' },
      children: [{ name: 'Card', props: { title: 'nested' }, children: { bad: true } }],
    } as unknown as GeneratedUINode;
    const ui = AICast.validateGeneratedUIProposal(tree, catalog, generatedUiValidator);
    expect(ui.ok).toBe(false);
  });

  test('the generated-ui validator is TOTAL — malformed/parsed-JSON input is rejected, never thrown', () => {
    // null / non-object would deref `node.name` inside the injected validator.
    expect(() => AICast.validateGeneratedUIProposal(null as unknown as GeneratedUINode, catalog, generatedUiValidator)).not.toThrow();
    expect(AICast.validateGeneratedUIProposal(null as unknown as GeneratedUINode, catalog, generatedUiValidator).ok).toBe(false);
    // `children` as a non-array is a clean rejection, not a crash.
    const badShape = { name: 'Text', children: 'nope' } as unknown as GeneratedUINode;
    expect(AICast.validateGeneratedUIProposal(badShape, catalog, generatedUiValidator).ok).toBe(false);
  });

  test('a node op carrying a null node is REJECTED before re-stamping — the validator stays total', () => {
    const base = graph([node('a')]);
    // `node:null` passes the node-op discriminant but would crash `propose` deref'ing node.id.
    const patch = {
      _tag: 'GraphPatch',
      _version: 1,
      base: base.id,
      ops: [{ op: 'add', family: 'signal', node: null }],
    } as unknown as GraphPatch;
    let r: ReturnType<typeof AICast.validateGraphPatchProposal> | undefined;
    expect(() => {
      r = AICast.validateGraphPatchProposal(base, patch);
    }).not.toThrow();
    expect(r?.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. PURITY — the cast core imports zero network/provider/credential APIs
// ---------------------------------------------------------------------------

describe('AI cast: purity (== no producer)', () => {
  // RESOLVED (open question #6 — purity enforcement mechanism). The proper home
  // for "the AI-cast module imports no network/provider/credential API" is a real
  // `@czap/audit` POLICY (a declarative capability rule the audit engine walks).
  // That engine is not built yet, so until it lands we enforce purity HERE with a
  // robust import-grep over the actual source: it asserts neither ai-cast.ts nor
  // validated-output.ts imports a network transport (net/http/https/tls/ws/dns),
  // an HTTP client (undici/axios/node-fetch/got), `fetch(`/`EventSource`/`WebSocket`,
  // or any provider SDK (openai/anthropic/@anthropic/cohere/google-generativeai/
  // mistral/groq). When the audit engine lands, this graduates to a policy and the
  // grep can be deleted. We scan IMPORT/REQUIRE lines only so a forbidden substring
  // inside a doc-comment or string literal does not false-fail the law.
  test('LESSON (purity == no producer): ai-cast.ts + validated-output.ts import no network/provider/credential modules', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    // tests/unit/core → repo root is three up.
    const srcDir = resolve(here, '../../../packages/core/src');
    const forbidden =
      /\b(node:net|node:http|node:https|node:tls|node:dns|undici|axios|node-fetch|\bgot\b|ws|eventsource|websocket|openai|anthropic|@anthropic|cohere|google-generativeai|@google\/genai|mistralai|groq-sdk|fetch\(|EventSource|WebSocket)/i;
    for (const file of ['ai-cast.ts', 'validated-output.ts']) {
      const text = readFileSync(resolve(srcDir, file), 'utf8');
      // Cover ALL module-loading forms that can introduce a producer edge: static
      // `import`, `export … from`, dynamic `import()`, and `require()` — not just the
      // first two (a forbidden module smuggled in via `export {x} from 'undici'` or
      // `await import('axios')` would otherwise evade this gate).
      const moduleEdgeLines = text
        .split('\n')
        .filter(
          (l) =>
            /^\s*import\b/.test(l) ||
            /^\s*export\b[^;]*\bfrom\b/.test(l) ||
            /\brequire\s*\(/.test(l) ||
            /\bimport\s*\(/.test(l),
        );
      for (const line of moduleEdgeLines) {
        expect(line).not.toMatch(forbidden);
      }
    }
  });
});
