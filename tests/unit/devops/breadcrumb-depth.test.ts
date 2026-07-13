/**
 * #142 — the sharded TypeDoc builder's flatten stage relocated pages up one
 * directory level without rewriting their breadcrumb `../`-depth, so links to the
 * shard-root `modules.md` / `README.md` over-climbed by one level and 404'd. This
 * pins the pure rewrite (`scripts/lib/breadcrumb-depth.ts`) the fix installs.
 *
 * The sharded builder stays experimental and unwired (`docs:build:sharded`, NOT
 * `docs:build`); this test only guards the rewrite it now performs.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { rewriteBreadcrumbDepth } from '../../../scripts/lib/breadcrumb-depth.js';

describe('rewriteBreadcrumbDepth — sheds exactly one level from ESCAPING links', () => {
  it('trims links that climb above the src subtree, leaving within-src links intact', () => {
    // A page 3 levels below src (…/namespaces/AnimatedQuantizer/type-aliases). In
    // the DOUBLED tree its breadcrumbs read: modules.md/README at 6 ups (escape),
    // the src-root README at 3 ups (within src).
    const doubled = [
      '[**LiteShip**](../../../../../../README.md)',
      '',
      '***',
      '',
      '[LiteShip](../../../../../../modules.md) / [quantizer/src](../../../README.md) / [AnimatedQuantizer](../README.md) / Shape',
    ].join('\n');

    const fixed = rewriteBreadcrumbDepth(doubled, 3, 1);

    // Escaping links lose one `../` (6 → 5), matching the monolith layout.
    expect(fixed).toContain('[**LiteShip**](../../../../../README.md)');
    expect(fixed).toContain('[LiteShip](../../../../../modules.md)');
    // Within-src links (== depthBelowSrc, and shallower) are untouched.
    expect(fixed).toContain('[quantizer/src](../../../README.md)');
    expect(fixed).toContain('[AnimatedQuantizer](../README.md)');
  });

  it('handles a page directly in src (depth 0): every escaping link sheds one level', () => {
    // src/README.md in the doubled tree points to modules.md at 3 ups; after the
    // collapse it should be 2 ups.
    const content = '[LiteShip](../../../modules.md) / [quantizer/src](./README.md)';
    const fixed = rewriteBreadcrumbDepth(content, 0, 1);
    expect(fixed).toContain('[LiteShip](../../modules.md)');
    expect(fixed).toContain('[quantizer/src](./README.md)'); // same-dir link untouched
  });

  it('never produces a negative depth and leaves non-climbing links alone', () => {
    const content = '[self](./Foo.md) and [child](sub/Bar.md) and [up](../modules.md)';
    // depthBelowSrc 0 ⇒ the single `../` escapes and is trimmed to zero.
    expect(rewriteBreadcrumbDepth(content, 0, 1)).toBe('[self](./Foo.md) and [child](sub/Bar.md) and [up](modules.md)');
  });

  it('is a no-op when nothing escapes the subtree', () => {
    const content = '[sibling](../Other.md) / [self](./README.md)';
    // A page 2 levels below src: a single `../` stays within src → unchanged.
    expect(rewriteBreadcrumbDepth(content, 2, 1)).toBe(content);
  });

  it('rejects a negative depth (a programming error, not a silent miscount)', () => {
    expect(() => rewriteBreadcrumbDepth('x', -1, 1)).toThrow(/depthBelowSrc/);
  });
});
