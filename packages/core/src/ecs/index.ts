/**
 * Typed ECS projection/execution substrate.
 *
 * This advanced subpath keeps low-level entity, Part-admission, system, and
 * dense-store machinery out of the day-to-day `@liteship/core` authoring
 * surface while preserving one reviewed public owner for Scene and other
 * continuous runtime hosts.
 *
 * @module
 */

export { createDenseStore, defineDenseSystem } from './dense.js';

export { EntityId, admitPart, definePart } from './part.js';

export { createWorld, defineSystem } from './world.js';

export type {
  DenseStore,
  DenseStoreWriter,
  DenseSystem,
  DenseSystemContext,
  OwnedDenseStore,
  ReadonlyDenseValues,
} from './dense.js';

export type {
  AdmittedPartValue,
  DefinePartOptions,
  Part,
  PartAdmissionResult,
  PartRetentionPolicy,
  PartValue,
} from './part.js';

export type { Entity, System, SystemContext, SystemDefinition, SystemEntity, World } from './world.js';
