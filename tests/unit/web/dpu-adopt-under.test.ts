// @vitest-environment jsdom
/**
 * DPU adopt-under — applyVerifiablePatch success reaches mutationClient.adopt (#120).
 *
 * @module
 */
import { describe, expect, test, afterEach } from 'vitest';
import {
  applyVerifiablePatchAndAdopt,
  stampVerifiablePatch,
  verifyVerifiablePatch,
  DPU_MARKER_ATTR,
} from '../../../packages/web/src/dpu/watch-and-prepare.js';
import type { ContentAddress, DocumentGraph } from '@czap/core';

function graphWithId(id: string): DocumentGraph {
  return {
    id: id as ContentAddress,
    version: 1,
    nodes: [],
    edges: [],
    meta: {},
  };
}

describe('applyVerifiablePatchAndAdopt (#120)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('applied patch adopts result graph and subsequent verify uses adopted base', () => {
    const base = graphWithId('fnv1a:base-graph');
    const result = graphWithId('fnv1a:result-graph');
    const adopted: DocumentGraph[] = [];

    const target = document.createElement('div');
    target.setAttribute(DPU_MARKER_ATTR, 'hero-slot');
    document.body.appendChild(target);

    const envelope = stampVerifiablePatch({
      marker: 'hero-slot',
      baseGraphId: base.id,
      resultGraphId: result.id,
      html: '<p>adopted</p>',
    });

    const outcome = applyVerifiablePatchAndAdopt(target, envelope, base.id, { adopt: (g) => adopted.push(g) }, result, {
      available: false,
      rung: 'floor-morph',
    });

    expect(outcome._tag).toBe('applied');
    expect(adopted).toHaveLength(1);
    expect(adopted[0]?.id).toBe(result.id);

    const followUp = stampVerifiablePatch({
      marker: 'hero-slot',
      baseGraphId: result.id,
      resultGraphId: 'fnv1a:next-graph' as ContentAddress,
      html: '<p>next</p>',
    });
    expect(verifyVerifiablePatch(followUp, result.id)._tag).toBe('verified');
  });

  test('refuses adopt when result graph id does not match envelope', () => {
    const base = graphWithId('fnv1a:base-graph');
    const result = graphWithId('fnv1a:result-graph');
    const wrong = graphWithId('fnv1a:wrong-graph');
    const adopted: DocumentGraph[] = [];

    const target = document.createElement('div');
    document.body.appendChild(target);

    const envelope = stampVerifiablePatch({
      marker: 'slot-a',
      baseGraphId: base.id,
      resultGraphId: result.id,
      html: '<span>x</span>',
    });

    const outcome = applyVerifiablePatchAndAdopt(target, envelope, base.id, { adopt: (g) => adopted.push(g) }, wrong, {
      available: false,
      rung: 'floor-morph',
    });

    expect(outcome._tag).toBe('refused');
    if (outcome._tag === 'refused') {
      expect(outcome.verification._tag).toBe('resultGraphMismatch');
    }
    expect(adopted).toHaveLength(0);
  });
});
