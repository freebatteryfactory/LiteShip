/**
 * Compile-time laws for `00_core/13_stream`.
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

import type { Assert, Equal, IsNever } from '../../types.js';
import type { SchemaReference } from '../03_schema/types.js';
import type { OperationReference } from '../07_operation/types.js';
import type { CatalogComponentDefinition, ComponentCatalog, ComponentCatalogAddress, GeneratedStructureAdmission, GeneratedStructurePatch, GeneratedStructureSnapshot, StreamPayload, StreamTypeSurface, TrustedFragment, TrustedFragmentAttestation, TrustedFragmentPatch } from './types.js';

/** Compile-time law: a component pins its props schema and admitted operations. */
export type AComponentPinsItsPropsAndOperations = Assert<
  Equal<
    [CatalogComponentDefinition['props'], CatalogComponentDefinition['operations'], ComponentCatalog['address']],
    [SchemaReference, readonly OperationReference[], ComponentCatalogAddress]
  >
>;


/** Compile-time law: the owner surface exposes the component catalog contract. */
export type TheSurfaceReachesTheComponentCatalog = Assert<
  Equal<
    [StreamTypeSurface['catalogComponent'], StreamTypeSurface['componentCatalog']],
    [CatalogComponentDefinition, ComponentCatalog]
  >
>;


type TrustedFragmentCase = Extract<StreamPayload, { readonly _tag: 'trusted-fragment' }>;

type GeneratedStructureCase = Extract<StreamPayload, { readonly _tag: 'generated-structure' }>;

type TrustedFragmentPayload = TrustedFragmentCase['value'];

type GeneratedStructurePayload = GeneratedStructureCase['value'];

type TrustedGeneratedPayloadOverlap =
  | Extract<TrustedFragmentPayload, GeneratedStructurePayload>
  | Extract<GeneratedStructurePayload, TrustedFragmentPayload>;


/** Compile-time law: the trusted arm contains only trusted fragment payloads. */
export type TrustedFragmentArmIsExact = Assert<
  Equal<TrustedFragmentPayload, TrustedFragment | TrustedFragmentPatch>
>;


/** Compile-time law: the generated arm contains only admitted generated payloads. */
export type GeneratedStructureArmIsExact = Assert<
  Equal<GeneratedStructurePayload, GeneratedStructureSnapshot | GeneratedStructurePatch>
>;


/** Compile-time law: neither payload family is structurally assignable to the other. */
export type GeneratedStructureDoesNotOverlapTrustedFragment = Assert<
  IsNever<TrustedGeneratedPayloadOverlap>
>;


/** Compile-time law: generated admission cannot satisfy trusted-fragment attestation. */
export type GeneratedAdmissionIsNotTrustedAttestation = Assert<
  IsNever<
    | Extract<GeneratedStructureAdmission, TrustedFragmentAttestation>
    | Extract<TrustedFragmentAttestation, GeneratedStructureAdmission>
  >
>;
