/**
 * Deterministic dist-free import-closure census for pre-build entry scripts.
 *
 * CI's plan job (and the `prepare` lifecycle hook) run `tsx scripts/*.ts`
 * on a clean checkout BEFORE any workspace `dist/` exists. A value-import
 * anywhere in such a script's transitive source closure that resolves into a
 * workspace package's built artifacts fails only on that cold start — a warm
 * local workspace can never observe it. This contract enumerates the entry
 * scripts dynamically (from the workflow files and the root manifest's
 * lifecycle scripts — never a hardcoded list), walks the static + dynamic
 * import closure, and reports every edge that resolves into `dist/`.
 *
 * The classifier is pure over an injected host, so tests prove the law on
 * synthetic trees while the gate applies the same code to the live repo.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, sep } from 'node:path';
import ts from 'typescript';

const portable = (path: string): string => path.split(sep).join('/').replaceAll('\\', '/');

/**
 * How the invoking job obtains workspace `dist/` before this invocation:
 * `none` (cold — the dist-free law applies), `build` (an earlier
 * `pnpm run build`), or `artifact` (an earlier `download-artifact` step whose
 * `path` can restore `packages/<pkg>/dist`, e.g. the frozen release bundle).
 */
export type DistProvision = 'none' | 'build' | 'artifact';

/** One enumerated `tsx scripts/*.ts` invocation and its dist provisioning. */
export interface PrebuildEntrypoint {
  /** Repo-relative script path, portable separators. */
  readonly script: string;
  /** `<workflow file>#<job>` or `package.json#<lifecycle>`. */
  readonly declaredBy: string;
  readonly distProvision: DistProvision;
}

export type ClosureFindingKind = 'dist-import' | 'unresolvable-import' | 'missing-entrypoint';

/** One import edge that breaks the cold-checkout law. */
export interface ClosureFinding {
  readonly kind: ClosureFindingKind;
  /** Repo-relative importing module. */
  readonly importer: string;
  /** The module specifier as written. */
  readonly specifier: string;
  /** Resolved target for dist findings (repo-relative), null when unresolvable. */
  readonly resolved: string | null;
  /** Import chain from the entry script to the importer, inclusive. */
  readonly chain: readonly string[];
}

/** Complete current-head subject coverage for the pre-build closure authority. */
export interface PrebuildClosureReceipt {
  readonly enumerator: 'workflow-and-lifecycle-tsx-entrypoints';
  readonly censusDigest: `sha256:${string}`;
  readonly entrypoints: readonly PrebuildEntrypoint[];
  /** Every repo-relative module reached from any entrypoint, ordered. */
  readonly closure: readonly string[];
  readonly findings: readonly ClosureFinding[];
}

/** Filesystem-independent host so the walker is provable on synthetic trees. */
export interface ClosureHost {
  /** Source text for a repo-relative path, or null when absent. */
  readonly readFile: (repoRelativePath: string) => string | null;
  /** Whether a repo-relative path exists as a file. */
  readonly fileExists: (repoRelativePath: string) => boolean;
  /** Workspace package manifest (parsed package.json) by package name, or null. */
  readonly workspaceManifest: (packageName: string) => WorkspaceManifest | null;
}

/** The manifest slice the resolver needs. */
export interface WorkspaceManifest {
  readonly name: string;
  /** Repo-relative package directory. */
  readonly dir: string;
  readonly exports?: unknown;
  readonly main?: string;
}

const COMMAND_INVOCATION =
  /\b(?:pnpm\s+exec\s+)?tsx\s+([A-Za-z0-9_./-]+\.[cm]?tsx?)|\bpnpm\s+(?:run\s+)?([A-Za-z0-9:_-]+)\b/gu;
const JOB_HEADER = /^ {2}([A-Za-z0-9_-]+):\s*$/u;
const STEP_START = /^\s*-\s/u;
const DOWNLOAD_ARTIFACT = /\bactions\/download-artifact\b/u;
const PATH_KEY = /^\s*path:\s*(.*)$/u;

interface ExpandedCommand {
  readonly entrypoints: readonly PrebuildEntrypoint[];
  readonly finalProvision: DistProvision;
}

function buildProvision(current: DistProvision): DistProvision {
  return current === 'none' ? 'build' : current;
}

/**
 * Expand one shell command through the root package-script graph, preserving
 * command order. A wrapper such as `pnpm run assurance:gate` therefore exposes
 * its real `tsx scripts/assurance-inventory.ts` entrypoint, while
 * `pnpm run build && pnpm run capsule:compile` marks only the latter as warm.
 */
export function expandRootCommandEntrypoints(
  command: string,
  declaredBy: string,
  scripts: Readonly<Record<string, string>>,
  initialProvision: DistProvision = 'none',
  stack: readonly string[] = [],
): ExpandedCommand {
  const entrypoints: PrebuildEntrypoint[] = [];
  let provision = initialProvision;
  for (const match of command.matchAll(COMMAND_INVOCATION)) {
    const sourceEntrypoint = match[1];
    if (sourceEntrypoint !== undefined) {
      entrypoints.push(Object.freeze({ script: sourceEntrypoint, declaredBy, distProvision: provision }));
      continue;
    }

    const scriptName = match[2]!;
    const nested = scripts[scriptName];
    if (nested === undefined) continue;
    if (stack.includes(scriptName)) {
      throw new Error(`root package-script cycle in cold-entrypoint census: ${[...stack, scriptName].join(' -> ')}`);
    }
    const expanded = expandRootCommandEntrypoints(nested, declaredBy, scripts, provision, [...stack, scriptName]);
    entrypoints.push(...expanded.entrypoints);
    provision = scriptName === 'build' ? buildProvision(expanded.finalProvision) : expanded.finalProvision;
  }
  return Object.freeze({ entrypoints: Object.freeze(entrypoints), finalProvision: provision });
}

/** Whether one `download-artifact` `path` value can restore `packages/*[/]dist`. */
function isDistCapablePath(value: string): boolean {
  const trimmed = value.trim().replace(/^["']|["']$/gu, '');
  return trimmed === '' || trimmed === '.' || trimmed === './' || trimmed.startsWith('packages');
}

/** Line index (within a job body) of the first artifact step able to provide dist. */
function firstArtifactProviderIndex(jobLines: readonly string[]): number {
  let artifact = Number.POSITIVE_INFINITY;
  for (let index = 0; index < jobLines.length; index += 1) {
    const line = jobLines[index]!;
    if (artifact === Number.POSITIVE_INFINITY && DOWNLOAD_ARTIFACT.test(line)) {
      // A download provides dist only when its `path` lands at the workspace
      // root or under packages/ — an artifact restored into e.g. `.liteship/`
      // can never satisfy a `packages/<pkg>/dist` import.
      let sawPath = false;
      for (let lookahead = index + 1; lookahead < jobLines.length; lookahead += 1) {
        const ahead = jobLines[lookahead]!;
        if (STEP_START.test(ahead)) break;
        const path = PATH_KEY.exec(ahead);
        if (path !== null) {
          sawPath = true;
          const inline = path[1]!.trim();
          if (inline === '' || inline === '|' || inline === '|-' || inline === '>-') {
            for (let block = lookahead + 1; block < jobLines.length; block += 1) {
              const blockLine = jobLines[block]!;
              if (STEP_START.test(blockLine) || /^\s*[A-Za-z-]+:\s*/u.test(blockLine)) break;
              if (blockLine.trim() !== '' && isDistCapablePath(blockLine)) {
                artifact = index;
                break;
              }
            }
          } else if (isDistCapablePath(inline)) {
            artifact = index;
          }
          break;
        }
      }
      if (!sawPath) artifact = Math.min(artifact, index); // path omitted → workspace root
    }
  }
  return artifact;
}

/**
 * Enumerate every `tsx scripts/*.ts` invocation in a workflow, classified by
 * how its job provides workspace dist before it runs. An invocation with no
 * earlier build step and no dist-capable artifact download is cold: the
 * dist-free closure law applies to it (fail closed).
 */
export function enumerateWorkflowEntrypoints(
  workflowFile: string,
  text: string,
  scripts: Readonly<Record<string, string>> = {},
): readonly PrebuildEntrypoint[] {
  const lines = text.split(/\r?\n/u);
  const jobsAt = lines.findIndex((line) => /^jobs:\s*$/u.test(line));
  if (jobsAt === -1) return Object.freeze([]);

  const out: PrebuildEntrypoint[] = [];
  let job = '';
  let jobLines: string[] = [];
  const flush = (): void => {
    if (job === '') return;
    const artifactProvider = firstArtifactProviderIndex(jobLines);
    let provision: DistProvision = 'none';
    for (let index = 0; index < jobLines.length; index += 1) {
      if (index > artifactProvider && provision === 'none') provision = 'artifact';
      const expanded = expandRootCommandEntrypoints(
        jobLines[index]!,
        `${portable(workflowFile)}#${job}`,
        scripts,
        provision,
      );
      out.push(...expanded.entrypoints);
      provision = expanded.finalProvision;
    }
  };
  for (const line of lines.slice(jobsAt + 1)) {
    const header = JOB_HEADER.exec(line);
    if (header !== null) {
      flush();
      job = header[1]!;
      jobLines = [];
    } else if (job !== '') {
      jobLines.push(line);
    }
  }
  flush();
  return Object.freeze(out);
}

/** Enumerate pre-build lifecycle entrypoints (`prepare`/`preinstall`/`postinstall`). */
export function enumerateLifecycleEntrypoints(rootManifest: {
  readonly scripts?: Readonly<Record<string, string>>;
}): readonly PrebuildEntrypoint[] {
  const out: PrebuildEntrypoint[] = [];
  const scripts = rootManifest.scripts ?? {};
  for (const lifecycle of ['preinstall', 'install', 'postinstall', 'prepare'] as const) {
    const command = rootManifest.scripts?.[lifecycle];
    if (command === undefined) continue;
    out.push(...expandRootCommandEntrypoints(command, `package.json#${lifecycle}`, scripts).entrypoints);
  }
  return Object.freeze(out);
}

/** A specifier tsx erases entirely (type-only clause or all-type named bindings). */
function isErasableImport(statement: ts.Statement): boolean {
  if (ts.isImportDeclaration(statement)) {
    const clause = statement.importClause;
    if (clause === undefined) return false; // bare side-effect import stays live
    if (clause.isTypeOnly) return true;
    if (clause.name !== undefined) return false;
    const bindings = clause.namedBindings;
    if (bindings !== undefined && ts.isNamedImports(bindings)) {
      return bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly);
    }
    return false;
  }
  if (ts.isExportDeclaration(statement)) {
    if (statement.isTypeOnly) return true;
    const clause = statement.exportClause;
    if (clause !== undefined && ts.isNamedExports(clause)) {
      return clause.elements.length > 0 && clause.elements.every((element) => element.isTypeOnly);
    }
    return false;
  }
  return false;
}

/** Every live (non-erased) module specifier in one source text, static and dynamic. */
export function liveModuleSpecifiers(fileName: string, source: string): readonly string[] {
  const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const specifiers: string[] = [];
  for (const statement of parsed.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      !isErasableImport(statement)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0]!)
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);
  return Object.freeze(specifiers);
}

const RELATIVE_EXTENSION_MAP: readonly (readonly [RegExp, string])[] = [
  [/\.js$/u, '.ts'],
  [/\.mjs$/u, '.mts'],
  [/\.cjs$/u, '.cts'],
  [/\.jsx$/u, '.tsx'],
];

function resolveRelative(host: ClosureHost, importerDir: string, specifier: string): string | null {
  const base = portable(join(importerDir, specifier));
  const candidates: string[] = [];
  for (const [from, to] of RELATIVE_EXTENSION_MAP) {
    if (from.test(base)) candidates.push(base.replace(from, to));
  }
  candidates.push(base, `${base}.ts`, `${base}/index.ts`);
  for (const candidate of candidates) {
    if (
      candidate.endsWith('.ts') ||
      candidate.endsWith('.tsx') ||
      candidate.endsWith('.mts') ||
      candidate.endsWith('.cts')
    ) {
      if (host.fileExists(candidate)) return candidate;
    }
  }
  // A genuinely-JS relative target is legal (no TS source to walk).
  return host.fileExists(base) ? base : null;
}

/** First matching condition target inside a package `exports` value. */
function conditionTarget(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object') return null;
  const record = value as Readonly<Record<string, unknown>>;
  for (const condition of ['import', 'node', 'default']) {
    if (condition in record) {
      const nested = conditionTarget(record[condition]);
      if (nested !== null) return nested;
    }
  }
  return null;
}

/** Resolve a workspace package subpath through its `exports` map (or `main`). */
export function resolveWorkspaceTarget(manifest: WorkspaceManifest, subpath: string): string | null {
  if (manifest.exports !== null && typeof manifest.exports === 'object' && manifest.exports !== undefined) {
    const map = manifest.exports as Readonly<Record<string, unknown>>;
    const key = subpath === '' ? '.' : `./${subpath}`;
    const hasSubpathKeys = Object.keys(map).some((candidate) => candidate === '.' || candidate.startsWith('./'));
    const entry = hasSubpathKeys ? map[key] : subpath === '' ? map : undefined;
    const target = entry === undefined ? null : conditionTarget(entry);
    return target === null ? null : portable(join(manifest.dir, target));
  }
  if (typeof manifest.exports === 'string') return portable(join(manifest.dir, manifest.exports));
  if (subpath !== '') return null;
  return manifest.main === undefined ? null : portable(join(manifest.dir, manifest.main));
}

const WORKSPACE_SPECIFIER = /^(@[a-z0-9-]+\/[a-z0-9-]+|[a-z0-9-]+)(?:\/(.*))?$/u;

/**
 * Walk the live import closure from the given entry scripts and report every
 * edge that resolves into a workspace `dist/` (or cannot resolve at all).
 */
export function walkPrebuildClosure(
  entrypoints: readonly PrebuildEntrypoint[],
  host: ClosureHost,
): { readonly closure: readonly string[]; readonly findings: readonly ClosureFinding[] } {
  const visited = new Set<string>();
  const findings: ClosureFinding[] = [];
  const queue: { readonly file: string; readonly chain: readonly string[] }[] = [];
  for (const entry of entrypoints) {
    // Keep the classifier sound when called directly: build/artifact-provisioned
    // entrypoints are outside the cold law even if a caller passes the complete
    // receipt population instead of pre-filtering it.
    if (entry.distProvision !== 'none') continue;
    if (!visited.has(entry.script)) {
      visited.add(entry.script);
      queue.push({ file: entry.script, chain: [entry.script] });
    }
  }

  while (queue.length > 0) {
    const { file, chain } = queue.shift()!;
    const source = host.readFile(file);
    if (source === null) {
      findings.push(
        Object.freeze({ kind: 'missing-entrypoint', importer: file, specifier: file, resolved: null, chain }),
      );
      continue;
    }
    for (const specifier of liveModuleSpecifiers(file, source)) {
      if (specifier.startsWith('node:')) continue;
      if (specifier.startsWith('.')) {
        const resolved = resolveRelative(host, dirname(file), specifier);
        if (resolved === null) {
          findings.push(
            Object.freeze({ kind: 'unresolvable-import', importer: file, specifier, resolved: null, chain }),
          );
        } else if (/\.[cm]?tsx?$/u.test(resolved) && !visited.has(resolved)) {
          visited.add(resolved);
          queue.push({ file: resolved, chain: [...chain, resolved] });
        }
        continue;
      }
      const match = WORKSPACE_SPECIFIER.exec(specifier);
      if (match === null) continue;
      const manifest = host.workspaceManifest(match[1]!);
      if (manifest === null) continue; // genuinely third-party
      const target = resolveWorkspaceTarget(manifest, match[2] ?? '');
      if (target === null) {
        findings.push(Object.freeze({ kind: 'unresolvable-import', importer: file, specifier, resolved: null, chain }));
      } else if (/(?:^|\/)dist\//u.test(target)) {
        findings.push(Object.freeze({ kind: 'dist-import', importer: file, specifier, resolved: target, chain }));
      } else if (/\.[cm]?tsx?$/u.test(target) && !visited.has(target)) {
        visited.add(target);
        queue.push({ file: target, chain: [...chain, target] });
      }
    }
  }
  const dedupedFindings = [
    ...new Map(
      findings.map((finding) => [
        `${finding.kind} ${finding.importer} ${finding.specifier} ${finding.resolved ?? ''}`,
        finding,
      ]),
    ).values(),
  ];
  return Object.freeze({ closure: Object.freeze([...visited].sort()), findings: Object.freeze(dedupedFindings) });
}

/** Live-repository host over the actual tree. */
export function repositoryClosureHost(repoRoot: string): ClosureHost {
  const manifests = new Map<string, WorkspaceManifest | null>();
  const packagesDir = resolve(repoRoot, 'packages');
  if (existsSync(packagesDir)) {
    for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = resolve(packagesDir, entry.name, 'package.json');
      if (!existsSync(manifestPath)) continue;
      const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        readonly name?: string;
        readonly exports?: unknown;
        readonly main?: string;
      };
      if (parsed.name !== undefined) {
        manifests.set(parsed.name, {
          name: parsed.name,
          dir: `packages/${entry.name}`,
          ...(parsed.exports === undefined ? {} : { exports: parsed.exports }),
          ...(parsed.main === undefined ? {} : { main: parsed.main }),
        });
      }
    }
  }
  return {
    readFile: (path) => {
      const full = resolve(repoRoot, path);
      return existsSync(full) ? readFileSync(full, 'utf8') : null;
    },
    fileExists: (path) => existsSync(resolve(repoRoot, path)),
    workspaceManifest: (name) => manifests.get(name) ?? null,
  };
}

/** Build the complete receipt for the live repository. */
export function buildPrebuildClosureReceipt(repoRoot: string): PrebuildClosureReceipt {
  const rootManifest = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
    readonly scripts?: Readonly<Record<string, string>>;
  };
  const scripts = rootManifest.scripts ?? {};
  const workflowDir = resolve(repoRoot, '.github', 'workflows');
  const entrypoints: PrebuildEntrypoint[] = [];
  const workflowDigests: { readonly file: string; readonly digest: string }[] = [];
  if (existsSync(workflowDir)) {
    for (const file of readdirSync(workflowDir).sort()) {
      if (!/\.ya?ml$/u.test(file)) continue;
      const repoRelative = `.github/workflows/${file}`;
      const text = readFileSync(resolve(workflowDir, file), 'utf8');
      workflowDigests.push({ file: repoRelative, digest: createHash('sha256').update(text).digest('hex') });
      entrypoints.push(...enumerateWorkflowEntrypoints(repoRelative, text, scripts));
    }
  }
  entrypoints.push(...enumerateLifecycleEntrypoints(rootManifest));

  const deduped = [
    ...new Map(
      entrypoints.map((entry) => [`${entry.script} ${entry.declaredBy} ${entry.distProvision}`, entry]),
    ).values(),
  ];
  deduped.sort((a, b) =>
    a.script === b.script ? a.declaredBy.localeCompare(b.declaredBy) : a.script.localeCompare(b.script),
  );

  const cold = deduped.filter((entry) => entry.distProvision === 'none');
  const { closure, findings } = walkPrebuildClosure(cold, repositoryClosureHost(repoRoot));
  const digest = createHash('sha256')
    .update(JSON.stringify({ workflowDigests, scripts, entrypoints: deduped, closure }))
    .digest('hex');
  return Object.freeze({
    enumerator: 'workflow-and-lifecycle-tsx-entrypoints',
    censusDigest: `sha256:${digest}`,
    entrypoints: Object.freeze(deduped),
    closure,
    findings,
  });
}
