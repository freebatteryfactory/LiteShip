/**
 * Scaffold engine for `create-liteship` — copies the embedded
 * `templates/default/` Astro + \@czap starter into a target directory.
 *
 * Template copying is a `node:fs` copy enumerated by the shared
 * `@czap/core` file walker; the only dynamic pieces are (1) renaming
 * `gitignore` -> `.gitignore` (npm strips `.gitignore` files from
 * published tarballs, so the template stores it un-dotted) and
 * (2) rewriting the scaffolded `package.json` `name` field to a
 * valid npm name derived from the target directory.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeRepoPath } from '@czap/core';
import { walkFiles } from '@czap/core/fs-walk';
import { ValidationError } from '@czap/error';

/** Files stored under a neutral name in the template, restored on copy. */
const TEMPLATE_RENAMES: Readonly<Record<string, string>> = {
  gitignore: '.gitignore',
};

/** Result of a successful scaffold: where it went and what was written. */
export interface ScaffoldResult {
  /** Absolute path of the scaffolded project. */
  readonly projectDir: string;
  /** The npm package name written into the project's package.json. */
  readonly projectName: string;
  /** Relative paths of every file written, sorted, `/`-separated. */
  readonly files: readonly string[];
}

/** Options for {@link scaffold}. */
export interface ScaffoldOptions {
  /** Base directory relative targets resolve against (default: process.cwd()). */
  readonly cwd?: string;
  /** Override the template directory (tests point this at fixtures). */
  readonly templateDir?: string;
}

/** Absolute path of the embedded default template (works from src/ and dist/). */
export function defaultTemplateDir(): string {
  return fileURLToPath(new URL('../templates/default/', import.meta.url));
}

/**
 * Derive a valid npm package name from a directory name: lowercased,
 * invalid characters collapsed to `-`, leading/trailing separators
 * trimmed. Falls back to `liteship-app` when nothing survives.
 */
export function projectNameFromDir(dir: string): string {
  const base = basename(resolve(dir));
  const name = base
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '');
  return name.length > 0 ? name : 'liteship-app';
}

/**
 * Scaffold the default template into `targetDir`.
 *
 * Refuses (with a teaching {@link ValidationError}) when the target exists
 * and is a non-empty directory or a non-directory — scaffolding never
 * overwrites your files. An existing *empty* directory is fine.
 */
export function scaffold(targetDir: string, options: ScaffoldOptions = {}): ScaffoldResult {
  const cwd = options.cwd ?? process.cwd();
  const templateDir = options.templateDir ?? defaultTemplateDir();
  const projectDir = resolve(cwd, targetDir);

  if (existsSync(projectDir)) {
    const stats = statSync(projectDir);
    if (!stats.isDirectory()) {
      throw ValidationError(
        'scaffold',
        `create-liteship: "${projectDir}" already exists and is a file, not a directory.\n` +
          `  Scaffolding never overwrites your data. Pick a different name:\n` +
          `    npm create liteship my-liteship-app`,
      );
    }
    if (readdirSync(projectDir).length > 0) {
      throw ValidationError(
        'scaffold',
        `create-liteship: "${projectDir}" already exists and is not empty.\n` +
          `  Scaffolding never overwrites your files — that is how half-merged\n` +
          `  starters eat an afternoon. Either:\n` +
          `    - pick a fresh directory:  npm create liteship my-liteship-app\n` +
          `    - or empty the target yourself, then re-run.`,
      );
    }
  }

  mkdirSync(projectDir, { recursive: true });
  cpSync(templateDir, projectDir, { recursive: true });

  // Restore names npm strips from published tarballs.
  for (const [from, to] of Object.entries(TEMPLATE_RENAMES)) {
    const fromPath = join(projectDir, from);
    if (existsSync(fromPath)) renameSync(fromPath, join(projectDir, to));
  }

  // Stamp the project name into package.json.
  const projectName = projectNameFromDir(projectDir);
  const manifestPath = join(projectDir, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  manifest['name'] = projectName;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  // Shared walker returns absolute paths; the result stays sorted relative `/`
  // paths — slice off the project root and canonicalize separators (POSIX form
  // on every host, matching the prior local walker), then re-sort to the same
  // full-path lexicographic order.
  const files = walkFiles(projectDir)
    .map((abs) => normalizeRepoPath(abs.slice(projectDir.length + 1)))
    .sort();
  return { projectDir, projectName, files };
}
