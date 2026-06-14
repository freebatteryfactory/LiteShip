/**
 * `@quantize` ARIA authoring — the nested `@aria { … }` segment parses into the
 * generalized per-state `castAttrs.aria` map and is mirrored onto the parallel
 * `ariaAttrs` field for existing consumers (D0 cast spine), reusing the existing
 * state-body parser.
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { parseQuantizeBlocks } from '@czap/vite';

const FILE = '/x.css';

describe('@quantize @aria authoring', () => {
  test('parses a nested @aria segment into ariaAttrs (quotes stripped)', () => {
    const css = `
@quantize disclosure {
  collapsed {
    max-height: 0;
    @aria {
      aria-expanded: "false";
      role: button;
    }
  }
  expanded {
    max-height: 999px;
    @aria {
      aria-expanded: "true";
    }
  }
}`;
    const blocks = parseQuantizeBlocks(css, FILE);
    expect(blocks).toHaveLength(1);
    // The `@aria` segment lands on the generalized `castAttrs.aria` map and is
    // mirrored onto the parallel `ariaAttrs` field (existing-consumer shim).
    expect(blocks[0]!.states['collapsed']).toEqual({
      bareProps: { 'max-height': '0' },
      rules: [],
      castAttrs: { aria: { 'aria-expanded': 'false', role: 'button' } },
      ariaAttrs: { 'aria-expanded': 'false', role: 'button' },
    });
    expect(blocks[0]!.states['expanded']!.castAttrs).toEqual({ aria: { 'aria-expanded': 'true' } });
    expect(blocks[0]!.states['expanded']!.ariaAttrs).toEqual({ 'aria-expanded': 'true' });
  });

  test('@aria coexists with nested selector rules in the same state', () => {
    const css = `
@quantize panel {
  open {
    color: red;
    .title { font-weight: bold; }
    @aria { aria-hidden: false; }
  }
}`;
    const blocks = parseQuantizeBlocks(css, FILE);
    const open = blocks[0]!.states['open']!;
    expect(open.bareProps).toEqual({ color: 'red' });
    expect(open.rules).toEqual([{ selector: '.title', props: { 'font-weight': 'bold' } }]);
    expect(open.ariaAttrs).toEqual({ 'aria-hidden': 'false' });
  });

  test('states with no @aria have no ariaAttrs field (shape stays minimal)', () => {
    const blocks = parseQuantizeBlocks('@quantize v { a { color: red; } }', FILE);
    expect(blocks[0]!.states['a']).toEqual({ bareProps: { color: 'red' }, rules: [] });
    expect(blocks[0]!.states['a']).not.toHaveProperty('castAttrs');
    expect(blocks[0]!.states['a']).not.toHaveProperty('ariaAttrs');
  });

  test('@glsl and @wgsl segments parse into castAttrs without deriving ariaAttrs', () => {
    const css = `
@quantize fx {
  off {
    @glsl { blur: 0.0; }
    @wgsl { blur_radius: 0.0; }
  }
}`;
    const blocks = parseQuantizeBlocks(css, FILE);
    const off = blocks[0]!.states['off']!;
    expect(off.castAttrs).toEqual({ glsl: { blur: '0.0' }, wgsl: { blur_radius: '0.0' } });
    // ariaAttrs is derived only from `@aria`; a glsl/wgsl-only state has none.
    expect(off).not.toHaveProperty('ariaAttrs');
  });
});
