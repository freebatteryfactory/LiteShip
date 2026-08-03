// @vitest-environment node
/**
 * Doc link integrity — a guard for the Front-Door Cut's doc moves.
 *
 * Renaming or relocating a root doc or an example silently breaks every
 * relative link that pointed at it — and the published npm READMEs hard-code
 * `github.com/.../blob/main/<file>` links that a rename breaks with no local signal.
 * This gate resolves every RELATIVE markdown link (and every `blob/main` link) in the
 * hand-authored prose to a real file, so a move that orphans a link reds here instead
 * of on the deployed site.
 *
 * Scope: TRACKED hand-authored prose only — root `*.md`, authored `docs/**`,
 * each package's published `README.md`, and the examples ladder
 * (`examples/README.md` + each example's `README.md`, now load-bearing navigation).
 * External `http(s)` and pure `#anchor` links are out of scope (no network /
 * heading-slug fragility).
 */
import { describe, test, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';

const REPO = process.cwd();

async function trackedPaths(repoRoot: string): Promise<readonly string[]> {
  const result = await spawnArgvCapture('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    captureBytes: 4 * 1024 * 1024,
  });
  if (result.exitCode !== 0) throw new Error(`git ls-files failed: ${result.stderr}`);
  return result.stdout.split('\0').filter((path) => path !== '');
}

/** Whether a tracked Markdown file belongs to the published prose surface. */
export function isHandAuthoredProsePath(path: string): boolean {
  if (!path.endsWith('.md')) return false;
  if (!path.includes('/')) return true;
  if (path.startsWith('docs/')) return true;
  if (/^packages\/[^/]+\/README\.md$/u.test(path)) return true;
  return path === 'examples/README.md' || /^examples\/[^/]+\/README\.md$/u.test(path);
}

/** Git is the publication authority; ignored build artifacts cannot mask a missing target. */
export function repoPathIsTracked(path: string, paths: readonly string[]): boolean {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//u, '').replace(/\/$/u, '');
  if (normalized === '' || normalized.startsWith('../')) return false;
  return paths.some((tracked) => tracked === normalized || tracked.startsWith(`${normalized}/`));
}

function collectDocs(paths: readonly string[]): readonly string[] {
  return paths.filter(isHandAuthoredProsePath).map((path) => resolve(REPO, path));
}

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const GITHUB_REPOSITORY_LINK = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/(?:blob|tree)\/main\/(.+)$/;
const LITESHIP_REPOSITORY_URL = 'https://github.com/freebatteryfactory/LiteShip/';
const LITESHIP_REPOSITORY_LINK = /^https?:\/\/github\.com\/freebatteryfactory\/LiteShip\//u;
const LITESHIP_BLOB_MAIN_LINK =
  /^https?:\/\/github\.com\/freebatteryfactory\/LiteShip\/blob\/main\/([^#?]+)(?:[?#].*)?$/u;
const INLINE_REPOSITORY_PATH = /`((?:packages|scripts|tests|docs|examples|crates|\.github)\/[^`\s,)]+)/g;
const CURRENT_AUTHORITY_DOCS = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'ASTRO-RUNTIME-MODEL.md',
  'ASTRO-STATIC-MENTAL-MODEL.md',
  'AUTHORING-MODEL.md',
  'CONTRIBUTING.md',
  'GETTING-STARTED.md',
  'GLOSSARY.md',
  'HOSTING.md',
  'PACKAGE-SURFACES.md',
  'README.md',
  'RELEASING.md',
  'SECURITY.md',
  'STATUS.md',
] as const;

type ExternalSymbolLinkMappings = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Same-repository TypeDoc mappings must resolve through Git's published set, never warm ignored output. */
export function externalSymbolRepositoryLinkViolations(
  mappings: ExternalSymbolLinkMappings,
  tracked: readonly string[],
): readonly string[] {
  const violations: string[] = [];
  for (const [moduleName, symbols] of Object.entries(mappings)) {
    for (const [symbol, url] of Object.entries(symbols)) {
      if (!LITESHIP_REPOSITORY_LINK.test(url)) continue;
      const match = LITESHIP_BLOB_MAIN_LINK.exec(url);
      if (!match) {
        violations.push(`${moduleName}#${symbol} -> unsupported same-repository URL ${url}`);
        continue;
      }
      const target = decodeURIComponent(match[1]!);
      if (!repoPathIsTracked(target, tracked)) {
        violations.push(`${moduleName}#${symbol} -> untracked repository target ${target}`);
      }
    }
  }
  return violations;
}

describe('doc link integrity', () => {
  test('every relative markdown link (and repository main link) resolves to a tracked file', async () => {
    const paths = await trackedPaths(REPO);
    const docs = collectDocs(paths);
    expect(docs.length).toBeGreaterThanOrEqual(40);
    const broken: string[] = [];
    for (const file of docs) {
      const src = readFileSync(file, 'utf8');
      for (const match of src.matchAll(LINK)) {
        const raw = match[1]!;
        const target = raw.split('#')[0]!.trim();
        if (target === '') continue; // pure #anchor — in-page, out of scope
        const repositoryLink = GITHUB_REPOSITORY_LINK.exec(raw);
        if (!repositoryLink && /^(https?:|mailto:|tel:)/.test(target)) continue; // external
        const repoRelative = repositoryLink
          ? repositoryLink[1]!.split('#')[0]!
          : relative(REPO, resolve(dirname(file), target)).replaceAll('\\', '/');
        if (!repoPathIsTracked(repoRelative, paths)) {
          broken.push(`${relative(REPO, file).replace(/\\/g, '/')} → ${raw}`);
        }
      }
    }
    expect(broken, `broken doc links (${broken.length}):\n${broken.join('\n')}`).toEqual([]);
  });

  test('current-authority inline repository paths resolve to live files', async () => {
    const paths = await trackedPaths(REPO);
    const broken: string[] = [];
    for (const rel of CURRENT_AUTHORITY_DOCS) {
      const source = readFileSync(resolve(REPO, rel), 'utf8');
      for (const match of source.matchAll(INLINE_REPOSITORY_PATH)) {
        const raw = match[1]!;
        if (/[{*<>…]/.test(raw)) continue;
        const target = raw.replace(/:\d+(?:-\d+)?$/, '').replace(/[.;:]$/, '');
        const generatedLocally = existsSync(resolve(REPO, target));
        const isTypeDocProjection = target === 'docs/api' || target.startsWith('docs/api/');
        if ((!repoPathIsTracked(target, paths) && !generatedLocally) || isTypeDocProjection) {
          broken.push(`${rel} → ${raw}`);
        }
      }
    }
    expect(broken, `stale inline repository paths (${broken.length}):\n${broken.join('\n')}`).toEqual([]);
  });

  test('the prose census and target authority ignore local TypeDoc output', () => {
    const synthetic = ['README.md', 'docs/guide.md', 'docs/api/core/index.md', 'packages/core/README.md'];
    expect(synthetic.filter(isHandAuthoredProsePath)).toEqual(synthetic);
    expect(repoPathIsTracked('docs/api', synthetic)).toBe(true);

    const published = synthetic.filter((path) => path !== 'docs/api/core/index.md');
    expect(repoPathIsTracked('docs/api', published)).toBe(false);
    expect(published.filter(isHandAuthoredProsePath)).toHaveLength(3);
  });

  test('TypeDoc external-symbol mappings target durable tracked repository sources', async () => {
    const tracked = await trackedPaths(REPO);
    const config = JSON.parse(readFileSync(resolve(REPO, 'typedoc.json'), 'utf8')) as {
      readonly externalSymbolLinkMappings: ExternalSymbolLinkMappings;
    };
    const violations = externalSymbolRepositoryLinkViolations(config.externalSymbolLinkMappings, tracked);
    expect(violations, `invalid TypeDoc repository mappings (${violations.length}):\n${violations.join('\n')}`).toEqual(
      [],
    );
  });

  test('TypeDoc mapping authority fails closed for ignored output and unsupported repository URLs', () => {
    const tracked = ['packages/core/src/index.ts'];
    expect(
      externalSymbolRepositoryLinkViolations(
        {
          '@liteship/core': {
            tracked: `${LITESHIP_REPOSITORY_URL}blob/main/packages/core/src/index.ts`,
            ignored: `${LITESHIP_REPOSITORY_URL}blob/main/docs/api/core/index.md`,
            ignoredHttp: 'http://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/index.md',
            ambiguous: `${LITESHIP_REPOSITORY_URL}tree/main/packages/core/src/index.ts`,
          },
        },
        tracked,
      ),
    ).toEqual([
      '@liteship/core#ignored -> untracked repository target docs/api/core/index.md',
      '@liteship/core#ignoredHttp -> untracked repository target docs/api/core/index.md',
      `@liteship/core#ambiguous -> unsupported same-repository URL ${LITESHIP_REPOSITORY_URL}tree/main/packages/core/src/index.ts`,
    ]);
  });
});
