// The narrow core artifact-exactness and source-truth correction.
//
// This correction exists because the target layer needed to state artifact
// ancestry and found the upstream artifact contract unable to express it. Every
// mutation here restores one piece of the ambiguity that was removed, and must
// die on a named law. If any of them survives, the correction is decorative.

import { runBank } from '../harness.mjs';

const ID = '00_core/02_identity/types.ts';
const CM = '00_core/14_compiler/types.ts';
const PG = '00_core/15_program/types.ts';

const M = [
  // --- exact identity ------------------------------------------------------
  ['revision reference goes back to broad', ID,
    `export type RevisionReference<Id extends RevisionId = RevisionId> = Reference<'revision', Id>;`,
    `export type RevisionReference = Reference<'revision', RevisionId>;`],

  ['artifact reference goes back to broad', CM,
    `export type ArtifactReference<Id extends ArtifactId = ArtifactId> = Reference<'artifact', Id>;`,
    `export type ArtifactReference = Reference<'artifact', ArtifactId>;`],

  ['artifact identity broadens on the carrier', CM,
    `  readonly id: Id;
  readonly target: ProjectionTargetReference<Target>;`,
    `  readonly id: ArtifactId;
  readonly target: ProjectionTargetReference<Target>;`],

  ['projection target decorrelates from the artifact', CM,
    `  readonly target: ProjectionTargetReference<Target>;
  readonly relation: SourceRelation<Revision>;`,
    `  readonly target: ProjectionTargetReference;
  readonly relation: SourceRelation<Revision>;`],

  ['source revision decorrelates from the artifact', CM,
    `  readonly relation: SourceRelation<Revision>;
  readonly address: ContentAddress;`,
    `  readonly relation: SourceRelation;
  readonly address: ContentAddress;`],

  // --- one source authority ------------------------------------------------
  ['the required relation becomes optional', CM,
    `  readonly relation: SourceRelation<Revision>;
  readonly address: ContentAddress;`,
    `  readonly relation?: SourceRelation<Revision>;
  readonly address: ContentAddress;`],

  ['the retired optional source map returns to the artifact', CM,
    `  readonly digest: ContentDigest;
  readonly mediaType: string;
}`,
    `  readonly digest: ContentDigest;
  readonly mediaType: string;
  readonly sourceMap?: ContentAddress;
}`],

  ['a sibling source field returns beside the relation', CM,
    `  readonly id: Id;
  readonly target: ProjectionTargetReference<Target>;`,
    `  readonly id: Id;
  readonly source: RevisionReference<Revision>;
  readonly target: ProjectionTargetReference<Target>;`],

  // --- the three arms ------------------------------------------------------
  ['the mapped arm loses its map', CM,
    `  mapped: {
    readonly source: RevisionReference<Revision>;
    readonly map: SourceMapReference;
  };`,
    `  mapped: {
    readonly source: RevisionReference<Revision>;
  };`],

  ['the mapped arm accepts any addressed bytes', CM,
    `    readonly map: SourceMapReference;`,
    `    readonly map: ContentAddress;`],

  ['the mapped map becomes optional', CM,
    `    readonly map: SourceMapReference;`,
    `    readonly map?: SourceMapReference;`],

  ['the identity-preserving arm gains a map', CM,
    `  'identity-preserving': {
    readonly source: RevisionReference<Revision>;
  };`,
    `  'identity-preserving': {
    readonly source: RevisionReference<Revision>;
    readonly map: SourceMapReference;
  };`],

  ['the unmappable arm gains a map', CM,
    `  'deliberately-unmappable': {
    readonly source: RevisionReference<Revision>;
    readonly limitations: NonEmptyTuple<Diagnostic>;
  };`,
    `  'deliberately-unmappable': {
    readonly source: RevisionReference<Revision>;
    readonly limitations: NonEmptyTuple<Diagnostic>;
    readonly map: SourceMapReference;
  };`],

  ['unmappable limitations accept an empty population', CM,
    `    readonly limitations: NonEmptyTuple<Diagnostic>;`,
    `    readonly limitations: readonly Diagnostic[];`],

  ['unmappable loses its limitations entirely', CM,
    `  'deliberately-unmappable': {
    readonly source: RevisionReference<Revision>;
    readonly limitations: NonEmptyTuple<Diagnostic>;
  };`,
    `  'deliberately-unmappable': {
    readonly source: RevisionReference<Revision>;
  };`],

  ['an arm stops committing to its revision', CM,
    `  mapped: {
    readonly source: RevisionReference<Revision>;
    readonly map: SourceMapReference;
  };`,
    `  mapped: {
    readonly source: RevisionReference;
    readonly map: SourceMapReference;
  };`],

  // --- residual program ----------------------------------------------------
  ['the residual program relation becomes optional', PG,
    `    readonly relation: SourceRelation;`,
    `    readonly relation?: SourceRelation;`],

  ['the retired optional source map returns to the residual program', PG,
    `    readonly relation: SourceRelation;`,
    `    readonly sourceMap?: ContentAddress;`],

  ['the residual program invents a divergent local relation', PG,
    `    readonly relation: SourceRelation;`,
    `    readonly relation: { readonly source: ProjectionTargetReference };`],
];

process.exit(runBank('core-source-relation', M).clean ? 0 : 1);
