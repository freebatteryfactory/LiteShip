// The Cloudflare target child, and the umbrella's deployment contract.
//
// This child exists in the successor because the predecessor's version failed.
// It imported a framework sibling, shipped no direct worker entry, required the
// framework in its README, and named its health probe after the framework's
// output mode. Every entry under "direct mode" below restores one step back
// toward that outcome.
//
// The deployment contract itself is exercised here rather than in the umbrella
// bank, because it was deferred until this denominator earned its shape and its
// laws only mean something with a consumer in the tree.

import { runBank } from '../harness.mjs';

const U = '02_targets/types.ts';
const I = '02_targets/cloudflare/00_integration/types.ts';
const C = '02_targets/cloudflare/01_configuration/types.ts';
const B = '02_targets/cloudflare/02_binding/types.ts';
const D = '02_targets/cloudflare/03_deployment/types.ts';

/** Ways a deployment could reacquire the ability to ask who produced its input. */
const PROVENANCE = ['astro', 'framework', 'producer', 'direct', 'outputMode', 'middleware'];
/** Ways registration could name a framework again. */
const REGISTRATION = ['astro', 'framework', 'integration', 'middleware', 'outputMode'];

const M = [
  // --- the deployment contract ----------------------------------------------
  ['the deployable application collapses to a bare artifact set', U,
    `export interface DeployableApplication {
  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];
}`,
    `export type DeployableApplication = NonEmptyTuple<ProducedArtifact>;`],

  ['the deployable application loses its distinguished entry', U,
    `  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];`,
    `  readonly assets: readonly ProducedArtifact[];`],

  ['the deployable application becomes a manifest of references', U,
    `  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];`,
    `  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];
  readonly manifest: ContentAddress;`],

  ['the deployable application restates the content address', U,
    `  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];`,
    `  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];
  readonly address: ContentAddress;`],

  ['the deployable application acquires a composition of its own', U,
    `  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];`,
    `  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];
  readonly composition: TargetCompositionReference;`],

  ['the deployable application names the target that produced it', U,
    `  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];`,
    `  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];
  readonly target: EcosystemTargetReference;`],

  // --- direct mode ----------------------------------------------------------
  ...PROVENANCE.map((key) => [`the deployment can ask who produced its input via \`${key}\``, D,
    `  readonly bindings: readonly PlatformBinding[];
}`,
    `  readonly bindings: readonly PlatformBinding[];
  readonly ${key}?: unknown;
}`]),

  ['the deployment stops consuming the umbrella application', D,
    `  readonly application: DeployableApplication;`,
    `  readonly application: { readonly entry: unknown; readonly assets: readonly unknown[] };`],

  // --- registration ---------------------------------------------------------
  ...REGISTRATION.map((key) => [`registration names a framework via \`${key}\``, I,
    `  readonly compatibility: CloudflareCompatibility;
}`,
    `  readonly compatibility: CloudflareCompatibility;
  readonly ${key}?: unknown;
}`]),

  ['the cloudflare target identity broadens', I,
    `export type CloudflareTargetId = EcosystemTargetId<'cloudflare'>;`,
    `export type CloudflareTargetId = EcosystemTargetId;`],

  ['the adapter adopts a foreign ecosystem target', I,
    `export type CloudflareTargetId = EcosystemTargetId<'cloudflare'>;`,
    `export type CloudflareTargetId = EcosystemTargetId<'astro'>;`],

  ['cloudflare compatibility loses the unavailable altitude', I,
    `  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;`,
    `}>;`],

  ['an unavailable cloudflare claim acquires evidence', I,
    `  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;`,
    `  unavailable: { readonly evidence: CloudflareCompatibilityEvidence; readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;`],

  ['a degraded cloudflare claim may state no limitations', I,
    `    readonly limitations: NonEmptyTuple<Diagnostic>;`,
    `    readonly limitations: readonly Diagnostic[];`],

  // --- configuration --------------------------------------------------------
  ['raw platform configuration becomes admitted configuration', C,
    `export interface RawCloudflareConfiguration {
  readonly contents: unknown;
}`,
    `export interface RawCloudflareConfiguration {
  readonly contents: unknown;
  readonly configuration: TargetConfigurationRevision;
  readonly compatibilityDate: CompatibilityDate;
  readonly flags: readonly CompatibilityFlag[];
  readonly routes: readonly DeploymentRoute[];
}`],

  ['the compatibility date becomes optional', C,
    `  readonly compatibilityDate: CompatibilityDate;`,
    `  readonly compatibilityDate?: CompatibilityDate;`],

  ['the compatibility date becomes a bare string', C,
    `export type CompatibilityDate = Brand<string, 'liteship.target.cloudflare.compatibility-date'>;`,
    `export type CompatibilityDate = string;`],

  ['admitted platform configuration widens its revision', C,
    `  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly compatibilityDate: CompatibilityDate;`,
    `  readonly configuration: TargetConfigurationRevision;
  readonly compatibilityDate: CompatibilityDate;`],

  ['a malformed platform admission still carries a configuration', C,
    `  malformed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  malformed: {
    readonly configuration: AdmittedCloudflareConfiguration<Config, Revision>;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };`],

  // --- bindings -------------------------------------------------------------
  ['a binding declares its own resource kind instead of a grounding', B,
    `  readonly grounding: GroundingReference;`,
    `  readonly kind: 'kv' | 'd1' | 'r2' | 'durable-object' | 'hyperdrive';`],

  ['a binding decorrelates its grounding', B,
    `  readonly grounding: GroundingReference;`,
    `  readonly grounding: BindingName;`],

  ['binding necessity stops being exact', B,
    `export interface PlatformBinding<Necessity extends BindingNecessity = BindingNecessity> {
  readonly name: BindingName;
  readonly grounding: GroundingReference;
  readonly necessity: Necessity;
}`,
    `export interface PlatformBinding<Necessity extends BindingNecessity = BindingNecessity> {
  readonly name: BindingName;
  readonly grounding: GroundingReference;
  readonly necessity: BindingNecessity;
}`],

  ...['token', 'secret', 'account', 'credential', 'connection'].map((key) => [
    `a binding accumulates a \`${key}\``, B,
    `  readonly necessity: Necessity;
}`,
    `  readonly necessity: Necessity;
  readonly ${key}?: string;
}`]),

  ['an unsatisfied binding becomes a silent no-op', B,
    `  unsatisfied: {
    readonly binding: PlatformBinding;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };`,
    `  unsatisfied: {
    readonly binding: PlatformBinding;
    readonly diagnostics: readonly Diagnostic[];
  };`],

  // --- deployment altitudes --------------------------------------------------
  ['a refused deployment reports a deployment anyway', D,
    `  refused: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  refused: {
    readonly request: DeploymentRequest<Config, Revision>;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };`],

  ['refusal and failure collapse into one altitude', D,
    `  refused: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`],

  ['a failed deployment stops explaining itself', D,
    `  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  failed: { readonly diagnostics: readonly Diagnostic[] };`],

  ['a deployment decorrelates its participation', D,
    `  readonly participation: TargetParticipation<CloudflareTargetId, Config, Revision>;`,
    `  readonly participation: TargetParticipation;`],

  ['a deployment decorrelates its configuration', D,
    `  readonly configuration: AdmittedCloudflareConfiguration<Config, Revision>;`,
    `  readonly configuration: AdmittedCloudflareConfiguration;`],
];

process.exit(runBank('cloudflare', M).clean ? 0 : 1);
