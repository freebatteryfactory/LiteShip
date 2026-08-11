// Forbidden source-relation and artifact shapes. Every one MUST be refused.
//
// Seven witnesses, each a distinct way the ambiguity could return. They are
// written as object literals rather than variable assignments so excess-property
// checking participates -- a retired field reintroduced by a producer is exactly
// the regression this file exists to catch.

import type { Address, NonEmptyTuple } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { ContentAddress, ContentDigest } from './00_core/01_encoding/types.js';
import type { RevisionReference } from './00_core/02_identity/types.js';
import type {
  Artifact,
  ArtifactId,
  ProjectionTargetId,
  ProjectionTargetReference,
  SourceMapReference,
  SourceRelation,
} from './00_core/14_compiler/types.js';

type RevisionA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
>;
type RevisionB = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
>;
type ArtifactA = ArtifactId<'probe.artifact.a'>;
type ArtifactB = ArtifactId<'probe.artifact.b'>;
type TargetA = ProjectionTargetId<'probe.target.a'>;
type TargetB = ProjectionTargetId<'probe.target.b'>;

declare const revisionA: RevisionReference<RevisionA>;
declare const artifactA: ArtifactA;
declare const targetA: ProjectionTargetReference<TargetA>;
declare const sourceMap: SourceMapReference;
declare const limitations: NonEmptyTuple<Diagnostic>;
declare const address: ContentAddress;
declare const digest: ContentDigest;
declare const exactArtifactA: Artifact<ArtifactA, TargetA, RevisionA>;

// 1. A mapped relation without its map.
export const mappedWithoutMap: SourceRelation<RevisionA> = {
  _tag: 'mapped',
  source: revisionA,
};

// 2. An identity-preserving relation carrying a map -- it is describing
//    something other than identity preservation.
export const identityWithMap: SourceRelation<RevisionA> = {
  _tag: 'identity-preserving',
  source: revisionA,
  map: sourceMap,
};

// 3. Refusing to map without saying what was lost.
export const unmappableWithoutReason: SourceRelation<RevisionA> = {
  _tag: 'deliberately-unmappable',
  source: revisionA,
  limitations: [],
};

// 4. The relation naming a different revision than the artifact promises.
export const wrongRevision: SourceRelation<RevisionA> = {
  _tag: 'mapped',
  source: revisionA as unknown as RevisionReference<RevisionB>,
  map: sourceMap,
};

// 5. An artifact of A cannot stand in for an artifact of B.
export const wrongArtifactIdentity: Artifact<ArtifactB, TargetA, RevisionA> = exactArtifactA;

// 6. An artifact for projection target A cannot stand in for target B.
export const wrongProjectionTarget: Artifact<ArtifactA, TargetB, RevisionA> = exactArtifactA;

// 7. The retired optional source map cannot be reintroduced by a producer.
export const artifactWithRetiredMap: Artifact<ArtifactA, TargetA, RevisionA> = {
  id: artifactA,
  target: targetA,
  relation: { _tag: 'deliberately-unmappable', source: revisionA, limitations },
  address,
  digest,
  mediaType: 'text/javascript',
  sourceMap: address,
};
