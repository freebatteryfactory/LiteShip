/**
 * Compile-only laws and child census for `02_wires/`.
 *
 * Two subjects, one file. The umbrella's own laws are here for the reason root
 * states about itself — a fixture living in a declaration file becomes part of
 * that file's addressed public type surface — and the child census is here for
 * the sharper reason below.
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

import type {
  Assert,
  CaseOf,
  Equal,
  IsExactlyTrue,
  Named,
  NonEmptyTuple,
  TagOf,
  Tuple,
} from '../types.js';
import type { OperationId, OperationReference } from '../00_core/07_operation/types.js';
import type {
  WireAdmission,
  WireCaller,
  WireDefinition,
  WireExchange,
  WireExposure,
  WireRefusal,
} from './types.js';
import type { BrowserWireTypeSurface } from './browser/types.js';
import type { EditorWireTypeSurface } from './editor/types.js';
import type { CliWireTypeSurface } from './cli/types.js';
import type { DirectWireTypeSurface } from './direct/types.js';
import type { HttpWireTypeSurface } from './http/types.js';
import type { McpWireTypeSurface } from './mcp/types.js';

/** One child and the semantic surface its local `types.ts` declares. */
export interface WireTypeHome<Name extends string, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/**
 * The children this layer has.
 *
 * A topology rather than a bare name tuple, and the difference is load-bearing.
 * A roster written as `readonly ['direct']` claims a child exists and cannot
 * detect whether it does -- delete the child's `types.ts` and the umbrella still
 * compiles, still asserting one child. Naming the child's surface makes the
 * claim answerable by the compiler: the roster cannot outlive the thing it
 * names.
 *
 * Every named child exists. A name here is a promise the compiler checks, and
 * a name for an unwritten home is a promise nothing can keep — which is why
 * `editor` was absent from this tuple until its home was written.
 */
export type WireTypeTopology = Tuple<
  [
    WireTypeHome<'direct', DirectWireTypeSurface>,
    WireTypeHome<'http', HttpWireTypeSurface>,
    WireTypeHome<'browser', BrowserWireTypeSurface>,
    WireTypeHome<'cli', CliWireTypeSurface>,
    WireTypeHome<'mcp', McpWireTypeSurface>,
    WireTypeHome<'editor', EditorWireTypeSurface>,
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
        Equal<WireTypeAt<'editor'>, EditorWireTypeSurface>,
        Equal<WireChildName, 'direct' | 'http' | 'browser' | 'cli' | 'mcp' | 'editor'>,
      ],
      [true, true, true, true, true, true, true]
    >
  >
>;

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

type WireLawA = OperationId<'liteship.wire.law.op-a'>;

type WireLawB = OperationId<'liteship.wire.law.op-b'>;


/**
 * A refused crossing has no receipt; an undelivered one does.
 *
 * This is the central claim of the home. Line three is the one that matters
 * most in practice: if `undelivered` ever loses its receipt, the fact that the
 * operation ran becomes unrepresentable and every consumer that retries is
 * silently wrong.
 */
export type ARefusalHasNoReceiptAndAnUndeliveredAnswerDoes = Assert<
  Equal<
    [
      'receipt' extends keyof CaseOf<WireExchange, 'refused'> ? true : false,
      'receipt' extends keyof CaseOf<WireExchange, 'completed'> ? true : false,
      'receipt' extends keyof CaseOf<WireExchange, 'undelivered'> ? true : false,
      'invocation' extends keyof CaseOf<WireExchange, 'refused'> ? true : false,
      Equal<TagOf<WireExchange>, 'completed' | 'refused' | 'undelivered'>,
    ],
    [false, true, true, false, true]
  >
>;


/**
 * A wire failure channel is not an operation failure channel.
 *
 * `WireRefusal` has no arm carrying an operation outcome, and `WireExchange`
 * has no `error` arm. An operation that refused or failed arrives as
 * `completed` with a receipt saying so, because the crossing worked. Merging
 * the two is how a transport error becomes indistinguishable from a business
 * refusal.
 */
export type ARefusalIsNotAnOperationFailure = Assert<
  Equal<
    [
      Equal<TagOf<WireRefusal>, 'malformed' | 'unrecognized'>,
      'failed' extends TagOf<WireRefusal> ? true : false,
      'error' extends TagOf<WireExchange> ? true : false,
      'outcome' extends keyof CaseOf<WireExchange, 'refused'> ? true : false,
      Equal<CaseOf<WireRefusal, 'unrecognized'>['requested'], string>,
    ],
    [true, false, false, false, true]
  >
>;


/**
 * Admission and exchange are exact over the operation.
 *
 * The third and sixth lines are the anti-vacuity partners. Without them the
 * laws pass when the carriers drop the parameter, which is this repository's
 * signature defect and has now been committed often enough to be checked by
 * reflex.
 */
export type AWireIsExactOverTheOperationItProjects = Assert<
  Equal<
    [
      WireAdmission<unknown, WireLawA> extends WireAdmission<unknown, WireLawB> ? true : false,
      WireAdmission<unknown, WireLawA> extends WireAdmission<unknown, WireLawA> ? true : false,
      WireAdmission extends WireAdmission<unknown, WireLawA> ? true : false,
      WireExchange<unknown, never, WireLawA> extends WireExchange<unknown, never, WireLawB>
        ? true
        : false,
      WireExchange<unknown, never, WireLawA> extends WireExchange<unknown, never, WireLawA>
        ? true
        : false,
      WireExchange extends WireExchange<unknown, never, WireLawA> ? true : false,
    ],
    [false, true, false, false, true, false]
  >
>;


/**
 * A wire declares no operation semantics.
 *
 * Checked by name, because every one of these is a plausible-looking addition
 * that would move meaning across the boundary into the transport. A wire that
 * owns a handler is a second place where behaviour lives.
 */
export type AWireCarriesNoOperationSemantics = Assert<
  Equal<
    [
      'payload' extends keyof WireDefinition ? true : false,
      'context' extends keyof WireDefinition ? true : false,
      'hooks' extends keyof WireDefinition ? true : false,
      'handler' extends keyof WireDefinition ? true : false,
      'middleware' extends keyof WireDefinition ? true : false,
      'schema' extends keyof WireDefinition ? true : false,
    ],
    [false, false, false, false, false, false]
  >
>;


/**
 * Exposure states its complement, and the caller unlocks nothing.
 *
 * The last two lines are the dogfooding proof: neither the exposure nor the
 * admission type is parameterized by who is calling, so there is no shape in
 * which a system program travels a path an application cannot.
 */
export type ExposureIsStatedAndTheCallerIsNotPrivileged = Assert<
  Equal<
    [
      Equal<WireExposure['exposed'], NonEmptyTuple<OperationReference>>,
      Equal<WireExposure['withheld'], readonly OperationReference[]>,
      undefined extends WireExposure['withheld'] ? true : false,
      Equal<Exclude<keyof CaseOf<WireCaller, 'systemProgram'>, '_tag'>, never>,
      Equal<Exclude<keyof CaseOf<WireCaller, 'application'>, '_tag'>, never>,
    ],
    [true, true, false, true, true]
  >
>;
