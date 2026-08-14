/**
 * Compile-time laws for `00_core/15_program`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { Assert, Envelope, Equal, IsNever } from '../../types.js';
import type { SourceRelation } from '../14_compiler/types.js';
import type { ResidualProgram } from './types.js';

/** Compile-time law: a compatible `_tag` property is still rejected as reserved. */
export type ProgramEnvelopeRejectsTagShadow = Assert<
  IsNever<Envelope<'InvalidProgram', 1, { readonly _tag: string }>>
>;


/** Compile-time law: a compatible `_version` property is still rejected as reserved. */
export type ProgramEnvelopeRejectsVersionShadow = Assert<
  IsNever<Envelope<'InvalidProgram', 1, { readonly _version: number }>>
>;


/**
 * Compile-time law: a residual program carries the compiler's source-relation
 * authority, required, with no surviving optional map.
 *
 * The equality is against the imported `SourceRelation` rather than a locally
 * described shape. TypeScript cannot tell an import from a structurally
 * identical local twin, so this law is a floor: a source-level check that the
 * relation is declared once and imported here belongs in the verification
 * harness, and later in the repository authority index.
 */
export type AResidualProgramCarriesTheCompilerSourceRelation = Assert<
  Equal<
    [
      ResidualProgram['relation'],
      'sourceMap' extends keyof ResidualProgram ? true : false,
      undefined extends ResidualProgram['relation'] ? true : false,
    ],
    [SourceRelation, false, false]
  >
>;
