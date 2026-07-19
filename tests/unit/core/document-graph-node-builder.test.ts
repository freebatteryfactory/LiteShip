/**
 * DocumentGraph node from-parts builder (#112) — computes id via sealNode kernel.
 */
import { describe, expect, it } from 'vitest';
import { nodeFromParts, sealNode, contentAddressOf } from '@liteship/core';
import type { SignalNode, ComponentNode } from '@liteship/core';
import { META } from '../../helpers/graph-fixtures.js';

describe('nodeFromParts (#112)', () => {
  it('mints the same id as sealNode for signal nodes', () => {
    const parts = {
      _tag: 'DocGraphSignalNode' as const,
      _version: 1 as const,
      family: 'signal' as const,
      meta: META,
      input: 'viewport.width' as const,
    };
    const built = nodeFromParts<SignalNode>(parts);
    const sealed = sealNode({ ...parts, id: '' as never });
    expect(built.id).toBe(sealed.id);
    expect(built.id).toBe(
      contentAddressOf({
        _tag: 'DocGraphSignalNode',
        _version: 1,
        family: 'signal',
        input: 'viewport.width',
      }),
    );
  });

  it('recomputes id when payload changes (content-address, not a hand id)', () => {
    const a = nodeFromParts<SignalNode>({
      _tag: 'DocGraphSignalNode',
      _version: 1,
      family: 'signal',
      meta: META,
      input: 'viewport.width',
    });
    const b = nodeFromParts<SignalNode>({
      _tag: 'DocGraphSignalNode',
      _version: 1,
      family: 'signal',
      meta: META,
      input: 'viewport.height',
    });
    expect(a.id).not.toBe(b.id);
  });

  it('ignores a supplied placeholder id', () => {
    const forged = 'liteship:forged' as never;
    const built = nodeFromParts<ComponentNode>({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      meta: META,
      name: 'hero',
      id: forged,
    });
    const expected = contentAddressOf({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      name: 'hero',
    });
    expect(built.id).toBe(expected);
    expect(built.id).not.toBe(forged);
  });
});
