/** Semantic reader for the build-once release-promotion contract. @module */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ReleasePromotionWorkspace {
  readonly releaseWorkflow: string;
  readonly ciWorkflow: string;
  readonly rootScripts: Readonly<Record<string, string>>;
}

/** Read the three canonical owners consumed by the release-promotion invariant. */
export function readReleasePromotionWorkspace(root: string): ReleasePromotionWorkspace {
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
    readonly scripts?: unknown;
  };
  if (typeof manifest.scripts !== 'object' || manifest.scripts === null || Array.isArray(manifest.scripts)) {
    throw new TypeError('root package.json scripts must be an object');
  }
  return {
    releaseWorkflow: readFileSync(resolve(root, '.github/workflows/release.yml'), 'utf8'),
    ciWorkflow: readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8'),
    rootScripts: manifest.scripts as Readonly<Record<string, string>>,
  };
}

/** Extract one top-level workflow job without making tests couple to file reads. */
export function workflowJob(text: string, name: string, next?: string): string {
  const start = text.indexOf(`  ${name}:`);
  if (start < 0) throw new TypeError(`missing workflow job ${name}`);
  const end = next === undefined ? text.length : text.indexOf(`  ${next}:`, start + 1);
  if (end < 0) throw new TypeError(`missing workflow job ${next}`);
  return text.slice(start, end);
}
