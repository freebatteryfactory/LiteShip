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

import type {
  Named,
  Tuple,
} from '../types.js';
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
