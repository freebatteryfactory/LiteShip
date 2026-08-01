/**
 * Dynamic-code residue law for shipped non-TypeScript runtime sources.
 *
 * The blocking ESLint authority enforces `no-eval` / `no-new-func` /
 * `no-implied-eval` over the TypeScript trees only — its globs are
 * `**​/*.ts`, so a published `.astro`, `.js`, `.mjs`, or `.cjs` source under
 * `packages/<pkg>/src` is executable code the linter never inspects. This engine
 * is the equivalent authority for those files: a line classifier plus a
 * repository sweep, consumed by the unit law that pins both package source
 * trees and manifest-published runtime files to zero findings.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { ValidationError } from '../../packages/error/src/index.js';

export type DynamicCodeKind = 'EVAL_CALL' | 'FUNCTION_CONSTRUCTOR' | 'STRING_TIMER';

export interface DynamicCodeFinding {
  readonly file: string;
  readonly line: number;
  readonly kind: DynamicCodeKind;
  readonly text: string;
}

export interface DynamicCodeScan {
  readonly findings: readonly DynamicCodeFinding[];
  readonly swept: readonly string[];
}

const EVAL_CALL = /(?<![.\w$])eval\s*\(/u;
const FUNCTION_CONSTRUCTOR = /\bnew\s+Function\s*\(|(?<![.\w$])Function\s*\(/u;
const STRING_TIMER = /(?<![.\w$])set(?:Timeout|Interval|Immediate)\s*\(\s*['"`]/u;

/**
 * Classify one source line. Comment-shaped lines are exempt so prose about
 * the rules cannot red the gate; everything else that spells a dynamic-code
 * evaluation form is a finding.
 */
export function classifyDynamicCodeLine(line: string): DynamicCodeKind | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return null;
  if (EVAL_CALL.test(line)) return 'EVAL_CALL';
  if (FUNCTION_CONSTRUCTOR.test(line)) return 'FUNCTION_CONSTRUCTOR';
  if (STRING_TIMER.test(line)) return 'STRING_TIMER';
  return null;
}

const SHIPPED_EXTENSIONS = ['.astro', '.js', '.mjs', '.cjs'];

interface PackageManifest {
  readonly files?: unknown;
  readonly exports?: unknown;
  readonly bin?: unknown;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function runtimeSource(path: string): boolean {
  return SHIPPED_EXTENSIONS.some((extension) => path.endsWith(extension));
}

function authoredPackageFiles(dir: string, files: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    // `dist` is a derivable projection of the `src` authority and may appear
    // only because a local build ran. Scanning it would make the census depend
    // on dirty build state and duplicate every authored source finding.
    if (name === 'dist' || name === 'node_modules') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) authoredPackageFiles(path, files);
    else files.push(path);
  }
}

function manifestGlobRegExp(pattern: string): RegExp {
  const normalized = pattern.replaceAll('\\', '/').replace(/^\.\//u, '');
  let source = '^';
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]!;
    if (char === '*') {
      if (normalized[index + 1] === '*') {
        source += '.*';
        index += 1;
      } else {
        source += '[^/]*';
      }
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    }
  }
  return new RegExp(`${source}$`, 'u');
}

function normalizedManifestTarget(packageDir: string, target: string, authority: string): string {
  const normalized = target.replaceAll('\\', '/').replace(/^\.\//u, '');
  const absolute = resolve(packageDir, normalized);
  const withinPackage = relative(packageDir, absolute).replaceAll('\\', '/');
  if (withinPackage === '..' || withinPackage.startsWith('../')) {
    throw ValidationError('publishedRuntimeRoots', `${authority} target escapes its package: ${target}`);
  }
  return absolute;
}

function exportTargets(value: unknown, authority: string, targets: string[]): void {
  if (value === null) return;
  if (typeof value === 'string') {
    targets.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) exportTargets(child, `${authority}[${index}]`, targets);
    return;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) exportTargets(child, `${authority}.${key}`, targets);
    return;
  }
  throw ValidationError(
    'publishedRuntimeRoots',
    `${authority} must contain only string, object, array, or null targets`,
  );
}

function binTargets(value: unknown, authority: string): readonly string[] {
  if (typeof value === 'string') return [value];
  if (!isRecord(value)) {
    throw ValidationError('publishedRuntimeRoots', `${authority} must be a string or command-to-path record`);
  }
  const targets: string[] = [];
  for (const [command, target] of Object.entries(value)) {
    if (typeof target !== 'string') {
      throw ValidationError('publishedRuntimeRoots', `${authority}.${command} must be a string target`);
    }
    targets.push(target);
  }
  return targets;
}

/**
 * Every authored non-TypeScript runtime path a package publishes, derived from
 * the union of its `files`, recursively nested `exports`, and `bin` targets.
 *
 * THE CLASS RULE: the ANCHOR is every package manifest under `packages/`; the
 * ALLOWLIST is a structurally valid publication authority. A malformed or
 * absent authority is a refusal, never an empty contribution. Generated
 * `dist` targets resolve back to the separately swept `src` authority so local
 * build state cannot change the census.
 */
export function publishedRuntimeRoots(repoRoot: string): readonly string[] {
  const packagesDir = join(repoRoot, 'packages');
  const published = new Set<string>();
  for (const packageName of readdirSync(packagesDir).sort()) {
    const packageDir = join(packagesDir, packageName);
    if (!statSync(packageDir).isDirectory()) continue;
    const manifestPath = join(packageDir, 'package.json');
    if (!existsSync(manifestPath)) {
      throw ValidationError('publishedRuntimeRoots', `${relative(repoRoot, packageDir)} has no package.json authority`);
    }

    let manifest: PackageManifest;
    try {
      const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (!isRecord(parsed)) throw ValidationError('publishedRuntimeRoots', `${manifestPath} is not a JSON object`);
      manifest = parsed;
    } catch (cause) {
      if (isRecord(cause) && cause._tag === 'ValidationError') throw cause;
      throw ValidationError('publishedRuntimeRoots', `cannot parse ${manifestPath}: ${String(cause)}`);
    }

    const hasFiles = manifest.files !== undefined;
    const hasExports = manifest.exports !== undefined;
    const hasBin = manifest.bin !== undefined;
    if (!hasFiles && !hasExports && !hasBin) {
      throw ValidationError(
        'publishedRuntimeRoots',
        `${relative(repoRoot, manifestPath)} declares no files, exports, or bin authority`,
      );
    }

    const packageFiles: string[] = [];
    authoredPackageFiles(packageDir, packageFiles);
    if (hasFiles) {
      if (!Array.isArray(manifest.files) || manifest.files.some((entry) => typeof entry !== 'string')) {
        throw ValidationError('publishedRuntimeRoots', `${relative(repoRoot, manifestPath)} files must be strings`);
      }
      for (const entry of manifest.files) {
        const matcher = manifestGlobRegExp(entry);
        const declaredPath = normalizedManifestTarget(packageDir, entry, `${packageName}.files`);
        const directoryPrefix = entry.replaceAll('\\', '/').replace(/^\.\//u, '').replace(/\/$/u, '');
        const directoryEntry =
          !entry.includes('*') &&
          !entry.includes('?') &&
          existsSync(declaredPath) &&
          statSync(declaredPath).isDirectory();
        for (const file of packageFiles) {
          const withinPackage = relative(packageDir, file).replaceAll('\\', '/');
          if (
            (matcher.test(withinPackage) || (directoryEntry && withinPackage.startsWith(`${directoryPrefix}/`))) &&
            runtimeSource(file)
          ) {
            published.add(file);
          }
        }
      }
    }

    const explicitTargets: string[] = [];
    if (hasExports) exportTargets(manifest.exports, `${packageName}.exports`, explicitTargets);
    if (hasBin) explicitTargets.push(...binTargets(manifest.bin, `${packageName}.bin`));
    for (const target of explicitTargets) {
      const absolute = normalizedManifestTarget(packageDir, target, packageName);
      const withinPackage = relative(packageDir, absolute).replaceAll('\\', '/');
      if (withinPackage === 'dist' || withinPackage.startsWith('dist/')) continue;
      if (runtimeSource(absolute)) {
        if (!existsSync(absolute) || !statSync(absolute).isFile()) {
          throw ValidationError(
            'publishedRuntimeRoots',
            `${relative(repoRoot, manifestPath)} publishes missing runtime target ${target}`,
          );
        }
        published.add(absolute);
      }
    }
  }
  return [...published].sort();
}

function collectShipped(dir: string, files: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) collectShipped(path, files);
    else if (SHIPPED_EXTENSIONS.some((ext) => name.endsWith(ext))) files.push(path);
  }
}

/**
 * Sweep every package source tree plus every manifest-published authored
 * non-TypeScript runtime source for dynamic-code forms. Returns findings plus
 * the swept inventory so the consuming law can prove it saw the real population.
 */
export function scanShippedDynamicCode(repoRoot: string): DynamicCodeScan {
  const files = new Set<string>(publishedRuntimeRoots(repoRoot));
  const packagesDir = join(repoRoot, 'packages');
  for (const pkg of readdirSync(packagesDir).sort()) {
    const src = join(packagesDir, pkg, 'src');
    if (existsSync(src)) {
      const sourceFiles: string[] = [];
      collectShipped(src, sourceFiles);
      for (const file of sourceFiles) files.add(file);
    }
  }
  const findings: DynamicCodeFinding[] = [];
  const swept: string[] = [];
  for (const file of [...files].sort()) {
    const rel = relative(repoRoot, file).replace(/\\/g, '/');
    swept.push(rel);
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const kind = classifyDynamicCodeLine(lines[index]!);
      if (kind !== null) findings.push({ file: rel, line: index + 1, kind, text: lines[index]!.trim() });
    }
  }
  return { findings, swept };
}
