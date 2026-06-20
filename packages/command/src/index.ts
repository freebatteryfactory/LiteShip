/**
 * @czap/command — the shared command registry + dispatcher (CUT A1).
 *
 * One canonical command language (re-anchored from @czap/_spine via @czap/core),
 * one registry, one dispatcher. `@czap/cli` and `@czap/mcp-server` are thin
 * projection adapters over this package; neither imports the other.
 *
 * @module
 */
export type {
  CapsuleCommandDescriptor,
  CapsuleCommandInvocation,
  CapsuleCommandResult,
  CommandAnnotations,
  CommandExecutionKind,
  CommandJsonSchema,
} from '@czap/core';

export { CommandRegistry, capabilityUnavailable } from './registry.js';
export type {
  AuditEngineSummary,
  AuditFloorSummary,
  PackageSmokeSummary,
  CapsuleCommandHandler,
  CommandCapability,
  CommandContext,
  HandledCommand,
  PlumbGateSummary,
  PlumbSkip,
  CheckInvariantsSummary,
  InvariantViolation,
  InvariantViolationGroup,
  RegisteredCommand,
} from './registry.js';
export { CommandDispatcher } from './dispatcher.js';

// The canonical command catalog — the single source CLI/MCP surfaces project from.
export { commandRegistry, COMMAND_CATALOG, mcpExposedDescriptors } from './catalog.js';

// Migrated commands (CUT A1, checkpoint 2+).
export { glossaryCommand, GLOSSARY_ENTRIES, matchGlossaryEntries } from './commands/glossary.js';
export type { GlossaryEntry, GlossaryPayload } from './commands/glossary.js';
export { versionCommand } from './commands/version.js';
export type { VersionPayload } from './commands/version.js';
export { capsuleInspectCommand, capsuleListCommand, capsuleVerifyCommand } from './commands/capsule.js';
export type { CapsuleManifest, CapsuleManifestEntry } from './commands/manifest.js';
export { assetAnalyzeCommand, assetVerifyCommand } from './commands/asset.js';
export type { AssetAnalyzePayload } from './commands/asset.js';
export { sceneVerifyCommand, sceneCompileCommand, sceneRenderCommand } from './commands/scene.js';
export { verifyCommand } from './commands/verify.js';
export type { VerifyPayload } from './commands/verify.js';
export { auditCommand } from './commands/audit.js';
export type { AuditPayload } from './commands/audit.js';
export { auditFloorCommand } from './commands/audit-floor.js';
export type { AuditFloorPayload } from './commands/audit-floor.js';
export { AUDIT_WARNING_FLOOR, diffInventories } from './commands/audit-floor-registry.js';
export { plumbCommand } from './commands/plumb.js';
export type { PlumbPayload } from './commands/plumb.js';
export { PACKAGE_PLUMB } from './commands/plumb-registry.js';
export type { PackagePlumbEntry, PackagePlumbStatus } from './commands/plumb-registry.js';
export { packageSmokeCommand } from './commands/package-smoke.js';
export type { PackageSmokePayload } from './commands/package-smoke.js';
export { PACKAGES, PEER_INSTALLS } from './commands/package-smoke-registry.js';
export type { PackageSmokeSpec } from './commands/package-smoke-registry.js';
export { checkInvariantsCommand } from './commands/check-invariants.js';
export type { CheckInvariantsPayload } from './commands/check-invariants.js';
export { INVARIANTS } from './commands/check-invariants-registry.js';
export type { Invariant } from './commands/check-invariants-registry.js';
export {
  packageSlug,
  selectTargets,
  observedLifecycleScripts,
  readPackageManagerVersion,
  deriveBuildEnv,
} from './commands/ship-planning.js';
export type { PackageJsonLite, WorkspacePackage } from './commands/ship-planning.js';
