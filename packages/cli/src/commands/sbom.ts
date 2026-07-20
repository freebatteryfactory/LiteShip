/**
 * `liteship sbom` — emit the deterministic, content-addressed Software Bill of
 * Materials (Slice C, the avionics tier — supply chain).
 *
 * Thin CLI adapter: reads pnpm-lock.yaml + the workspace manifests, runs the
 * `@liteship/cli` supply-chain analyzer (lockfile policy + CycloneDX SBOM +
 * completeness), writes the reviewable artifact to {@link SBOM_ARTIFACT_PATH},
 * and emits a {@link SbomReceipt}. Deterministic by construction — two runs over
 * the same lockfile write a byte-identical SBOM with a stable content address.
 *
 * Exit codes: 0 clean; 1 a lockfile-policy or SBOM-completeness violation (the
 * supply chain is not hermetic); 1 on a read/parse fault.
 *
 * @module
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ContentAddress, wallClock } from '@liteship/core';
import { hasTag } from '@liteship/error';
import { isLiteShipWorkspace, readWorkspacePackages, type WorkspacePackageIdentity } from '../lib/workspace.js';
import {
  analyzeLockfile,
  buildSbom,
  checkSbomCompleteness,
  SBOM_ARTIFACT_PATH,
  type WorkspacePkg,
} from '../lib/supply-chain.js';
import { emit, emitError } from '../receipts.js';
import type { SbomReceipt } from '../receipts.js';

function toAnalyzerPkg(p: WorkspacePackageIdentity): WorkspacePkg {
  return { name: p.name, version: p.version, private: p.private, importerPath: p.importerPath };
}

/**
 * Injectable seam for {@link sbom}'s workspace reader + supply-chain analyzer.
 * Defaults to the real lib functions so production `liteship sbom` is unchanged;
 * tests pass doubles to pin the adapter's in-process logic (guards, fail-closed
 * parse path, receipt projection) without a real pnpm-lock.yaml parse.
 */
interface SbomDeps {
  readonly isLiteShipWorkspace: typeof isLiteShipWorkspace;
  readonly readWorkspacePackages: typeof readWorkspacePackages;
  readonly analyzeLockfile: typeof analyzeLockfile;
  readonly buildSbom: typeof buildSbom;
  readonly checkSbomCompleteness: typeof checkSbomCompleteness;
}

const defaultSbomDeps: SbomDeps = {
  isLiteShipWorkspace,
  readWorkspacePackages,
  analyzeLockfile,
  buildSbom,
  checkSbomCompleteness,
};

/** Execute `liteship sbom`. */
export function sbom(_args: readonly string[], deps: SbomDeps = defaultSbomDeps): number {
  const { isLiteShipWorkspace, readWorkspacePackages, analyzeLockfile, buildSbom, checkSbomCompleteness } = deps;
  const cwd = process.cwd();
  if (!isLiteShipWorkspace(cwd)) {
    emitError('sbom', 'not a LiteShip workspace (root package.json is not "liteship")');
    return 1;
  }

  const lockfilePath = join(cwd, 'pnpm-lock.yaml');
  if (!existsSync(lockfilePath)) {
    emitError('sbom', `pnpm-lock.yaml not found at ${lockfilePath}`);
    return 1;
  }
  const lockfileText = readFileSync(lockfilePath, 'utf8');
  const workspace = readWorkspacePackages(cwd).map(toAnalyzerPkg);

  let lockfile;
  let lockfileFacts;
  try {
    const analyzed = analyzeLockfile(lockfileText, workspace);
    lockfile = analyzed.lockfile;
    lockfileFacts = analyzed.facts;
  } catch (e) {
    // The lockfile parser fails LOUD with a tagged ParseError on a shape it
    // cannot read — surface it, never emit a partial SBOM over a half-parsed lock.
    emitError('sbom', hasTag(e, 'ParseError') ? e.message : `lockfile parse failed: ${String(e)}`);
    return 1;
  }

  const { sbom: doc, serialized, address } = buildSbom(lockfile, workspace);
  const sbomFacts = checkSbomCompleteness(doc, lockfile, workspace, address);

  // Write the reviewable artifact (create the parent dir if needed).
  const outPath = join(cwd, SBOM_ARTIFACT_PATH);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serialized);

  const violations = [...lockfileFacts.violations, ...sbomFacts.violations].map((v) => ({
    code: v.code,
    subject: v.subject,
  }));

  const receipt: SbomReceipt = {
    status: violations.length === 0 ? 'ok' : 'failed',
    command: 'sbom',
    timestamp: new Date(wallClock.now()).toISOString(),
    artifact_path: SBOM_ARTIFACT_PATH,
    content_address: ContentAddress(address),
    component_count: doc.components.length,
    lockfile_package_count: lockfileFacts.packageCount,
    violations,
  };
  emit(receipt);
  return violations.length === 0 ? 0 : 1;
}
