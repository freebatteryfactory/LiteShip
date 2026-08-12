// The Astro target child.
//
// Written alongside the contract, not after it. Each entry restores one way
// this child could reacquire authority it does not own: a second artifact
// vocabulary, a backend chosen by authoring syntax, HTTP policy grown back
// inside a mount, a development convenience minting production facts, or an
// exactness axis quietly widened on the public path.
//
// Several entries name defects the predecessor actually shipped. Those are not
// hypotheticals; they are regression tests for history.

import { runBank } from '../harness.mjs';

const I = '02_targets/astro/00_integration/types.ts';
const C = '02_targets/astro/01_configuration/types.ts';
const A = '02_targets/astro/02_authoring/types.ts';
const B = '02_targets/astro/03_build/types.ts';
const S = '02_targets/astro/04_island/types.ts';
const V = '02_targets/astro/05_server/types.ts';
const D = '02_targets/astro/06_development/types.ts';

/** Meanings an authored directive must never absorb. */
const DRAWER = ['island', 'join', 'source', 'egress', 'operation', 'configuration'];
/** Transport policy a mount must never own. */
const TRANSPORT = ['status', 'headers', 'etag', 'negotiate', 'decode', 'jsonrpc', 'dispatch', 'route'];

const M = [
  // --- integration identity and compatibility -------------------------------
  ['the integration target identity broadens', I,
    `export type AstroTargetId = EcosystemTargetId<'astro'>;`,
    `export type AstroTargetId = EcosystemTargetId;`],

  ['the integration adopts a foreign ecosystem target', I,
    `export type AstroTargetId = EcosystemTargetId<'astro'>;`,
    `export type AstroTargetId = EcosystemTargetId<'vite'>;`],

  ['compatibility loses the unavailable altitude, so absent evidence becomes support', I,
    `  unavailable: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };`,
    ``],

  ['an unavailable claim acquires an evidence address', I,
    `  unavailable: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };`,
    `  unavailable: {
    readonly evidence: AstroCompatibilityEvidence;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };`],

  ['a degraded claim may state no limitations', I,
    `    readonly limitations: NonEmptyTuple<Diagnostic>;
  };
  refused: {`,
    `    readonly limitations: readonly Diagnostic[];
  };
  refused: {`],

  ['the integration decorrelates its configuration revision', I,
    `  readonly participation: TargetParticipation<AstroTargetId, Config, Revision>;`,
    `  readonly participation: TargetParticipation;`],

  // --- configuration trust boundary -----------------------------------------
  ['raw configuration becomes admitted configuration', C,
    `export interface RawAstroConfiguration {
  readonly origin: ConfigurationOrigin;
  readonly contents: unknown;
}`,
    `export interface RawAstroConfiguration {
  readonly origin: ConfigurationOrigin;
  readonly contents: unknown;
  readonly configuration: TargetConfigurationRevision;
  readonly output: AstroBuildOutput;
  readonly fields: readonly AstroConfigurationField[];
}`],

  ['admitted configuration widens its revision', C,
    `  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly output: AstroBuildOutput;`,
    `  readonly configuration: TargetConfigurationRevision;
  readonly output: AstroBuildOutput;`],

  ['a malformed admission still carries a configuration', C,
    `  malformed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  malformed: {
    readonly configuration: AdmittedAstroConfiguration<Config, Revision>;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };`],

  ['disclosure stops being exact on the field that carries it', C,
    `export interface AstroConfigurationField<
  Disclosure extends ConfigurationDisclosure = ConfigurationDisclosure,
> {
  readonly key: AstroConfigurationKey;
  readonly origin: ConfigurationOrigin;
  readonly disclosure: Disclosure;
}`,
    `export interface AstroConfigurationField<
  Disclosure extends ConfigurationDisclosure = ConfigurationDisclosure,
> {
  readonly key: AstroConfigurationKey;
  readonly origin: ConfigurationOrigin;
  readonly disclosure: ConfigurationDisclosure;
}`],

  // --- authoring ------------------------------------------------------------
  ['the activation condition becomes untyped text', A,
    `  readonly when: EvidenceProposition;`,
    `  readonly when: string;`],

  ['the activation proposition becomes a local twin', A,
    `  readonly when: EvidenceProposition;`,
    `  readonly when: Algebra<{ always: Record<never, never>; never: Record<never, never> }>;`],

  ...['backend', 'worker', 'gpu', 'wasm', 'execution', 'runtime'].map((key) => [
    `an authored directive selects a backend via \`${key}\``, A,
    `  readonly when: EvidenceProposition;
}`,
    `  readonly when: EvidenceProposition;
  readonly ${key}?: string;
}`]),

  ...DRAWER.map((key) => [`the activation directive absorbs \`${key}\``, A,
    `  readonly when: EvidenceProposition;
}`,
    `  readonly when: EvidenceProposition;
  readonly ${key}?: unknown;
}`]),

  ['an unknown directive is refused without saying which', A,
    `  'unknown-directive': { readonly directive: AstroDirectiveName; readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  'unknown-directive': { readonly directive: AstroDirectiveName; readonly diagnostics: readonly Diagnostic[] };`],

  // --- the build socket -----------------------------------------------------
  // Loosening the requirement's own constraint is deliberately NOT a bank entry,
  // and the reason is worth stating rather than leaving as an absence.
  //
  // The requirement's type parameters exist only to feed that constraint, so
  // any mutation that removes an axis from it orphans the parameter and the
  // tree dies on TS6196 -- unused type parameter. That is a hygiene death: the
  // mutation is caught, but not by anything that knows what the architecture
  // means, and a bank full of those reports a high score for the wrong reason.
  // No named law can catch it either, because TypeScript gives a law no way to
  // read a parameter's constraint.
  //
  // So it is proved where it can be attributed: `probe-astro-vite-negatives.ts`
  // instantiates the requirement with a producer-broadened supplier (N2c) and
  // with participation- and slot-broadened suppliers (N2a, N2b), each failing
  // as a real TS2344 through the public binding path. Removing the constraint
  // entirely leaves five directives unused, each naming its own site.

  ['the build requirement constrains against the broad instantiation', B,
    `  Facility extends AstroBuildFacility<Participation, Demands, Producer>,
> = Hole<'liteship.target.astro.build-facility', Facility>;`,
    `  Facility extends AstroBuildFacility<TargetParticipation, ArtifactSlotDemands, ArtifactProducer>,
> = Hole<'liteship.target.astro.build-facility', Facility>;`],

  ['the facility drops its covariant participation, leaving it only in the request', B,
    `  readonly participation: Participation;
  readonly slots: Demands;
  readonly claims: NonEmptyTuple<SlotClaim>;`,
    `  readonly slots: Demands;
  readonly claims: NonEmptyTuple<SlotClaim>;`],

  ['the facility drops its covariant slots, leaving them only in the request', B,
    `  readonly participation: Participation;
  readonly slots: Demands;
  readonly claims: NonEmptyTuple<SlotClaim>;`,
    `  readonly participation: Participation;
  readonly claims: NonEmptyTuple<SlotClaim>;`],

  ['the facility widens its participation', B,
    `  readonly participation: Participation;
  readonly slots: Demands;`,
    `  readonly participation: TargetParticipation;
  readonly slots: Demands;`],

  ['the facility widens its slots', B,
    `  readonly participation: Participation;
  readonly slots: Demands;`,
    `  readonly participation: Participation;
  readonly slots: ArtifactSlotDemands;`],

  ['the disposition loses the unsupported altitude', B,
    `  unsupported: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  unresolved: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  unresolved: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`],

  ['the disposition loses the unresolved altitude', B,
    `  unresolved: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`],

  ['an empty disposition acquires production', B,
    `  empty: Record<never, never>;`,
    `  empty: { readonly produced: readonly ProducedArtifact[] };`],

  ['an unsupported projection stops explaining itself', B,
    `  unsupported: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  unsupported: { readonly diagnostics: readonly Diagnostic[] };`],

  ['the request restates the planning facts the outcome owns', B,
    `  readonly planned: CaseOf<CompileOutcome, 'planned'>;`,
    `  readonly planned: CaseOf<CompileOutcome, 'planned'>;
  readonly requirements: readonly [];`],

  ['the facility acquires an ecosystem plugin handle', B,
    `  readonly claims: NonEmptyTuple<SlotClaim>;
  readonly project: Signature<
    AstroProjectionRequest<Participation, Demands>,`,
    `  readonly claims: NonEmptyTuple<SlotClaim>;
  readonly plugin: unknown;
  readonly project: Signature<
    AstroProjectionRequest<Participation, Demands>,`],

  ['the produced disposition widens its producer', B,
    `      ProducedArtifact<ArtifactId, ProjectionTargetId, RevisionId, Producer, ArtifactSlotId>`,
    `      ProducedArtifact<ArtifactId, ProjectionTargetId, RevisionId, ArtifactProducer, ArtifactSlotId>`],

  // --- islands --------------------------------------------------------------
  ['the island join becomes a local twin of web\'s authority', S,
    `  readonly join: IslandJoin;`,
    `  readonly join: { readonly program: unknown; readonly revision: unknown };`],

  ['an island entry loses its residual-program ancestry', S,
    `  readonly entry: ProducedArtifact;`,
    `  readonly entry: IslandReference;`],

  ['an island entry restates artifact facts', S,
    `  readonly entry: ProducedArtifact;`,
    `  readonly entry: ProducedArtifact;
  readonly address: unknown;`],

  ['an island entry decorrelates its configuration', S,
    `  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly configuration: TargetConfigurationRevision;`],

  ['unresolved ancestry becomes a quiet nothing', S,
    `  'unresolved-ancestry': { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  'unresolved-ancestry': { readonly diagnostics: readonly Diagnostic[] };`],

  ['the target acquires activation authority', S,
    `  readonly island: IslandReference;`,
    `  readonly island: IslandReference;
  readonly activate: unknown;`],

  // --- the server mount -----------------------------------------------------
  ['a mount loses its exact operation identity', V,
    `  readonly invocation: OperationInvocation<Input, Op>;`,
    `  readonly invocation: OperationInvocation;`],

  ['a mount loses the host request authority', V,
    `  readonly request: AdmittedRequest<EdgeRequestId>;`,
    `  readonly request: MountLocation;`],

  ['a mount loses the response-commit grant', V,
    `  readonly commit: ResponseCommitGrant;`,
    `  readonly commit: MountLocation;`],

  ...TRANSPORT.map((key) => [`the mount grows \`${key}\` policy of its own`, V,
    `  readonly commit: ResponseCommitGrant;
}`,
    `  readonly commit: ResponseCommitGrant;
  readonly ${key}?: unknown;
}`]),

  ['the mount outcome becomes a response rather than a receipt', V,
    `  received: { readonly receipt: OperationReceipt<Output, Failure, Op> };`,
    `  received: { readonly receipt: OperationReceipt<Output, Failure, Op>; readonly status: number };`],

  // --- development ----------------------------------------------------------
  ['a development declaration acquires production authority', D,
    `export interface GeneratedDeclaration<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly location: CodegenLocation;`,
    `export interface GeneratedDeclaration<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly producer: unknown;
  readonly slot: unknown;
  readonly artifact: unknown;
  readonly location: CodegenLocation;`],

  ['a watched source accepts a raw filesystem path', D,
    `export type AdmittedSourcePath = Brand<string, 'liteship.target.astro.admitted-source-path'>;`,
    `export type AdmittedSourcePath = string;`],

  ['stale development evidence becomes fresh', D,
    `  stale: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  stale: { readonly declaration: GeneratedDeclaration<Config, Revision> };`],

  ['a generated declaration decorrelates its configuration', D,
    `  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly configuration: TargetConfigurationRevision;`],
];

process.exit(runBank('astro', M).clean ? 0 : 1);
