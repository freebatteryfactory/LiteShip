// Lawful source-relation and exact-artifact fixtures. Every one MUST compile.
//
// A correction that makes forbidden things impossible while quietly making
// lawful things impossible too has not improved anything. These are the
// relationships the architecture promises remain expressible.

import type { Address, NonEmptyTuple } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { ContentAddress, ContentDigest } from './00_core/01_encoding/types.js';
import type { RevisionReference } from './00_core/02_identity/types.js';
import type {
  Artifact,
  ArtifactId,
  ArtifactReference,
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
declare const revisionB: RevisionReference<RevisionB>;
declare const artifactA: ArtifactA;
declare const artifactB: ArtifactB;
declare const targetA: ProjectionTargetReference<TargetA>;
declare const targetB: ProjectionTargetReference<TargetB>;
declare const sourceMap: SourceMapReference;
declare const limitations: NonEmptyTuple<Diagnostic>;
declare const address: ContentAddress;
declare const digest: ContentDigest;

// All three arms are inhabited.
export const identityPreserving: SourceRelation<RevisionA> = {
  _tag: 'identity-preserving',
  source: revisionA,
};

export const mapped: SourceRelation<RevisionA> = {
  _tag: 'mapped',
  source: revisionA,
  map: sourceMap,
};

export const deliberatelyUnmappable: SourceRelation<RevisionA> = {
  _tag: 'deliberately-unmappable',
  source: revisionA,
  limitations,
};

// An artifact exact on all three axes.
export const exactArtifactA: Artifact<ArtifactA, TargetA, RevisionA> = {
  id: artifactA,
  target: targetA,
  relation: mapped,
  address,
  digest,
  mediaType: 'text/javascript',
};

export const exactArtifactB: Artifact<ArtifactB, TargetB, RevisionB> = {
  id: artifactB,
  target: targetB,
  relation: { _tag: 'identity-preserving', source: revisionB },
  address,
  digest,
  mediaType: 'application/wasm',
};

// The erased catalog stays inhabited by several distinct exact families. This
// is what a compilation actually yields, and removing the broad defaults to
// force exactness everywhere would make it unrepresentable.
export const catalog: readonly Artifact[] = [exactArtifactA, exactArtifactB];

// A downstream layer can point at an exact artifact without restating what an
// artifact is, and that pointer is still a member of the broad family.
declare const referenceToA: ArtifactReference<ArtifactA>;
export const pointerToA: ArtifactReference<ArtifactA> = referenceToA;
export const pointerAsBroad: ArtifactReference = referenceToA;
