/** Canonical physical-path identity for Node-hosted CLI and proof surfaces. */

import { realpathSync } from 'node:fs';
import path, { type PlatformPath } from 'node:path';

export interface PhysicalPathSemantics {
  readonly path: PlatformPath;
  readonly realpath: (absolutePath: string) => string;
}

const nativeSemantics: PhysicalPathSemantics = {
  path,
  realpath: realpathSync.native,
};

/** Resolve aliases, symlinks, short names, and platform spelling to one physical identity. */
export function canonicalPhysicalPath(value: string, semantics: PhysicalPathSemantics = nativeSemantics): string {
  return semantics.realpath(semantics.path.resolve(value));
}

/**
 * Return a physical path relative to `root`, or `null` when the candidate is outside it.
 * Both operands are canonicalized before containment is decided; string aliases never
 * participate in the security or evidence boundary.
 */
export function relativePhysicalPath(
  root: string,
  candidate: string,
  semantics: PhysicalPathSemantics = nativeSemantics,
): string | null {
  const physicalRoot = canonicalPhysicalPath(root, semantics);
  const physicalCandidate = canonicalPhysicalPath(candidate, semantics);
  const relative = semantics.path.relative(physicalRoot, physicalCandidate);
  if (relative === '..' || relative.startsWith(`..${semantics.path.sep}`) || semantics.path.isAbsolute(relative)) {
    return null;
  }
  return relative;
}
