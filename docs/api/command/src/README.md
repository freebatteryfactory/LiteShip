[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / command/src

# command/src

@czap/command — the shared command registry + dispatcher (CUT A1).

One canonical command language (re-anchored from @czap/_spine via @czap/core),
one registry, one dispatcher. `@czap/cli` and `@czap/mcp-server` are thin
projection adapters over this package; neither imports the other.

## Namespaces

- [CommandDispatcher](namespaces/CommandDispatcher/README.md)
- [CommandRegistry](namespaces/CommandRegistry/README.md)

## Interfaces

- [AuditEngineSummary](interfaces/AuditEngineSummary.md)
- [AuditFloorSummary](interfaces/AuditFloorSummary.md)
- [CapsuleBenchClassification](interfaces/CapsuleBenchClassification.md)
- [CapsuleCommandHandler](interfaces/CapsuleCommandHandler.md)
- [CapsuleGateSummary](interfaces/CapsuleGateSummary.md)
- [CapsuleManifest](interfaces/CapsuleManifest.md)
- [CapsuleManifestEntry](interfaces/CapsuleManifestEntry.md)
- [CheckInvariantEntry](interfaces/CheckInvariantEntry.md)
- [CheckInvariantsSummary](interfaces/CheckInvariantsSummary.md)
- [CommandContext](interfaces/CommandContext.md)
- [CommandMap](interfaces/CommandMap.md)
- [HandledCommand](interfaces/HandledCommand.md)
- [InvariantViolation](interfaces/InvariantViolation.md)
- [InvariantViolationGroup](interfaces/InvariantViolationGroup.md)
- [PackageJsonLite](interfaces/PackageJsonLite.md)
- [PackagePlumbEntry](interfaces/PackagePlumbEntry.md)
- [PackageSmokeSpec](interfaces/PackageSmokeSpec.md)
- [PackageSmokeSummary](interfaces/PackageSmokeSummary.md)
- [PlumbGateSummary](interfaces/PlumbGateSummary.md)
- [PlumbSkip](interfaces/PlumbSkip.md)
- [RegisteredCommand](interfaces/RegisteredCommand.md)
- [WorkspacePackage](interfaces/WorkspacePackage.md)

## Type Aliases

- [AssetAnalyzePayload](type-aliases/AssetAnalyzePayload.md)
- [AuditFloorPayload](type-aliases/AuditFloorPayload.md)
- [AuditPayload](type-aliases/AuditPayload.md)
- [CapsuleCommandDescriptor](type-aliases/CapsuleCommandDescriptor.md)
- [CapsuleCommandInvocation](type-aliases/CapsuleCommandInvocation.md)
- [CapsuleCommandResult](type-aliases/CapsuleCommandResult.md)
- [CapsuleVerifyPayload](type-aliases/CapsuleVerifyPayload.md)
- [CheckInvariantsPayload](type-aliases/CheckInvariantsPayload.md)
- [CheckPayload](type-aliases/CheckPayload.md)
- [CommandAnnotations](type-aliases/CommandAnnotations.md)
- [CommandCapability](type-aliases/CommandCapability.md)
- [CommandExecutionKind](type-aliases/CommandExecutionKind.md)
- [CommandJsonSchema](type-aliases/CommandJsonSchema.md)
- [GlossaryEntry](type-aliases/GlossaryEntry.md)
- [GlossaryPayload](type-aliases/GlossaryPayload.md)
- [PackagePlumbStatus](type-aliases/PackagePlumbStatus.md)
- [PackageSmokePayload](type-aliases/PackageSmokePayload.md)
- [PlumbPayload](type-aliases/PlumbPayload.md)
- [VerifyPayload](type-aliases/VerifyPayload.md)
- [VersionPayload](type-aliases/VersionPayload.md)

## Variables

- [assetAnalyzeCommand](variables/assetAnalyzeCommand.md)
- [AssetAnalyzePayloadSchema](variables/AssetAnalyzePayloadSchema.md)
- [assetVerifyCommand](variables/assetVerifyCommand.md)
- [AUDIT\_WARNING\_FLOOR](variables/AUDIT_WARNING_FLOOR.md)
- [auditCommand](variables/auditCommand.md)
- [auditFloorCommand](variables/auditFloorCommand.md)
- [AuditFloorPayloadSchema](variables/AuditFloorPayloadSchema.md)
- [AuditPayloadSchema](variables/AuditPayloadSchema.md)
- [capsuleInspectCommand](variables/capsuleInspectCommand.md)
- [capsuleListCommand](variables/capsuleListCommand.md)
- [capsuleVerifyCommand](variables/capsuleVerifyCommand.md)
- [capsuleVerifyGateCommand](variables/capsuleVerifyGateCommand.md)
- [CapsuleVerifyPayloadSchema](variables/CapsuleVerifyPayloadSchema.md)
- [checkCommand](variables/checkCommand.md)
- [checkInvariantsCommand](variables/checkInvariantsCommand.md)
- [CheckInvariantsPayloadSchema](variables/CheckInvariantsPayloadSchema.md)
- [CheckPayloadSchema](variables/CheckPayloadSchema.md)
- [COMMAND\_CATALOG](variables/COMMAND_CATALOG.md)
- [CommandDispatcher](variables/CommandDispatcher.md)
- [commandRegistry](variables/commandRegistry.md)
- [CommandRegistry](variables/CommandRegistry-1.md)
- [GLOSSARY\_ENTRIES](variables/GLOSSARY_ENTRIES.md)
- [glossaryCommand](variables/glossaryCommand.md)
- [GlossaryPayloadSchema](variables/GlossaryPayloadSchema.md)
- [INVARIANTS](variables/INVARIANTS.md)
- [PACKAGE\_PLUMB](variables/PACKAGE_PLUMB.md)
- [PACKAGES](variables/PACKAGES.md)
- [packageSmokeCommand](variables/packageSmokeCommand.md)
- [PackageSmokePayloadSchema](variables/PackageSmokePayloadSchema.md)
- [PEER\_INSTALLS](variables/PEER_INSTALLS.md)
- [plumbCommand](variables/plumbCommand.md)
- [PlumbPayloadSchema](variables/PlumbPayloadSchema.md)
- [sceneCompileCommand](variables/sceneCompileCommand.md)
- [sceneRenderCommand](variables/sceneRenderCommand.md)
- [sceneVerifyCommand](variables/sceneVerifyCommand.md)
- [verifyCommand](variables/verifyCommand.md)
- [VerifyPayloadSchema](variables/VerifyPayloadSchema.md)
- [versionCommand](variables/versionCommand.md)
- [VersionPayloadSchema](variables/VersionPayloadSchema.md)

## Functions

- [capabilityUnavailable](functions/capabilityUnavailable.md)
- [defineCommand](functions/defineCommand.md)
- [deriveBuildEnv](functions/deriveBuildEnv.md)
- [diffInventories](functions/diffInventories.md)
- [failed](functions/failed.md)
- [matchGlossaryEntries](functions/matchGlossaryEntries.md)
- [mcpExposedDescriptors](functions/mcpExposedDescriptors.md)
- [observedLifecycleScripts](functions/observedLifecycleScripts.md)
- [ok](functions/ok.md)
- [packageSlug](functions/packageSlug.md)
- [readPackageManagerVersion](functions/readPackageManagerVersion.md)
- [selectTargets](functions/selectTargets.md)
