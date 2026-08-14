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

import type { Assert, Equal, IsExactlyTrue, Named, Tuple } from '../types.js';
import type { BrowserWireTypeSurface } from './browser/types.js';
import type { CliWireTypeSurface } from './cli/types.js';
import type { DirectWireTypeSurface } from './direct/types.js';
import type { HttpWireTypeSurface } from './http/types.js';
import type { McpWireTypeSurface } from './mcp/types.js';

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
 * `editor` is planned and absent, and is not listed: a name here is a promise
 * the compiler checks, and a name for an unwritten home is a promise nothing can
 * keep. The other four arrived, so they are named.
 */
export type WireTypeTopology = Tuple<
  [
    WireTypeHome<'direct', DirectWireTypeSurface>,
    WireTypeHome<'http', HttpWireTypeSurface>,
    WireTypeHome<'browser', BrowserWireTypeSurface>,
    WireTypeHome<'cli', CliWireTypeSurface>,
    WireTypeHome<'mcp', McpWireTypeSurface>,
  ]
>;

/** The child names, derived from the topology. */
export type WireChildName = WireTypeTopology[number]['name'];

/** Select one child surface by its name. */
export type WireTypeAt<Name extends WireChildName> = Extract<
  WireTypeTopology[number],
  { readonly name: Name }
>['Type'];

/**
 * Compile-time law: every entry names its own child's surface.
 *
 * Naming the surface is what gives the roster teeth, and a canary showed the
 * teeth were half there. Deleting a child breaks the import, so the roster
 * genuinely cannot outlive the thing it names — but pointing `http` at
 * `DirectWireTypeSurface` compiled, and the only thing that noticed was
 * `noUnusedLocals` complaining about an import nobody read.
 *
 * A mis-wired roster is the more likely defect of the two. A child is deleted
 * deliberately and loudly; an entry is copy-pasted and edited in one of its two
 * positions, quietly, while adding the next one.
 *
 * The right-hand side is written independently of the topology, so this is a
 * comparison rather than a restatement. The last line pins the population, so an
 * entry added here and nowhere else fails rather than passing unexamined.
 */
export type EachEntryNamesItsOwnChildsSurface = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<WireTypeAt<'direct'>, DirectWireTypeSurface>,
        Equal<WireTypeAt<'http'>, HttpWireTypeSurface>,
        Equal<WireTypeAt<'browser'>, BrowserWireTypeSurface>,
        Equal<WireTypeAt<'cli'>, CliWireTypeSurface>,
        Equal<WireTypeAt<'mcp'>, McpWireTypeSurface>,
        Equal<WireChildName, 'direct' | 'http' | 'browser' | 'cli' | 'mcp'>,
      ],
      [true, true, true, true, true, true]
    >
  >
>;
