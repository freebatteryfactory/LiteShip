[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / audit/src

# audit/src

@czap/audit — the profile-driven, downstream-installable audit engine.

Runs the structure / integrity / surface passes against a `DevopsProfile`
(`profile.repoRoot` is the authoritative audit target). The LiteShip HICP
report bundle (scoring, strike-board, artifact provenance) is NOT part of this
package — it stays repo-local and composes these passes.

## Interfaces

- [AllowlistUnexercisedEntry](interfaces/AllowlistUnexercisedEntry.md)
- [AuditAllowlistEntry](interfaces/AuditAllowlistEntry.md)
- [AuditCounts](interfaces/AuditCounts.md)
- [AuditFinding](interfaces/AuditFinding.md)
- [AuditLocation](interfaces/AuditLocation.md)
- [AuditPassResult](interfaces/AuditPassResult.md)
- [AuditSectionResult](interfaces/AuditSectionResult.md)
- [AuditSuppression](interfaces/AuditSuppression.md)
- [DevopsProfile](interfaces/DevopsProfile.md)
- [IntegritySummary](interfaces/IntegritySummary.md)
- [OrphanCoverage](interfaces/OrphanCoverage.md)
- [PackageManifestInfo](interfaces/PackageManifestInfo.md)
- [PackagePolicy](interfaces/PackagePolicy.md)
- [SourceFileRecord](interfaces/SourceFileRecord.md)
- [StructureCoverageClassification](interfaces/StructureCoverageClassification.md)
- [StructureSummary](interfaces/StructureSummary.md)
- [SurfacePolicyShape](interfaces/SurfacePolicyShape.md)
- [SurfaceSummary](interfaces/SurfaceSummary.md)
- [SymbolOrphanCoverage](interfaces/SymbolOrphanCoverage.md)
- [TopologyCoverageEntry](interfaces/TopologyCoverageEntry.md)

## Type Aliases

- [AuditCoverageClass](type-aliases/AuditCoverageClass.md)
- [AuditSection](type-aliases/AuditSection.md)
- [AuditSeverity](type-aliases/AuditSeverity.md)

## Variables

- [auditAllowlist](variables/auditAllowlist.md)
- [auditIgnoreGlobs](variables/auditIgnoreGlobs.md)
- [auditSourceGlobs](variables/auditSourceGlobs.md)
- [dynamicImportExemptions](variables/dynamicImportExemptions.md)
- [liteshipDevopsProfile](variables/liteshipDevopsProfile.md)
- [packageTopology](variables/packageTopology.md)
- [surfacePolicy](variables/surfacePolicy.md)

## Functions

- [compareSeverity](functions/compareSeverity.md)
- [createCounts](functions/createCounts.md)
- [defaultRoot](functions/defaultRoot.md)
- [findAllowlistReason](functions/findAllowlistReason.md)
- [isSimpleDefaultExpression](functions/isSimpleDefaultExpression.md)
- [lineAndColumn](functions/lineAndColumn.md)
- [listPackageManifests](functions/listPackageManifests.md)
- [nodeText](functions/nodeText.md)
- [normalizeRepoPath](functions/normalizeRepoPath.md)
- [partitionAllowlistedFindings](functions/partitionAllowlistedFindings.md)
- [readJsonFile](functions/readJsonFile.md)
- [readSourceFileRecords](functions/readSourceFileRecords.md)
- [relativeToRoot](functions/relativeToRoot.md)
- [runAuditPasses](functions/runAuditPasses.md)
- [runIntegrityAudit](functions/runIntegrityAudit.md)
- [runStructureAudit](functions/runStructureAudit.md)
- [runSurfaceAudit](functions/runSurfaceAudit.md)
- [sortFindings](functions/sortFindings.md)
- [sortSuppressions](functions/sortSuppressions.md)
- [walkAuditSourceFiles](functions/walkAuditSourceFiles.md)
- [withRepoRoot](functions/withRepoRoot.md)
