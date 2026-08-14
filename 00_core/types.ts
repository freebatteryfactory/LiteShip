/**
 * LiteShip core type topology.
 *
 * This file is the broad semantic map for the complete realm-neutral core. It
 * does not re-export every declaration or become an implementation import hub.
 * Each numbered home owns its own `types.ts`; this file names those homes,
 * records their additive order, and makes the complete topology inspectable.
 *
 * Implementations import exact types from their owner. Downstream assurance may
 * inspect this topology as one core ABI surface.
 *
 * @module
 */

import type { Assert, Equal, IsExactlyTrue, Named, Tuple } from '../types.js';
import type { ErrorTypeSurface } from './00_error/types.js';
import type { EncodingTypeSurface } from './01_encoding/types.js';
import type { IdentityTypeSurface } from './02_identity/types.js';
import type { SchemaTypeSurface } from './03_schema/types.js';
import type { TimeTypeSurface } from './04_time/types.js';
import type { LifecycleTypeSurface } from './05_lifecycle/types.js';
import type { EvidenceTypeSurface } from './06_evidence/types.js';
import type { OperationTypeSurface } from './07_operation/types.js';
import type { StateTypeSurface } from './08_state/types.js';
import type { QuantizationTypeSurface } from './09_quantization/types.js';
import type { CollectionTypeSurface } from './10_collection/types.js';
import type { SceneTypeSurface } from './11_scene/types.js';
import type { MediaTypeSurface } from './12_media/types.js';
import type { StreamTypeSurface } from './13_stream/types.js';
import type { CompilerTypeSurface } from './14_compiler/types.js';
import type { ProgramTypeSurface } from './15_program/types.js';
import type { RuntimeTypeSurface } from './16_runtime/types.js';
import type { EditorTypeSurface } from './17_editor/types.js';
import type { InspectionTypeSurface } from './18_inspection/types.js';

/** One owner and the semantic surface its local `types.ts` declares. */
export interface CoreTypeHome<Name extends string, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/** Complete inspectable core type waterfall. */
export type CoreTypeTopology = Tuple<[
  CoreTypeHome<'00_error', ErrorTypeSurface>,
  CoreTypeHome<'01_encoding', EncodingTypeSurface>,
  CoreTypeHome<'02_identity', IdentityTypeSurface>,
  CoreTypeHome<'03_schema', SchemaTypeSurface>,
  CoreTypeHome<'04_time', TimeTypeSurface>,
  CoreTypeHome<'05_lifecycle', LifecycleTypeSurface>,
  CoreTypeHome<'06_evidence', EvidenceTypeSurface>,
  CoreTypeHome<'07_operation', OperationTypeSurface>,
  CoreTypeHome<'08_state', StateTypeSurface>,
  CoreTypeHome<'09_quantization', QuantizationTypeSurface>,
  CoreTypeHome<'10_collection', CollectionTypeSurface>,
  CoreTypeHome<'11_scene', SceneTypeSurface>,
  CoreTypeHome<'12_media', MediaTypeSurface>,
  CoreTypeHome<'13_stream', StreamTypeSurface>,
  CoreTypeHome<'14_compiler', CompilerTypeSurface>,
  CoreTypeHome<'15_program', ProgramTypeSurface>,
  CoreTypeHome<'16_runtime', RuntimeTypeSurface>,
  CoreTypeHome<'17_editor', EditorTypeSurface>,
  CoreTypeHome<'18_inspection', InspectionTypeSurface>
]>;

/**
 * Stable source-home names in additive dependency order.
 *
 * Derived from the topology, never written beside it. A hand-written union and
 * a hand-written tuple are one fact twice, and this file had no law comparing
 * them — nineteen names in each, checked by nothing.
 */
export type CoreHomeName = CoreTypeTopology[number]['name'];

/** Select one owner surface by its source-home name. */
export type CoreTypeAt<Name extends CoreHomeName> = Extract<CoreTypeTopology[number], { readonly name: Name }>['Type'];

// ---------------------------------------------------------------------------
// Law
// ---------------------------------------------------------------------------

/**
 * Compile-time law: every entry names its own home's surface.
 *
 * This file had no assertions at all — nineteen homes, the largest topology in
 * the repository, and nothing holding an entry to the surface it names. The
 * same defect was found by canary in the wire topology and again in the system
 * topology, fixed in both, and narrated at length in both. It was never applied
 * here, which is to say the lesson was written down four times and applied to
 * the two smallest cases.
 *
 * Deleting a home breaks the import and is loud. The likelier defect is quiet:
 * an entry copy-pasted and edited in one of its two positions while the next
 * one is being added, which compiles, and which only `noUnusedLocals` notices
 * and only if the displaced import goes unread.
 *
 * The right-hand side is written independently of the topology, so this
 * compares rather than restates. The last line pins the population, so a home
 * added to the tuple and nowhere else fails here rather than passing
 * unexamined.
 */
export type EachCoreEntryNamesItsOwnHomesSurface = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CoreTypeAt<'00_error'>, ErrorTypeSurface>,
        Equal<CoreTypeAt<'01_encoding'>, EncodingTypeSurface>,
        Equal<CoreTypeAt<'02_identity'>, IdentityTypeSurface>,
        Equal<CoreTypeAt<'03_schema'>, SchemaTypeSurface>,
        Equal<CoreTypeAt<'04_time'>, TimeTypeSurface>,
        Equal<CoreTypeAt<'05_lifecycle'>, LifecycleTypeSurface>,
        Equal<CoreTypeAt<'06_evidence'>, EvidenceTypeSurface>,
        Equal<CoreTypeAt<'07_operation'>, OperationTypeSurface>,
        Equal<CoreTypeAt<'08_state'>, StateTypeSurface>,
        Equal<CoreTypeAt<'09_quantization'>, QuantizationTypeSurface>,
        Equal<CoreTypeAt<'10_collection'>, CollectionTypeSurface>,
        Equal<CoreTypeAt<'11_scene'>, SceneTypeSurface>,
        Equal<CoreTypeAt<'12_media'>, MediaTypeSurface>,
        Equal<CoreTypeAt<'13_stream'>, StreamTypeSurface>,
        Equal<CoreTypeAt<'14_compiler'>, CompilerTypeSurface>,
        Equal<CoreTypeAt<'15_program'>, ProgramTypeSurface>,
        Equal<CoreTypeAt<'16_runtime'>, RuntimeTypeSurface>,
        Equal<CoreTypeAt<'17_editor'>, EditorTypeSurface>,
        Equal<CoreTypeAt<'18_inspection'>, InspectionTypeSurface>,
        Equal<
          CoreHomeName,
          | '00_error'
          | '01_encoding'
          | '02_identity'
          | '03_schema'
          | '04_time'
          | '05_lifecycle'
          | '06_evidence'
          | '07_operation'
          | '08_state'
          | '09_quantization'
          | '10_collection'
          | '11_scene'
          | '12_media'
          | '13_stream'
          | '14_compiler'
          | '15_program'
          | '16_runtime'
          | '17_editor'
          | '18_inspection'
        >,
      ],
      [
        true, true, true, true, true, true, true, true, true, true,
        true, true, true, true, true, true, true, true, true, true,
      ]
    >
  >
>;
