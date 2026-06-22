/**
 * SBOM generator — a deterministic, content-addressed Software Bill of Materials
 * over the workspace package graph + the pnpm lockfile (Slice C, the avionics
 * tier).
 *
 * FORMAT: CycloneDX 1.5 JSON (the simpler, widely-tooled choice over SPDX —
 * documented here). Every component is a `pkg:` PURL with its resolved version
 * and, for external registry units, the lockfile's integrity hash mapped onto a
 * CycloneDX `hashes` entry. Internal `@czap/*` workspace packages are emitted as
 * `application` components (no registry integrity — they ARE the build), every
 * external lockfile unit as a `library` component.
 *
 * DETERMINISM: components are sorted by `purl`, the JSON is serialized with
 * sorted keys, and the document is content-addressed (an {@link AddressedDigest}
 * over its canonical CBOR) so two runs over the same lockfile produce a
 * byte-identical SBOM and a stable address. The CycloneDX `serialNumber` /
 * timestamp fields that would inject entropy are DELIBERATELY OMITTED — an SBOM
 * meant to be content-addressed must carry no run-clock.
 *
 * @module
 */

import { AddressedDigest, CanonicalCbor } from '@czap/core';
import type { ParsedLockfile } from './lockfile.js';

/** A single CycloneDX component (a package in the bill of materials). */
export interface SbomComponent {
  readonly type: 'application' | 'library';
  readonly name: string;
  readonly version: string;
  /** Package URL (`pkg:npm/<name>@<version>`) — the stable component identity. */
  readonly purl: string;
  /** Integrity hashes, when the lockfile recorded one (external registry units). */
  readonly hashes?: readonly { readonly alg: string; readonly content: string }[];
}

/** The emitted SBOM document (CycloneDX 1.5 subset) + its content address. */
export interface Sbom {
  readonly bomFormat: 'CycloneDX';
  readonly specVersion: '1.5';
  readonly components: readonly SbomComponent[];
}

/** An internal workspace package the SBOM marks as `application`. */
export interface WorkspaceComponentInput {
  readonly name: string;
  readonly version: string;
}

/**
 * Map a pnpm lockfile integrity string (`sha512-<base64>`) to a CycloneDX hash
 * entry. pnpm records SRI-style `<alg>-<base64>`; CycloneDX wants
 * `{ alg: 'SHA-512', content: '<hex-or-base64>' }`. We keep the base64 content
 * verbatim (the lockfile's own canonical form) and normalize the alg token.
 */
function toCycloneHash(integrity: string): { alg: string; content: string } | null {
  const dash = integrity.indexOf('-');
  if (dash <= 0) return null;
  const algRaw = integrity.slice(0, dash);
  const content = integrity.slice(dash + 1);
  const alg =
    algRaw === 'sha512' ? 'SHA-512' : algRaw === 'sha256' ? 'SHA-256' : algRaw === 'sha1' ? 'SHA-1' : null;
  if (alg === null) return null;
  return { alg, content };
}

/** Build a single `pkg:npm/<name>@<version>` PURL. */
function purlOf(name: string, version: string): string {
  // PURL percent-encodes the scope `@` slash? No — npm PURLs keep `@scope/name`
  // literal in the namespace/name; the version `@` is the separator. pnpm keys
  // can carry a peer suffix `(…)`; strip it for the version slot.
  const cleanVersion = version.replace(/\(.*\)$/, '');
  return `pkg:npm/${name}@${cleanVersion}`;
}

/**
 * Generate the SBOM from the lockfile's external packages + the internal
 * workspace packages. Deterministic: components sorted by purl, deduped by purl.
 */
export function generateSbom(lockfile: ParsedLockfile, workspace: readonly WorkspaceComponentInput[]): Sbom {
  const byPurl = new Map<string, SbomComponent>();

  for (const ws of workspace) {
    const purl = purlOf(ws.name, ws.version);
    byPurl.set(purl, { type: 'application', name: ws.name, version: ws.version, purl });
  }

  for (const pkg of lockfile.packages) {
    const purl = purlOf(pkg.name, pkg.version);
    if (byPurl.has(purl)) continue; // a workspace component already owns this purl
    const hash = pkg.integrity !== null ? toCycloneHash(pkg.integrity) : null;
    byPurl.set(purl, {
      type: 'library',
      name: pkg.name,
      version: pkg.version,
      purl,
      ...(hash !== null ? { hashes: [hash] } : {}),
    });
  }

  const components = [...byPurl.values()].sort((a, b) => (a.purl < b.purl ? -1 : a.purl > b.purl ? 1 : 0));
  return { bomFormat: 'CycloneDX', specVersion: '1.5', components };
}

/** Recursively sort object keys so the JSON serialization is canonical/stable. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Serialize an SBOM to deterministic, key-sorted, newline-terminated JSON. */
export function serializeSbom(sbom: Sbom): string {
  return `${JSON.stringify(sortKeys(sbom), null, 2)}\n`;
}

/**
 * Content-address an SBOM via the canonical-CBOR + AddressedDigest kernel (the
 * SAME kernel ShipCapsule uses — never forked). Returns the display id.
 */
export function sbomAddress(sbom: Sbom): string {
  const canonical = CanonicalCbor.encode(sortKeys(sbom) as Parameters<typeof CanonicalCbor.encode>[0]);
  return AddressedDigest.of(canonical).display_id;
}
