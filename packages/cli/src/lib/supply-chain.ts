/**
 * Supply-chain analyzer (host) — the heavy lifting the lean `@liteship/gauntlet`
 * supply-chain gate refuses to do (Slice C, the avionics tier).
 *
 * This is the HOST (ADR-0012): it parses pnpm-lock.yaml, enforces the
 * {@link LockfilePolicy}, builds the deterministic CycloneDX SBOM, re-reads a
 * ShipCapsule's recorded addresses and validates them against the LIVE tree, and
 * scans `.github/workflows` for ambient publish authority. It folds all four
 * into the flat {@link SupplyChainFacts} the gate consumes. No re-capture: the
 * provenance step RE-READS the evidence `liteship ship` already minted and turns it
 * into an ENFORCED contract.
 *
 * All hashing routes through the ONE content-address kernel (AddressedDigest /
 * CanonicalCbor) — never forked — so the lockfile address this analyzer recomputes
 * is byte-identical to the one `liteship ship` recorded in the ShipCapsule.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AddressedDigest, ShipCapsule, type AddressedDigest as AddressedDigestType } from '@liteship/core';
import type {
  SupplyChainFacts,
  LockfilePolicyFacts,
  SbomFacts,
  ProvenanceFacts,
  CiAuthorityFacts,
  SupplyChainViolation,
} from '@liteship/gauntlet';
import { parseLockfile, type ParsedLockfile } from './lockfile.js';
import {
  evaluateLockfilePolicy,
  LITESHIP_LOCKFILE_POLICY,
  type LockfilePolicy,
  type PublishedImporters,
} from './supply-chain-policy.js';
import { generateSbom, serializeSbom, sbomAddress, type Sbom, type WorkspaceComponentInput } from './sbom.js';

/** A workspace package the analyzer was handed (name + version + private flag + importer path). */
export interface WorkspacePkg {
  readonly name: string;
  readonly version: string;
  readonly private: boolean;
  /** Lockfile-relative importer path (e.g. `packages/cli`). */
  readonly importerPath: string;
}

/** The repo-relative SBOM artifact location — a reviewable, committed artifact. */
export const SBOM_ARTIFACT_PATH = 'reports/sbom.json' as const;

// ── lockfile policy ─────────────────────────────────────────────────────────

/** Parse + policy-check the lockfile, returning the gate's lockfile facts. */
export function analyzeLockfile(
  lockfileText: string,
  workspace: readonly WorkspacePkg[],
  policy: LockfilePolicy = LITESHIP_LOCKFILE_POLICY,
): { lockfile: ParsedLockfile; facts: LockfilePolicyFacts } {
  const lockfile = parseLockfile(lockfileText);
  const published: PublishedImporters = {
    byPath: new Map(workspace.filter((w) => !w.private).map((w) => [w.importerPath, w.name])),
  };
  const violations = evaluateLockfilePolicy(lockfile, policy, published);
  return {
    lockfile,
    facts: {
      lockfileVersion: lockfile.lockfileVersion,
      packageCount: lockfile.packages.length,
      violations,
    },
  };
}

// ── SBOM ─────────────────────────────────────────────────────────────────────

/** Build the SBOM document + serialized bytes + content address. */
export function buildSbom(
  lockfile: ParsedLockfile,
  workspace: readonly WorkspacePkg[],
): { sbom: Sbom; serialized: string; address: string } {
  const wsComponents: WorkspaceComponentInput[] = workspace.map((w) => ({ name: w.name, version: w.version }));
  const sbom = generateSbom(lockfile, wsComponents);
  return { sbom, serialized: serializeSbom(sbom), address: sbomAddress(sbom) };
}

/**
 * Verify the SBOM is COMPLETE against the lockfile: every external package the
 * lockfile pins (by purl) is a component, and every workspace package too. A gap
 * (lockfile unit with no SBOM component) or a phantom (SBOM component with no
 * lockfile/workspace backing) is a violation.
 */
export function checkSbomCompleteness(
  sbom: Sbom,
  lockfile: ParsedLockfile,
  workspace: readonly WorkspacePkg[],
  address: string,
): SbomFacts {
  const violations: SupplyChainViolation[] = [];
  const sbomPurls = new Set(sbom.components.map((c) => c.purl));

  // Expected purls = every lockfile package + every workspace package.
  const expected = new Map<string, string>(); // purl → human label
  for (const pkg of lockfile.packages) {
    const v = pkg.version.replace(/\(.*\)$/, '');
    expected.set(`pkg:npm/${pkg.name}@${v}`, pkg.key);
  }
  for (const w of workspace) {
    expected.set(`pkg:npm/${w.name}@${w.version}`, `${w.name}@${w.version}`);
  }

  for (const [purl, label] of expected) {
    if (!sbomPurls.has(purl)) {
      violations.push({
        code: 'incomplete-sbom',
        subject: label,
        detail: `present in the lockfile/workspace (purl ${purl}) but absent from the SBOM — the bill of materials is incomplete.`,
      });
    }
  }
  for (const purl of sbomPurls) {
    if (!expected.has(purl)) {
      violations.push({
        code: 'phantom-sbom-component',
        subject: purl,
        detail: 'present in the SBOM but backed by no lockfile or workspace package — a phantom component.',
      });
    }
  }

  return {
    artifactPath: SBOM_ARTIFACT_PATH,
    contentAddress: address,
    componentCount: sbom.components.length,
    violations,
  };
}

// ── provenance ─────────────────────────────────────────────────────────────

const SHA1_RE = /^[0-9a-f]{40}$/;

/**
 * Re-read a ShipCapsule's recorded evidence and VALIDATE it against the live
 * tree: the capsule's `lockfile_address` must equal the address of the CURRENT
 * pnpm-lock.yaml (built from the committed lockfile, not a drifted one); the
 * `source_commit` must be a well-formed SHA-1; `build_env` must be present.
 *
 * The lockfile address is recomputed through the SAME `AddressedDigest.of(bytes)`
 * kernel `liteship ship`'s `lockfileAddress` uses, so a match is a real byte-identity
 * proof, never a re-implemented mirror.
 */
export function validateProvenance(capsule: ShipCapsule.Shape, liveLockfileBytes: Uint8Array): ProvenanceFacts {
  const violations: SupplyChainViolation[] = [];

  const liveLockfileAddress: AddressedDigestType = AddressedDigest.of(liveLockfileBytes);
  if (capsule.lockfile_address.display_id !== liveLockfileAddress.display_id) {
    violations.push({
      code: 'lockfile-address-drift',
      subject: capsule.package_name,
      detail: `the ShipCapsule recorded lockfile_address ${capsule.lockfile_address.display_id} but the live pnpm-lock.yaml addresses to ${liveLockfileAddress.display_id} — the release was built from a drifted lockfile, not the committed one.`,
    });
  }

  if (!SHA1_RE.test(capsule.source_commit)) {
    violations.push({
      code: 'malformed-source-commit',
      subject: capsule.package_name,
      detail: `source_commit "${capsule.source_commit}" is not a well-formed 40-hex git SHA-1 — the provenance cannot be traced to a commit.`,
    });
  }

  if (capsule.build_env.node_version === '' || capsule.build_env.pnpm_version === '') {
    violations.push({
      code: 'absent-build-env',
      subject: capsule.package_name,
      detail:
        'the ShipCapsule build_env is incomplete (node_version or pnpm_version empty) — the build environment provenance is unattested.',
    });
  }

  return {
    packageName: capsule.package_name,
    sourceCommit: capsule.source_commit,
    sourceDirty: capsule.source_dirty,
    violations,
  };
}

/** Decode a ShipCapsule from its CBOR bytes (native `Result` → tagged result). */
export function decodeCapsule(
  bytes: Uint8Array,
): { ok: true; capsule: ShipCapsule.Shape } | { ok: false; error: string } {
  const r = ShipCapsule.decode(bytes);
  if (!r.ok) return { ok: false, error: `ShipCapsule.decode failed: ${r.error}` };
  return { ok: true, capsule: r.value };
}

// ── no-ambient-CI-authority ──────────────────────────────────────────────────

/**
 * Long-lived publish-secret tokens that must NOT appear in a workflow under the
 * OIDC trusted-publishing model. A match is an ambient-authority regression: the
 * publish credential must be the short-lived id-token only, never a stored
 * secret. `GITHUB_TOKEN` is the runner's built-in short-lived token (used for
 * `gh release`), NOT a publish credential — it is explicitly NOT in this set.
 */
const AMBIENT_PUBLISH_TOKENS: readonly string[] = [
  'NPM_TOKEN',
  'NODE_AUTH_TOKEN',
  'NPM_AUTH_TOKEN',
  'npm_config__authToken',
  '_authToken',
];

/**
 * Scan workflow texts for a long-lived publish secret reference. A reference to
 * a token NAME inside a `secrets.<TOKEN>` expression, an `env:` binding, or an
 * `.npmrc` `_authToken=` line is a violation. A bare textual mention inside a
 * `#` comment is NOT (the release.yml documents that NPM_TOKEN is dead) — the
 * scan ignores comment-only lines so the self-documenting workflow stays green.
 */
export function scanCiAuthority(
  workflows: readonly { readonly path: string; readonly text: string }[],
): CiAuthorityFacts {
  const violations: SupplyChainViolation[] = [];
  for (const wf of workflows) {
    const lines = wf.text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const codePart = stripYamlComment(line);
      if (codePart.trim() === '') continue;
      for (const token of AMBIENT_PUBLISH_TOKENS) {
        if (codePart.includes(token)) {
          violations.push({
            code: 'ambient-publish-token',
            subject: `${wf.path}:${i + 1}`,
            detail: `references the long-lived publish secret "${token}" — ambient publish authority. The OIDC trusted-publishing model requires the short-lived id-token only; no stored publish credential may live in a workflow.`,
          });
        }
      }
    }
  }
  return { workflowsScanned: workflows.map((w) => w.path), violations };
}

/**
 * Strip a trailing YAML `#` comment from a line, respecting `#` inside single or
 * double quotes (so a token mentioned in a quoted string still counts, but a
 * `# NPM_TOKEN is dead` doc comment does not). Conservative: on a quote it
 * cannot balance, it keeps the whole line (fail-toward-flagging, never silent).
 */
function stripYamlComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === '#' && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}

/** Read every `.github/workflows/*.yml` / `*.yaml` as `{ path, text }`. */
export function readWorkflows(repoRoot: string): readonly { path: string; text: string }[] {
  const dir = join(repoRoot, '.github', 'workflows');
  if (!existsSync(dir)) return [];
  const out: { path: string; text: string }[] = [];
  for (const entry of readdirSync(dir).sort()) {
    if (!entry.endsWith('.yml') && !entry.endsWith('.yaml')) continue;
    const text = readFileSync(join(dir, entry), 'utf8');
    out.push({ path: `.github/workflows/${entry}`, text });
  }
  return out;
}

// ── full fold ────────────────────────────────────────────────────────────────

/** Everything the analyzer needs to compute the full {@link SupplyChainFacts}. */
export interface AnalyzeInput {
  readonly repoRoot: string;
  readonly lockfileText: string;
  readonly liveLockfileBytes: Uint8Array;
  readonly workspace: readonly WorkspacePkg[];
  /** A decoded ShipCapsule to validate provenance against, when one is available. */
  readonly capsule?: ShipCapsule.Shape;
  readonly policy?: LockfilePolicy;
}

/**
 * Compute the complete {@link SupplyChainFacts} — the host's whole job. The
 * caller injects the result onto the GateContext (`context.supplyChain`) for the
 * lean {@link supplyChainGate} to fold. Also returns the serialized SBOM so the
 * caller can write the reviewable artifact.
 */
export function analyzeSupplyChain(input: AnalyzeInput): { facts: SupplyChainFacts; sbomJson: string } {
  const policy = input.policy ?? LITESHIP_LOCKFILE_POLICY;
  const { lockfile, facts: lockfileFacts } = analyzeLockfile(input.lockfileText, input.workspace, policy);
  const { sbom, serialized, address } = buildSbom(lockfile, input.workspace);
  const sbomFacts = checkSbomCompleteness(sbom, lockfile, input.workspace, address);
  const ciFacts = scanCiAuthority(readWorkflows(input.repoRoot));

  const facts: SupplyChainFacts = {
    lockfile: lockfileFacts,
    sbom: sbomFacts,
    ci: ciFacts,
    ...(input.capsule !== undefined ? { provenance: validateProvenance(input.capsule, input.liveLockfileBytes) } : {}),
  };
  return { facts, sbomJson: serialized };
}
