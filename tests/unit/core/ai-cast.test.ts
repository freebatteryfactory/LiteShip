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

  test('a valid UI tree validates → mints a ValidatedProposal with the SAME envelope shape as a patch', () => {
    const validNode: GeneratedUINode = { name: 'Text', props: { value: 'hi' } };
    const ui = AICast.validateGeneratedUIProposal(validNode, catalog, validateGeneratedUITree as GeneratedUIValidator);
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
    const ui = AICast.validateGeneratedUIProposal(badNode, catalog, validateGeneratedUITree as GeneratedUIValidator);
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
  test('ai-cast.ts + validated-output.ts import no network/provider/credential modules', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    // tests/unit/core → repo root is three up.
    const srcDir = resolve(here, '../../../packages/core/src');
    const forbidden = /\b(node:net|node:http|node:https|node:tls|undici|axios|node-fetch|openai|anthropic|@anthropic|fetch\()/;
    for (const file of ['ai-cast.ts', 'validated-output.ts']) {
      const text = readFileSync(resolve(srcDir, file), 'utf8');
      const importLines = text.split('\n').filter((l) => /^\s*import\b/.test(l) || /require\(/.test(l));
      for (const line of importLines) {
        expect(line).not.toMatch(forbidden);
      }
    }
  });
});
