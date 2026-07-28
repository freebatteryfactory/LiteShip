/** Canonical filename restoration law for published scaffold templates. @module */

import { existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

/** Files stored under neutral names because npm strips their authored dotfile form. */
export const TEMPLATE_RENAMES: Readonly<Record<string, string>> = Object.freeze({
  gitignore: '.gitignore',
});

/** Project one package-safe template filename to the consumer-visible name. */
export function restoredTemplateName(name: string): string {
  return TEMPLATE_RENAMES[name] ?? name;
}

/** Restore every package-safe placeholder beneath one copied template root. */
export function restoreTemplateNames(root: string): void {
  for (const [from, to] of Object.entries(TEMPLATE_RENAMES)) {
    const fromPath = join(root, from);
    if (existsSync(fromPath)) renameSync(fromPath, join(root, to));
  }
}
