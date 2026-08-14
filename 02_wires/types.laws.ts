/**
 * Compile-only child census for `02_wires/`.
 *
 * `types.ts` owns the shared wire vocabulary -- `WireExchange`, `WireRefusal`,
 * and the exposure and admission grammar -- and `direct/` imports it. So the
 * umbrella cannot import `direct/` back to check anything about it, and for the
 * whole life of the wires layer it did:
 *
 *     02_wires/direct/types.ts -> 02_wires/types.ts -> 02_wires/direct/types.ts
 *
 * That was introduced deliberately, with a comment explaining that importing the
 * child's surface is what stops a roster outliving the child it names. The
 * property is real and the reasoning was sound. What went unpriced is that the
 * same file supplies the child, and a supplier cannot also be an inspector of
 * what it supplies.
 *
 * `system/types.ts` performs the identical import and is not the same case: it
 * owns topology and nothing else, and no system child imports it, so nothing
 * flows back. The distinguishing property is not "parent" but "owns vocabulary
 * the children consume". This file separates the two roles that were fused.
 *
 * It emits no JavaScript, exports no value, is imported by nobody, and
 * participates in no Type ABI surface. It may therefore import both the
 * umbrella and its children.
 *
 * @module
 */

import type { Named, Tuple } from '../types.js';
import type { DirectWireTypeSurface } from './direct/types.js';

/** One child and the semantic surface its local `types.ts` declares. */
export interface WireTypeHome<Name extends string, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/**
 * The children this layer currently has: one, and this one.
 *
 * A topology rather than a bare name tuple, and the difference is load-bearing.
 * A roster written as `readonly ['direct']` claims a child exists and cannot
 * detect whether it does -- delete the child's `types.ts` and the umbrella still
 * compiles, still asserting one child. Naming the child's surface makes the
 * claim answerable by the compiler: the roster cannot outlive the thing it
 * names.
 *
 * `http`, `browser`, `cli`, `mcp`, and `editor` are planned and absent. They are
 * not listed, because a name here is a promise the compiler checks and a name
 * for an unwritten home is a promise nothing can keep.
 */
export type WireTypeTopology = Tuple<[WireTypeHome<'direct', DirectWireTypeSurface>]>;

/** The child names, derived from the topology. */
export type WireChildName = WireTypeTopology[number]['name'];

/** Select one child surface by its name. */
export type WireTypeAt<Name extends WireChildName> = Extract<
  WireTypeTopology[number],
  { readonly name: Name }
>['Type'];
