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

  test('assertTokenBinds enforces the private witness AND target consistency (runtime brand)', () => {
    const base = graph([node('a')]);
    const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
    const checked = AICast.validateGraphPatchProposal(base, patch);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    // An impostor token that is structurally shaped (right subject) but carries NO
    // private witness must be refused — the type forbids it, but the runtime gate
    // backs it up (a value cast past the type cannot sneak through apply).
    const witnessless = {
      ...checked.proposal,
      token: { subject: checked.proposal.subject, target: checked.proposal.target },
    } as unknown as ValidatedProposal<GraphPatch>;
    expect(() => assertTokenBinds(witnessless)).toThrow(/not validator-minted/);

    // A token whose `target` diverges from the proposal target is refused.
    const targetDiverged = {
      ...checked.proposal,
      token: { ...checked.proposal.token, target: 'generated-ui' },
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
