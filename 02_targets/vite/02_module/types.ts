/**
 * Generated and virtual module relationships.
 *
 * The predecessor served seven virtual modules under fixed string identifiers.
 * Two different projects, with two different configurations, produced
 * byte-identical module ids — so a cache, a diff, or an ancestry question could
 * not tell them apart. The ecosystem does not help here: neither Vite nor
 * Rolldown documents any convention for parameterising a virtual id, and
 * neither detects a collision.
 *
 * So this home separates two facts the predecessor fused. The **specifier** is
 * the friendly, stable name an author imports. The **identity** is what the
 * module actually is, and it reads the configuration revision, the source
 * revision, and the environment. One specifier may resolve to many identities;
 * an identity that ignores its configuration is the original defect.
 *
 * Unresolved data is refused, never emptied. `export const tokens = {}` for a
 * module whose data was missing is indistinguishable from a genuinely empty
 * project, and that is how a stale build ships quietly.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  NonEmptyTuple,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RevisionId, RevisionReference } from '../../../00_core/02_identity/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  TargetConfigurationId,
  TargetConfigurationRevision,
} from '../../types.js';
import type { BuildEnvironmentName } from '../00_integration/types.js';

/** The public name an author writes. Ergonomics, not identity. */
export type ModuleSpecifier = Brand<string, 'liteship.target.vite.module-specifier'>;

/** Where the bundler placed a module. An ecosystem location handle. */
export type ResolvedModuleLocation = Brand<string, 'liteship.target.vite.resolved-location'>;

/**
 * What a generated module actually is.
 *
 * Every axis that can change its bytes is read. Drop one and two different
 * modules become one identity, which is precisely the predecessor's bug.
 */
export interface GeneratedModuleIdentity<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly specifier: ModuleSpecifier;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly source: RevisionReference<Revision>;
  readonly environment: BuildEnvironmentName;
  readonly address: ContentAddress<'application/vnd.liteship.vite-module+cbor'>;
}

/**
 * What loading a generated module yielded.
 *
 * `unresolved` is its own arm and carries diagnostics. There is no arm meaning
 * "loaded successfully with nothing in it because the data was missing".
 */
export type GeneratedModuleOutcome<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> = Algebra<{
  generated: {
    readonly identity: GeneratedModuleIdentity<Config, Revision>;
    readonly location: ResolvedModuleLocation;
  };
  'genuinely-empty': { readonly identity: GeneratedModuleIdentity<Config, Revision> };
  unresolved: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** The families this home owns, so none is correct and unreached. */
export interface ViteModuleTypeSurface {
  readonly specifier: ModuleSpecifier;
  readonly location: ResolvedModuleLocation;
  readonly identity: GeneratedModuleIdentity;
  readonly outcome: GeneratedModuleOutcome;
}
