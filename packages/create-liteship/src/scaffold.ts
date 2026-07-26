/**
 * Scaffold engine for `create-liteship` — copies the embedded
 * `templates/default/` Astro + \@liteship starter into a target directory.
 *
 * Template copying is staged beside the target and published with one rename.
 * The shared `@liteship/core` file walker inventories the result; the canonical
 * filename-restoration map recovers package-stripped dotfiles; and the copied
 * manifest receives the npm-safe name derived from the target directory.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeRepoPath } from '@liteship/core';
import { walkFiles } from '@liteship/core/fs-walk';
import { ValidationError } from '@liteship/error';
import { restoreTemplateNames, TEMPLATE_RENAMES } from './template-renames.js';

/** Machine-readable reasons the scaffold engine can refuse an authored request. */
export type ScaffoldFailureReason =
  | 'target-is-file'
  | 'target-not-empty'
  | 'template-missing'
  | 'template-not-directory'
  | 'template-missing-manifest'
  | 'template-invalid-manifest'
  | 'template-dotfile-conflict'
  | 'template-target-overlap'
  | 'template-copy-failed'
  | 'target-create-failed';

/** A typed scaffold refusal carried through LiteShip's shared error algebra. */
export interface ScaffoldError extends ValidationError {
  readonly reason: ScaffoldFailureReason;
  readonly path: string;
}

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
  /** Override the template directory, resolved against `cwd` when relative. */
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

function scaffoldError(reason: ScaffoldFailureReason, path: string, detail: string): ScaffoldError {
  return Object.assign(ValidationError('scaffold', detail), { reason, path });
}

function containsPath(parent: string, candidate: string): boolean {
  const child = relative(parent, candidate);
  return child === '' || (child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child));
}

function physicalPath(path: string): string {
  const tail: string[] = [];
  let ancestor = path;
  while (!existsSync(ancestor)) {
    const next = dirname(ancestor);
    if (next === ancestor) break;
    tail.push(basename(ancestor));
    ancestor = next;
  }
  let projected = existsSync(ancestor) ? realpathSync.native(ancestor) : resolve(ancestor);
  for (const segment of tail.reverse()) projected = resolve(projected, segment);
  return projected;
}

function readTemplateManifest(templateDir: string): Record<string, unknown> {
  if (!existsSync(templateDir)) {
    throw scaffoldError(
      'template-missing',
      templateDir,
      `create-liteship: template directory does not exist: "${templateDir}".\n` +
        '  Reinstall create-liteship or choose an existing template directory.',
    );
  }

  let templateStats;
  try {
    templateStats = statSync(templateDir);
  } catch (cause) {
    throw Object.assign(
      scaffoldError(
        'template-missing',
        templateDir,
        `create-liteship: template directory cannot be read: "${templateDir}".\n` +
          '  Check the path and its permissions, then retry.',
      ),
      { cause },
    );
  }
  if (!templateStats.isDirectory()) {
    throw scaffoldError(
      'template-not-directory',
      templateDir,
      `create-liteship: template path is not a directory: "${templateDir}".`,
    );
  }

  const manifestPath = join(templateDir, 'package.json');
  if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) {
    throw scaffoldError(
      'template-missing-manifest',
      manifestPath,
      `create-liteship: template is incomplete; expected a package.json at "${manifestPath}".`,
    );
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (cause) {
    throw Object.assign(
      scaffoldError(
        'template-invalid-manifest',
        manifestPath,
        `create-liteship: template package.json is not valid JSON: "${manifestPath}".`,
      ),
      { cause },
    );
  }
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
    throw scaffoldError(
      'template-invalid-manifest',
      manifestPath,
      `create-liteship: template package.json must contain a JSON object: "${manifestPath}".`,
    );
  }

  for (const [placeholder, restored] of Object.entries(TEMPLATE_RENAMES)) {
    if (existsSync(join(templateDir, placeholder)) && existsSync(join(templateDir, restored))) {
      throw scaffoldError(
        'template-dotfile-conflict',
        templateDir,
        `create-liteship: template contains both "${placeholder}" and "${restored}"; refusing an ambiguous restore.`,
      );
    }
  }

  return manifest as Record<string, unknown>;
}

/**
 * Scaffold the default template into `targetDir`.
 *
 * Refuses with a typed {@link ScaffoldError} when the target would be
 * overwritten, the template is missing/incomplete/ambiguous, source and target
 * overlap, or the staged tree cannot be published. The destination is touched
 * only after the complete staged scaffold is ready; an existing empty directory
 * remains an admitted target.
 */
export function scaffold(targetDir: string, options: ScaffoldOptions = {}): ScaffoldResult {
  const cwd = options.cwd ?? process.cwd();
  const templateDir = resolve(cwd, options.templateDir ?? defaultTemplateDir());
  const projectDir = resolve(cwd, targetDir);

  // Validate the complete template contract before touching the destination.
  // A missing or partial custom template must never leave a half-scaffolded app.
  const templateManifest = readTemplateManifest(templateDir);
  const physicalTemplateDir = physicalPath(templateDir);
  const physicalProjectDir = physicalPath(projectDir);
  if (containsPath(physicalTemplateDir, physicalProjectDir) || containsPath(physicalProjectDir, physicalTemplateDir)) {
    throw scaffoldError(
      'template-target-overlap',
      projectDir,
      `create-liteship: template and target directories overlap (template: "${templateDir}", target: "${projectDir}").`,
    );
  }

  const targetExisted = existsSync(projectDir);
  if (targetExisted) {
    const stats = statSync(projectDir);
    if (!stats.isDirectory()) {
      throw scaffoldError(
        'target-is-file',
        projectDir,
        `create-liteship: "${projectDir}" already exists and is a file, not a directory.\n` +
          `  Scaffolding never overwrites your data. Pick a different name:\n` +
          `    npm create liteship my-liteship-app`,
      );
    }
    if (readdirSync(projectDir).length > 0) {
      throw scaffoldError(
        'target-not-empty',
        projectDir,
        `create-liteship: "${projectDir}" already exists and is not empty.\n` +
          `  Scaffolding never overwrites your files — that is how half-merged\n` +
          `  starters eat an afternoon. Either:\n` +
          `    - pick a fresh directory:  npm create liteship my-liteship-app\n` +
          `    - or empty the target yourself, then re-run.`,
      );
    }
  }

  const parentDir = dirname(projectDir);
  try {
    mkdirSync(parentDir, { recursive: true });
  } catch (cause) {
    throw Object.assign(
      scaffoldError(
        'target-create-failed',
        projectDir,
        `create-liteship: could not prepare the target directory "${projectDir}".`,
      ),
      { cause },
    );
  }

  let stagingDir: string | undefined;
  try {
    stagingDir = mkdtempSync(join(parentDir, `.${basename(projectDir)}.create-liteship-`));
    cpSync(templateDir, stagingDir, { recursive: true });

    // Restore names npm strips from published tarballs.
    restoreTemplateNames(stagingDir);

    // Stamp the project name into package.json.
    const projectName = projectNameFromDir(projectDir);
    const manifestPath = join(stagingDir, 'package.json');
    const manifest = { ...templateManifest, name: projectName };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const files = walkFiles(stagingDir)
      .map((abs) => normalizeRepoPath(abs.slice(stagingDir!.length + 1)))
      .sort();

    // Publishing is one rename. An existing empty target is removed only after
    // the complete staged tree exists; rmdirSync refuses if another writer raced
    // content into it, so scaffolding never deletes that content.
    try {
      if (targetExisted) rmdirSync(projectDir);
      renameSync(stagingDir, projectDir);
      stagingDir = undefined;
    } catch (cause) {
      if (targetExisted && !existsSync(projectDir)) mkdirSync(projectDir);
      throw Object.assign(
        scaffoldError(
          'target-create-failed',
          projectDir,
          `create-liteship: could not publish the completed scaffold at "${projectDir}".`,
        ),
        { cause },
      );
    }

    return { projectDir, projectName, files };
  } catch (cause) {
    if (hasScaffoldReason(cause, 'target-create-failed')) throw cause;
    throw Object.assign(
      scaffoldError(
        'template-copy-failed',
        templateDir,
        `create-liteship: failed to copy template "${templateDir}" into "${projectDir}".`,
      ),
      { cause },
    );
  } finally {
    if (stagingDir !== undefined) rmSync(stagingDir, { recursive: true, force: true });
  }
}

function hasScaffoldReason(error: unknown, reason: ScaffoldFailureReason): error is ScaffoldError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { _tag?: unknown })._tag === 'ValidationError' &&
    (error as { reason?: unknown }).reason === reason
  );
}
