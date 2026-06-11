/**
 * Build-time boundary manifest derivation.
 *
 * Scans a project for boundary definition modules (`boundaries.ts` /
 * `*.boundaries.ts`) and `@quantize` CSS blocks, then derives the
 * `BoundaryManifest` that `virtual:czap/boundaries` exports and the
 * `@czap/astro` integration writes to `czap-boundary-manifest.json`: each
 * boundary's `Boundary.make` content address plus precompiled
 * `CompiledOutputs` for every (motion x design) tier.
 *
 * This is the build half of the edge caching design (ADR-0003): identity
 * and compilation are derived here, so edge workers consume the manifest
 * instead of hand-typing boundary ids or bundling the CSS compiler.
 *
 * @module
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Diagnostics } from '@czap/core';
import type { Boundary } from '@czap/core';
import { CSSCompiler } from '@czap/compiler';
import { DESIGN_TIERS, MOTION_TIERS, tierKey } from '@czap/edge';
import type { BoundaryManifest, BoundaryManifestEntry, CompiledOutputs, TierKey } from '@czap/edge';
import { parseQuantizeBlocks, viewportContainmentRule, type QuantizeStateBody } from './css-quantize.js';
import { findConventionFiles } from './resolve-fs.js';

const DIAGNOSTIC_SOURCE = 'czap/vite.boundary-manifest';

/** Directory names never descended into while scanning a project. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.astro', '.wrangler', '.cache', '.output']);

/** Options for {@link collectBoundaryManifest}. */
export interface CollectBoundaryManifestOptions {
  /**
   * Extra directory holding boundary definitions -- mirror of the plugin's
   * `dirs.boundary` override; scanned in addition to the project walk.
   */
  readonly boundaryDir?: string;
}

interface ProjectScan {
  readonly boundaryFiles: readonly string[];
  readonly cssFiles: readonly string[];
}

function isBoundaryModuleFile(fileName: string): boolean {
  return fileName === 'boundaries.ts' || fileName.endsWith('.boundaries.ts');
}

function scanProject(projectRoot: string): ProjectScan {
  const boundaryFiles: string[] = [];
  const cssFiles: string[] = [];
  const stack: string[] = [projectRoot];
  // Physical (realpath) identity of every directory already walked --
  // symlinked directories are followed below, so without this a circular
  // link (`dir/loop -> dir`) would recurse forever.
  const visited = new Set<string>();

  while (stack.length > 0) {
    const dir = stack.pop()!;
    let realDir: string;
    try {
      realDir = fs.realpathSync(dir);
    } catch {
      // Broken link or vanished dir; readdir below reports the details.
      realDir = path.resolve(dir);
    }
    if (visited.has(realDir)) continue;
    visited.add(realDir);
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      Diagnostics.warnOnce({
        source: DIAGNOSTIC_SOURCE,
        code: 'scan-readdir-failed',
        message: `Could not read "${dir}" while scanning for boundary definitions; entries under it are skipped.`,
        cause: error,
      });
      continue;
    }
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        // Follow links to their targets (linked source dirs scan like
        // real ones); the visited set above contains circular links.
        try {
          const stat = fs.statSync(entryPath);
          isDirectory = stat.isDirectory();
          isFile = stat.isFile();
        } catch {
          continue; // Dangling symlink -- nothing to scan.
        }
      }
      if (isDirectory) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(entryPath);
        continue;
      }
      if (!isFile) continue;
      if (isBoundaryModuleFile(entry.name)) {
        boundaryFiles.push(entryPath);
      } else if (entry.name.endsWith('.css')) {
        cssFiles.push(entryPath);
      }
    }
  }

  return { boundaryFiles, cssFiles };
}

/**
 * Import a boundary definition module and return every export tagged
 * `BoundaryDef`, keyed by export name. Import failures degrade to an
 * empty result with a diagnostic (same policy as `resolvePrimitive`).
 */
async function importBoundaryExports(modulePath: string): Promise<ReadonlyMap<string, Boundary.Shape>> {
  const found = new Map<string, Boundary.Shape>();
  let imported: Record<string, unknown> | null = null;
  try {
    // Native ESM caches dynamic imports by URL — after a dev-server edit
    // to a boundaries module, re-importing the bare file URL would serve
    // the STALE exports even though the manifest recollects. The mtime
    // query busts the cache exactly when the file content changed (and
    // keeps the URL stable — and the module cached — when it didn't).
    const mtime = fs.statSync(modulePath).mtimeMs;
    imported = (await import(/* @vite-ignore */ `${pathToFileURL(modulePath).href}?mtime=${mtime}`)) as Record<
      string,
      unknown
    >;
  } catch (error) {
    Diagnostics.warn({
      source: DIAGNOSTIC_SOURCE,
      code: 'import-failed',
      message: `Failed to import boundary module "${modulePath}"; its boundaries are missing from the manifest.`,
      cause: error,
    });
  }
  for (const [exportName, value] of Object.entries(imported ?? {})) {
    if (value && typeof value === 'object' && '_tag' in value && value._tag === 'BoundaryDef') {
      // Runtime `_tag` guard validates the shape; same containment cast as
      // the resolver import boundary in resolve-utils.ts.
      found.set(exportName, value as Boundary.Shape);
    }
  }
  return found;
}

/**
 * Compile one boundary's `@quantize` states into per-tier
 * `CompiledOutputs`, covering the full finite (motion x design)
 * tier grid so any tier a request resolves to has a precompiled entry.
 *
 * The container queries are tier-invariant (the CSS itself adapts via
 * `@container`); `propertyRegistrations` exist solely to enable
 * GPU-interpolated transitions, so the `none` motion tier (reduced
 * motion) omits them.
 */
function compileOutputsByTier(
  boundary: Boundary.Shape,
  states: Record<string, QuantizeStateBody>,
): Readonly<Partial<Record<TierKey, CompiledOutputs>>> {
  // Bridge the parser's rule shape (props) to the compiler's (properties),
  // exactly as compileQuantizeBlock does.
  const cssStates = Object.fromEntries(
    Object.entries(states).map(([stateName, body]) => [
      stateName,
      {
        bareProps: body.bareProps,
        rules: body.rules.map((rule) => ({ selector: rule.selector, properties: rule.props })),
      },
    ]),
  );
  // Manifest-served CSS reaches the page WITHOUT the vite transform that
  // normally emits sheet-level containment — without a `:root` container
  // declaration the @container queries match nothing (the exact lie the
  // transform layer fixed). Width-measuring viewport boundaries carry
  // their containment inline; other inputs follow the transform layer's
  // policy (the consumer declares the container).
  const containerName = boundary.input.replace(/[^a-zA-Z0-9_-]/g, '-');
  const isWidthViewport = boundary.input === 'viewport' || boundary.input === 'viewport.width';
  const containment = isWidthViewport ? viewportContainmentRule([containerName]) : null;
  const compiled = CSSCompiler.compile(boundary, cssStates).raw;
  const containerQueries = containment ? `${containment}\n\n${compiled}` : compiled;
  // Property registrations scan custom-property names/syntax only, so the
  // nested-rule props flatten into the same per-state map as bareProps.
  const flatStates = Object.fromEntries(
    Object.entries(states).map(([stateName, body]) => [
      stateName,
      { ...body.bareProps, ...Object.assign({}, ...body.rules.map((rule) => rule.props)) },
    ]),
  ) as Record<string, Record<string, string>>;
  const propertyRegistrations = CSSCompiler.generatePropertyRegistrations(flatStates);

  const outputsByTier: Partial<Record<TierKey, CompiledOutputs>> = {};
  for (const motionTier of MOTION_TIERS) {
    const registrations = motionTier === 'none' ? '' : propertyRegistrations;
    const css = [registrations, containerQueries].filter((part) => part.length > 0).join('\n\n');
    const outputs: CompiledOutputs = { css, propertyRegistrations: registrations, containerQueries };
    for (const designTier of DESIGN_TIERS) {
      outputsByTier[tierKey({ motionTier, designTier })] = outputs;
    }
  }
  return outputsByTier;
}

/**
 * Derive the `BoundaryManifest` for a project.
 *
 * Walks `projectRoot` (skipping `node_modules`, build output, and VCS
 * directories) for boundary definition modules and `@quantize` CSS
 * blocks, then emits one entry per exported boundary: its minted
 * `ContentAddress` and precompiled per-tier outputs. Boundaries with no
 * `@quantize` block get an entry with empty `outputsByTier` -- the id is
 * still the sanctioned way for hosts to derive cache configuration.
 *
 * @example
 * ```ts
 * import { collectBoundaryManifest } from '@czap/vite';
 *
 * const manifest = await collectBoundaryManifest('/path/to/app');
 * // manifest.viewport.id === 'fnv1a:…' (Boundary.make's address)
 * // manifest.viewport.outputsByTier['transitions:standard'].css
 * ```
 *
 * @param projectRoot - Absolute path of the project to scan.
 * @param options - Optional `boundaryDir` override (mirror of `dirs.boundary`).
 * @returns The derived manifest (empty object when nothing is found).
 */
export async function collectBoundaryManifest(
  projectRoot: string,
  options?: CollectBoundaryManifestOptions,
): Promise<BoundaryManifest> {
  const scan = scanProject(projectRoot);

  const boundaryFiles = new Set<string>(scan.boundaryFiles);
  if (options?.boundaryDir) {
    const dir = path.resolve(projectRoot, options.boundaryDir);
    const direct = path.join(dir, 'boundaries.ts');
    if (fs.existsSync(direct)) boundaryFiles.add(direct);
    for (const file of findConventionFiles(dir, '.boundaries.ts', DIAGNOSTIC_SOURCE)) {
      boundaryFiles.add(file);
    }
  }

  // Resolve every exported boundary definition, keyed by export name.
  const boundariesByName = new Map<string, Boundary.Shape>();
  for (const file of boundaryFiles) {
    for (const [exportName, boundary] of await importBoundaryExports(file)) {
      const existing = boundariesByName.get(exportName);
      if (existing && existing.id !== boundary.id) {
        Diagnostics.warnOnce({
          source: DIAGNOSTIC_SOURCE,
          code: 'duplicate-boundary-name',
          message:
            `Two boundary modules export "${exportName}" with different definitions ` +
            `(${existing.id} vs ${boundary.id}); the first one found wins in the manifest. ` +
            `Fix: rename one export so each boundary name is unique within the project.`,
        });
        continue;
      }
      boundariesByName.set(exportName, boundary);
    }
  }

  // Merge @quantize states per boundary across all CSS files.
  const statesByBoundary = new Map<string, Record<string, QuantizeStateBody>>();
  for (const cssFile of scan.cssFiles) {
    let css: string;
    try {
      css = fs.readFileSync(cssFile, 'utf8');
    } catch (error) {
      Diagnostics.warnOnce({
        source: DIAGNOSTIC_SOURCE,
        code: 'css-read-failed',
        message: `Could not read "${cssFile}" while collecting @quantize blocks; it is skipped.`,
        cause: error,
      });
      continue;
    }
    if (!css.includes('@quantize')) continue;
    for (const block of parseQuantizeBlocks(css, cssFile)) {
      if (!boundariesByName.has(block.boundaryName)) {
        Diagnostics.warnOnce({
          source: DIAGNOSTIC_SOURCE,
          code: 'unresolved-quantize-boundary',
          message:
            `@quantize block in ${cssFile}:${block.line} references boundary "${block.boundaryName}", ` +
            `but no boundaries.ts / *.boundaries.ts module in ${projectRoot} exports it, so it has no manifest entry. ` +
            `Fix: add \`export const ${block.boundaryName} = Boundary.make({ ... })\` to a boundary module.`,
        });
        continue;
      }
      const merged = statesByBoundary.get(block.boundaryName) ?? {};
      for (const [stateName, body] of Object.entries(block.states)) {
        const prior = merged[stateName];
        merged[stateName] = {
          bareProps: { ...prior?.bareProps, ...body.bareProps },
          rules: [...(prior?.rules ?? []), ...body.rules],
        };
      }
      statesByBoundary.set(block.boundaryName, merged);
    }
  }

  const manifest: Record<string, BoundaryManifestEntry> = {};
  for (const [name, boundary] of boundariesByName) {
    const states = statesByBoundary.get(name);
    manifest[name] = {
      id: boundary.id,
      outputsByTier: states ? compileOutputsByTier(boundary, states) : {},
    };
  }
  return manifest;
}
