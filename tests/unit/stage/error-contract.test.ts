/** @liteship/stage error contract */
import { describe, it, expect } from 'vitest';
import { sealNode, sealGraph, CanonicalCbor, AddressedDigest, projectionKeys, HLC } from '@liteship/core';
import type { ComponentNode, ProjectionNode, ContentAddress, CellMeta } from '@liteship/core';
import { exportAstroPage } from '@liteship/stage';

const ts = HLC.increment(HLC.create('test'), 1);
const meta: CellMeta = { created: ts, updated: ts, version: 1 };

describe('@liteship/stage error contract', () => {
  it('exportAstroPage on a component without states/thresholds names the boundary guard', () => {
    const emptyComponent = sealNode<ComponentNode>({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      id: '' as ContentAddress,
      meta,
      name: 'empty',
      states: [],
      thresholds: [],
    });
    const projection = sealNode<ProjectionNode>({
      _tag: 'DocGraphProjectionNode',
      _version: 1,
      family: 'projection',
      id: '' as ContentAddress,
      meta,
      target: 'css',
      sourceRef: emptyComponent.id,
      keys: projectionKeys('empty'),
      resultDigest: AddressedDigest.of(CanonicalCbor.encode({ target: 'css', name: 'empty' })),
    });
    const graph = sealGraph({
      _tag: 'DocumentGraph',
      _version: 1,
      meta,
      nodes: [emptyComponent, projection],
      edges: [],
    });
    expect(() => exportAstroPage(graph)).toThrow(/no states\/thresholds/);
  });
});
