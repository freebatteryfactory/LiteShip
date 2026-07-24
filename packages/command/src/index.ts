/**
 * @liteship/command — the shared command registry + dispatcher (CUT A1).
 *
 * One canonical command language (re-anchored from @liteship/_spine via @liteship/core),
 * one registry, one dispatcher. `@liteship/cli` and `@liteship/mcp-server` are thin
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
} from '@liteship/core';

export { CommandRegistry, capabilityUnavailable, ok, failed, defineCommand } from './registry.js';
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
  CapsuleGateSummary,
  CapsuleBenchClassification,
  CheckInvariantsSummary,
  InvariantViolation,
  InvariantViolationGroup,
  RegisteredCommand,
} from './registry.js';
export { CommandDispatcher } from './dispatcher.js';

// The canonical command catalog — the single source CLI/MCP surfaces project from.
export { commandRegistry, COMMAND_CATALOG, mcpExposedDescriptors } from './catalog.js';
export type { CommandMap, CliOwnedName } from './catalog.js';

// Migrated commands (CUT A1, checkpoint 2+).
export { glossaryCommand, GLOSSARY_ENTRIES, matchGlossaryEntries, GlossaryPayloadSchema } from './commands/glossary.js';
export type { GlossaryEntry, GlossaryPayload } from './commands/glossary.js';
export { versionCommand, VersionPayloadSchema } from './commands/version.js';
export type { VersionPayload } from './commands/version.js';
export { capsuleInspectCommand, capsuleListCommand, capsuleVerifyCommand } from './commands/capsule.js';
export type { CapsuleManifest, CapsuleManifestEntry } from './commands/manifest.js';
export type { CapsuleInspectPayload, CapsuleListPayload, CapsuleVerifyResultPayload } from './commands/capsule.js';
export { assetAnalyzeCommand, assetVerifyCommand, AssetAnalyzePayloadSchema } from './commands/asset.js';
export type { AssetAnalyzePayload, AssetVerifyPayload } from './commands/asset.js';
export { sceneVerifyCommand, sceneCompileCommand, sceneRenderCommand } from './commands/scene.js';
export type { SceneVerifyPayload, SceneCompilePayload, SceneRenderPayload } from './commands/scene.js';
export { verifyCommand, VerifyPayloadSchema } from './commands/verify.js';
export type { VerifyPayload } from './commands/verify.js';
export { auditCommand, AuditPayloadSchema } from './commands/audit.js';
export type { AuditPayload } from './commands/audit.js';
export { auditFloorCommand, AuditFloorPayloadSchema } from './commands/audit-floor.js';
export type { AuditFloorPayload } from './commands/audit-floor.js';
export { AUDIT_WARNING_FLOOR, diffInventories } from './commands/audit-floor-registry.js';
export { plumbCommand, PlumbPayloadSchema } from './commands/plumb.js';
export type { PlumbPayload } from './commands/plumb.js';
export { PACKAGE_PLUMB } from './commands/plumb-registry.js';
export type { PackagePlumbEntry, PackagePlumbStatus } from './commands/plumb-registry.js';
export { packageSmokeCommand, PackageSmokePayloadSchema } from './commands/package-smoke.js';
export type { PackageSmokePayload } from './commands/package-smoke.js';
export { PACKAGES, PEER_INSTALLS } from './commands/package-smoke-registry.js';
export type { PackageSmokeSpec } from './commands/package-smoke-registry.js';
export { checkInvariantsCommand, CheckInvariantsPayloadSchema } from './commands/check-invariants.js';
export type { CheckInvariantsPayload } from './commands/check-invariants.js';
export { capsuleVerifyGateCommand, CapsuleVerifyPayloadSchema } from './commands/capsule-verify.js';
export type { CapsuleVerifyPayload } from './commands/capsule-verify.js';
export { checkGatesCommand, CheckPayloadSchema } from './commands/check.js';
export type { CheckPayload } from './commands/check.js';
export { explainCommand, ExplainPayloadSchema } from './commands/explain.js';
export type { ExplainPayload, ExplainDiagnostic, ExplainEmitter, ExplainSymbol } from './commands/explain.js';
export { contextCommand, ContextPayloadSchema, CONTEXT_MAP, CONTEXT_TASK_IDS } from './commands/context.js';
export type { ContextPayload, ContextPointer, ContextPointerKind, ContextTask } from './commands/context.js';
export type { ApiSymbolResolution } from './registry.js';

// The check registry (data) + the pure profile planner — the source a profile
// sweep projects from (CHECK_REGISTRY / SCRIPT_EXEMPTIONS partition the root scripts).
export { CHECK_REGISTRY } from './checks/registry.js';
export { SCRIPT_EXEMPTIONS } from './checks/script-exemptions.js';
export type { ScriptExemption } from './checks/script-exemptions.js';
export type {
  CheckDefinition,
  CheckProfile,
  CheckContext,
  CheckPlatform,
  CheckCache,
  CheckAuthority,
  CliCheckExecution,
} from './checks/definition.js';
export { planChecks, formatCheckPlan, CHECK_PROFILES, CHECK_CONTEXTS, CHECK_PLATFORMS } from './checks/plan.js';
export type { CurePacket, CurePacketInput, CureArtifact, CureReproducerKind } from './checks/cure-packet.js';
export type {
  CheckPlan,
  PlannedCheck,
  SkippedCheck,
  CheckReport,
  CheckRunResult,
  CheckVerdict,
} from './checks/plan.js';
export { INVARIANTS } from './commands/check-invariants-registry.js';
export type { CheckInvariantEntry } from './commands/check-invariants-registry.js';
export {
  packageSlug,
  selectTargets,
  observedLifecycleScripts,
  readPackageManagerVersion,
  deriveBuildEnv,
} from './commands/ship-planning.js';
export type { PackageJsonLite, WorkspacePackage } from './commands/ship-planning.js';
