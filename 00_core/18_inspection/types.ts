/**
 * Structured inspection, explanation, authority discovery, and impact analysis.
 *
 * System assurance produces the Type ABI and repository facts. Core defines the
 * semantic query and explanation contracts that direct, CLI, MCP, and editor
 * wires project.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  Reference,
  TypeAbiAddress,
  TypeAbiAttestation,
  TypeAbiHome,
  TypeAbiSurfaceReference,
} from '../../types.js';
import type { Diagnostic, RemediationAction, SourceLocation } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress } from '../01_encoding/types.js';
import type { AttestationId, EntityReference, RevisionReference } from '../02_identity/types.js';
import type { SchemaReference } from '../03_schema/types.js';
import type { OperationReference } from '../07_operation/types.js';
import type {
  Artifact,
  RuntimeFeatureReference,
  SettlementDecision,
} from '../14_compiler/types.js';
import type { ExecutionImage, ResidualProgram } from '../15_program/types.js';

export type AuthorityId<Name extends string = string> = Brand<Name, 'liteship.authority-id'>;
export type ProofId = ContentAddress<'application/vnd.liteship.proof+cbor'>;
export type AuthorityReference<Id extends AuthorityId = AuthorityId> = Reference<'authority', Id>;

/** Canonical import address of one public declaration. */
export interface CanonicalImport {
  readonly specifier: string;
  readonly exportName: string;
  readonly kind: 'type' | 'value' | 'dual';
}

/** One owner in the joined type/runtime authority graph. */
export interface AuthorityRecord {
  readonly id: AuthorityId;
  readonly name: string;
  readonly home: TypeAbiHome | string;
  readonly typeAbi?: TypeAbiAddress;
  readonly typeSurface?: TypeAbiSurfaceReference;
  readonly typeAttestation?: TypeAbiAttestation;
  readonly canonicalImport?: CanonicalImport;
  readonly source?: SourceLocation;
  readonly aliases: readonly string[];
  readonly schemas: readonly SchemaReference[];
  readonly operations: readonly OperationReference[];
  readonly features: readonly RuntimeFeatureReference[];
  readonly attestations: readonly AttestationId[];
  readonly proofs: readonly ProofId[];
}

/** Relationship in the authority graph. */
export interface AuthorityEdge {
  readonly from: AuthorityReference;
  readonly to: AuthorityReference;
  readonly relation:
    | 'owns'
    | 'imports'
    | 'requires'
    | 'binds'
    | 'produces'
    | 'settles'
    | 'realizes'
    | 'projects'
    | 'proves'
    | 'aliases';
}

/** Content-addressed joined authority graph. */
export interface AuthorityGraph {
  readonly address: ContentAddress<'application/vnd.liteship.authority-graph+cbor'>;
  readonly authorities: readonly AuthorityRecord[];
  readonly edges: readonly AuthorityEdge[];
}

/** Standard inspection query language. */
export type InspectionQuery = Algebra<{
  symbol: { readonly name: string };
  entity: { readonly entity: EntityReference; readonly revision?: RevisionReference };
  operation: { readonly operation: OperationReference };
  artifact: { readonly address: ContentAddress };
  authority: { readonly authority: AuthorityReference };
  program: { readonly address: ContentAddress<'application/vnd.liteship.program+cbor'> };
}>;

/** Structured causal explanation. */
export interface Explanation {
  readonly subject: InspectionQuery;
  readonly summary: string;
  readonly facts: readonly { readonly name: string; readonly value: CanonicalValue; readonly source?: AuthorityReference }[];
  readonly settlement?: readonly SettlementDecision[];
  readonly artifacts?: readonly Artifact[];
  readonly diagnostics: readonly Diagnostic[];
  readonly nextActions: readonly RemediationAction[];
}

/** Downstream impact of changing one authority or revision. */
export interface ImpactAnalysis {
  readonly subject: InspectionQuery;
  readonly direct: readonly AuthorityReference[];
  readonly transitive: readonly AuthorityReference[];
  readonly programs: readonly ResidualProgram[];
  readonly images: readonly ExecutionImage[];
  readonly proofs: readonly ProofId[];
}

/** Type summary consumed by the root core topology. */
export interface InspectionTypeSurface {
  readonly authority: AuthorityRecord;
  readonly graph: AuthorityGraph;
  readonly query: InspectionQuery;
  readonly explanation: Explanation;
  readonly impact: ImpactAnalysis;
}
