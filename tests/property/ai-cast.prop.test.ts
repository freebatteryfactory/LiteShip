/**
 * AI cast — property laws that don't fit the core `pureTransform` capsule shape.
 *
 * The summarizer + proposal-envelope laws live as core CAPSULES
 * (`core.ai-cast.summarize`, `core.ai-cast.proposal`) — generated property tests
 * over schema-seeds. This file holds the laws that need surfaces a core capsule
 * cannot reach without breaking the product boundary:
 *
 *  1. GENUI UNIFICATION (cross-package): the genui GeneratedUITree target rides
 *     the SAME `ValidatedProposal` envelope as the GraphPatch target — same
 *     `_tag`/`target`/`subject`/`token` shape, same un-bypassable apply seam
 *     (`unwrapValidated`/`assertTokenBinds`). A core capsule cannot import
 *     `@liteship/genui` (purity == no producer; no renderer edge), so the injected
 *     validator law is pinned HERE.
 *  2. castContext DETERMINISM + cross-target sensitivity over a generated domain.
 *  3. The `__proto__`/`constructor` adversarial vectors (lesson #12/#26): an
 *     author-controlled axis name / component name / prop key named `__proto__`
 *     must flow through cast-OUT + cast-IN like any other — the envelope keys on
 *     content address, never a poisoned prototype.
 *
 * Per the testing-philosophy directive: pin the LAW, not the implementation; do
 * NOT pin the fast-check seed (a green seed would HIDE a real counterexample).
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  AICast,
  GraphPatch,
  sealNode,
  sealGraph,
  assertTokenBinds,
  unwrapValidated,
  proposalSubject,
  proposalReceiptSubject,
} from '@liteship/core';
import type {
  SignalNode,
  DocumentGraphNode,
  DocumentGraph as DocumentGraphType,
  CellMeta,
  GeneratedUIValidator,
} from '@liteship/core';
import { validateGeneratedUITree, defineComponentCatalog } from '@liteship/genui';
import type { GeneratedUINode } from '@liteship/genui';

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'ai-cast-prop' },
  updated: { wall_ms: 0, counter: 0, node_id: 'ai-cast-prop' },
  version: 1,
};

// The injected genui validator, bound through an EXPLICITLY-TYPED constant rather
// than a call-site `as GeneratedUIValidator` cast: a cast hides a signature drift
// at the call site, whereas this annotation fails at definition time the moment
// genui's `validateGeneratedUITree` stops conforming to the cast contract.
const generatedUiValidator: GeneratedUIValidator = validateGeneratedUITree;

const node = (input: string): SignalNode =>
  sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '',
    meta: META,
    input,
  } as unknown as SignalNode);

const graphOf = (inputs: readonly string[]): DocumentGraphType => {
  // Dedup by axis name (content-address dedup is the law) using a null-proto set
  // so an author axis named `__proto__`/`constructor` cannot corrupt the dedup
  // (lesson #12/#26 — every author-keyed map is null-proto).
  const seen = Object.create(null) as Record<string, true>;
  const nodes: DocumentGraphNode[] = [];
  for (const input of inputs) {
    if (seen[input]) continue;
    seen[input] = true;
    nodes.push(node(input));
  }
  return sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: META, nodes, edges: [] } as Omit<
    DocumentGraphType,
    'id' | 'digest'
  >);
};

/** Axis-name domain INCLUDING the prototype-poison edge vectors. */
const axisName = fc.oneof(
  fc.string({ maxLength: 8 }),
  fc.constantFrom('__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty'),
);

// ---------------------------------------------------------------------------
// 1. castContext determinism + cross-target sensitivity (generated domain)
// ---------------------------------------------------------------------------

describe('AI cast property: castContext is deterministic + content-addressed', () => {
  test('LAW: same (graph, options) ⇒ identical AIContext id, over a random graph domain', () => {
    fc.assert(
      fc.property(fc.array(axisName, { maxLength: 12 }), fc.integer({ min: 0, max: 4096 }), (inputs, budget) => {
        const g = graphOf(inputs);
        const c1 = AICast.castContext(g, { tokenBudget: budget });
        const c2 = AICast.castContext(g, { tokenBudget: budget });
        // Identity is the real content address — no hidden state, machine-stable.
        expect(c1.id).toBe(c2.id);
        expect(c1.summary).toEqual(c2.summary);
      }),
    );
  });

  test('LAW: a graph with a `__proto__`-named axis casts + summarizes without prototype corruption', () => {
    const g = graphOf(['__proto__', 'constructor', 'a']);
    const ctx = AICast.castContext(g, { tokenBudget: 4096 });
    // All three distinct axes survive as distinct nodes; none vanished into the
    // prototype chain, and the summary mentions each.
    expect(ctx.summary.nodeCount).toBe(3);
    expect(ctx.summary.lines.length).toBe(3);
    expect(ctx.summary.lines.some((l) => l.includes('input=__proto__'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. The graph-patch envelope law over a generated op domain (no-bypass)
// ---------------------------------------------------------------------------

describe('AI cast property: the validated-proposal envelope is un-bypassable', () => {
  test('LAW: a validated patch applies + re-addresses; the receipt subject is its content address', () => {
    fc.assert(
      fc.property(fc.array(axisName, { minLength: 1, maxLength: 8 }), axisName, (baseInputs, newAxis) => {
        const base = graphOf(baseInputs);
        // Skip a no-op add (the axis already present) — keep the op a real mutation.
        fc.pre(!base.nodes.some((n) => (n as SignalNode).input === newAxis));
        const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node(newAxis) }]);
        const checked = AICast.validateGraphPatchProposal(base, patch);
        expect(checked.ok).toBe(true);
        if (!checked.ok) return;
        const next = AICast.applyValidatedPatch(base, checked.proposal);
        expect(next.id).not.toBe(base.id);
        // The citable subject IS the proposal's content address, and the derived
        // receipt subject is the `{ type:'artifact', id }` a host chains on.
        expect(proposalSubject(checked.proposal)).toBe(checked.proposal.subject);
        expect(proposalReceiptSubject(checked.proposal)).toEqual({ type: 'artifact', id: checked.proposal.subject });
      }),
    );
  });

  test('LAW: a tampered proposal (validated token, swapped payload) is refused at apply', () => {
    fc.assert(
      fc.property(fc.array(axisName, { minLength: 1, maxLength: 6 }), (baseInputs) => {
        const base = graphOf(baseInputs);
        const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('legit-add') }]);
        const checked = AICast.validateGraphPatchProposal(base, patch);
        if (!checked.ok) return;
        const evil = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('evil-swap') }]);
        const tampered = { ...checked.proposal, payload: evil };
        expect(() => AICast.applyValidatedPatch(base, tampered as typeof checked.proposal)).toThrow(/does not bind/);
        expect(() => assertTokenBinds(tampered as typeof checked.proposal)).toThrow(/does not bind/);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// 3. GENUI UNIFICATION — the GeneratedUITree target rides the SAME envelope
// ---------------------------------------------------------------------------

describe('AI cast property: genui GeneratedUITree rides the SAME validated-proposal envelope', () => {
  // A catalog whose component names INCLUDE prototype-poison vectors — the
  // advertised schema + validator must handle them as ordinary names.
  const catalog = defineComponentCatalog({
    version: '1',
    components: {
      Card: { props: { title: { type: 'string', required: true } }, children: 'optional' },
      Text: { props: { value: { type: 'string', required: true } }, children: 'none' },
    },
  });

  test('LAW: a valid UI tree mints the SAME envelope SHAPE as a graph-patch proposal', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 16 }), (value) => {
        const validNode: GeneratedUINode = { name: 'Text', props: { value } };
        const ui = AICast.validateGeneratedUIProposal(validNode, catalog, generatedUiValidator);
        expect(ui.ok).toBe(true);
        if (!ui.ok) return;
        // Same envelope: _tag/target/subject + an unforgeable token that binds.
        expect(ui.proposal._tag).toBe('ValidatedProposal');
        expect(ui.proposal.target).toBe('generated-ui');
        expect(proposalSubject(ui.proposal)).toBe(ui.proposal.subject);
        // The generated-UI apply SEAM (open question #1): `unwrapValidated` hands
        // back the validated tree (for the host's OWN renderer) — the SAME binding
        // guard the patch target's apply runs, generalized to any target.
        expect(unwrapValidated(ui.proposal)).toEqual(validNode);

        // The patch envelope and the UI envelope are STRUCTURALLY identical — one
        // discipline, one shared `ValidatedProposal` shape.
        const base = graphOf(['a']);
        const patch = GraphPatch.propose(base, [{ op: 'add', family: 'signal', node: node('b') }]);
        const patchChecked = AICast.validateGraphPatchProposal(base, patch);
        expect(patchChecked.ok).toBe(true);
        if (!patchChecked.ok) return;
        expect(Object.keys(ui.proposal).sort()).toEqual(Object.keys(patchChecked.proposal).sort());
      }),
    );
  });

  test('LAW: an unknown component is rejected — no envelope minted, nothing reaches a renderer', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 12 }).filter((s) => s !== 'Card' && s !== 'Text'),
        (badName) => {
          const badNode: GeneratedUINode = { name: badName, props: {} };
          const ui = AICast.validateGeneratedUIProposal(
            badNode,
            catalog,
            generatedUiValidator,
          );
          expect(ui.ok).toBe(false);
          if (ui.ok) return;
          // No `proposal` field on a rejection — there is nothing to unwrap/render.
          expect('proposal' in ui).toBe(false);
          expect(ui.target).toBe('generated-ui');
        },
      ),
    );
  });

  test('LAW: a tampered UI proposal (swapped tree) is refused at the unwrap seam', () => {
    const okNode: GeneratedUINode = { name: 'Text', props: { value: 'hi' } };
    const ui = AICast.validateGeneratedUIProposal(okNode, catalog, generatedUiValidator);
    expect(ui.ok).toBe(true);
    if (!ui.ok) return;
    const swapped: GeneratedUINode = { name: 'Card', props: { title: 'evil' } };
    const tampered = { ...ui.proposal, payload: swapped };
    // The genui target has NO framework apply — the host's seam IS unwrapValidated;
    // it must refuse a post-validation swap exactly as the patch apply does.
    expect(() => unwrapValidated(tampered as typeof ui.proposal)).toThrow(/does not bind/);
  });
});
