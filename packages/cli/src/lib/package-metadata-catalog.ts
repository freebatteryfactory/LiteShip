/**
 * The single canonical source of publishable-package metadata (#146).
 *
 * Every one of the 25 publishable `package.json` manifests MATERIALIZES an entry
 * from {@link PACKAGE_METADATA_CATALOG}: its `description` + `keywords` are copied
 * verbatim from here. The prepublish metadata check ({@link checkPackedMetadata},
 * wired into `runPackageSmokeScan`) then re-derives its `expected` FROM this
 * catalog and fails the release gate if any packed manifest drifts — so the
 * descriptions are answer-first by construction and can never silently rot into a
 * dependency list, a type inventory, or a stale one-liner (Law 6: ONE source, the
 * check derives from it rather than carrying a second hand list).
 *
 * Descriptions are ANSWER-FIRST: plain English that says what the package DOES —
 * which slice of the product's job it performs — before any internal type name.
 * They are anchored to the one {@link LITESHIP_PRODUCT_DEFINITION} so every scope
 * reads as one product with a precise per-package role.
 *
 * This module is DELIBERATELY not re-exported from `@liteship/cli`'s public barrel
 * (`src/index.ts` exports only `run`): it is internal enforcement plumbing, so it
 * adds nothing to the locked API surface.
 *
 * @module
 */

import { LITESHIP_PACKAGE_ROSTER } from '@liteship/audit';
import { InvariantViolationError } from '@liteship/error';

/** The ONE product definition (from #146) every catalog description is anchored to. */
export const LITESHIP_PRODUCT_DEFINITION =
  'LiteShip is a constraint-based adaptive rendering framework that turns changing signals into a few named UI ' +
  'states, then keeps CSS, GPU, ARIA, TypeScript, AI, and video outputs in sync from one definition.';

/** One publishable package's canonical, answer-first metadata. */
export interface PackageMetadata {
  /** Plain-English, answer-first `description` for the manifest. */
  readonly description: string;
  /** Accurate, non-spammy `keywords` for the manifest (no `internal` on a published scope). */
  readonly keywords: readonly string[];
}

/**
 * name → canonical metadata for every publishable scope. The manifests on disk
 * copy these strings verbatim; the prepublish check asserts the packed manifest
 * still equals its entry here.
 *
 * The per-package `description` / `keywords` are hand-authored annotations; the
 * KEY SET is no longer a private roster copy — {@link PACKAGE_METADATA_CATALOG}
 * below keys these annotations off `@liteship/audit`'s `LITESHIP_PACKAGE_ROSTER` (the one
 * fleet anchor) plus the two non-`@liteship` umbrellas.
 */
const PACKAGE_METADATA: Readonly<Record<string, PackageMetadata>> = {
  '@liteship/_spine': {
    description:
      'Install-only TypeScript declaration spine for LiteShip: the shared type anchor that `@liteship/core` and ' +
      '`@liteship/scene` reference from their published `.d.ts` — there is nothing to import at runtime.',
    keywords: ['liteship', 'typescript', 'types', 'declarations'],
  },
  '@liteship/error': {
    description:
      'The one error algebra for LiteShip: build tagged error values that work as thrown Errors and as errors-as-values ' +
      '(a Result err-arm), and compose your own variants on top with zero dependencies.',
    keywords: ['liteship', 'error-handling', 'tagged-union', 'typescript'],
  },
  '@liteship/gauntlet': {
    description:
      "The rigor engine behind LiteShip's release gates: define quality gates that report findings and earn " +
      'blocking power only by proving themselves against their own fixtures.',
    keywords: ['liteship', 'quality-gate', 'fitness-function', 'static-analysis', 'typescript'],
  },
  '@liteship/canonical': {
    description:
      'The content-addressing kernel for LiteShip: canonical CBOR encoding and stable digests so the same ' +
      'definition always hashes to the same address.',
    keywords: ['liteship', 'content-addressing', 'cbor', 'hashing', 'typescript'],
  },
  '@liteship/genui': {
    description:
      "Render AI-generated UI safely in LiteShip: validate a model's proposed component tree against a host-owned " +
      'catalog and draw only trusted, whitelisted components.',
    keywords: ['liteship', 'generative-ui', 'ai-safety', 'component-catalog', 'typescript'],
  },
  '@liteship/core': {
    description:
      'The heart of LiteShip: define UI boundaries, tokens, themes, and signals once as a content-addressed graph, ' +
      'then drive the engine that keeps every rendered output in sync.',
    keywords: ['liteship', 'adaptive-rendering', 'constraint-based', 'ui-framework', 'typescript'],
  },
  '@liteship/quantizer': {
    description:
      'Turn continuous signals into a few named UI states for LiteShip: evaluate boundaries, animate the ' +
      'transitions between states, and gate motion by device tier.',
    keywords: ['liteship', 'adaptive-rendering', 'state-machine', 'boundary', 'typescript'],
  },
  '@liteship/compiler': {
    description:
      'Compile one LiteShip boundary definition into many outputs at once — CSS, GLSL, WGSL, ARIA, AI descriptions, ' +
      'and Tailwind — so every target stays in sync.',
    keywords: ['liteship', 'css', 'shaders', 'aria', 'compiler', 'typescript'],
  },
  '@liteship/web': {
    description:
      'The browser runtime for LiteShip: apply CSS, streamed HTML, worker output, and LLM chunks to a live DOM ' +
      'with focus- and scroll-preserving morphing.',
    keywords: ['liteship', 'dom', 'browser-runtime', 'streaming', 'typescript'],
  },
  '@liteship/detect': {
    description:
      'Detect device capabilities for LiteShip: probe GPU tier, CPU, memory, motion preference, and network, then ' +
      'map them to the tiers that select which UI state renders.',
    keywords: ['liteship', 'device-detection', 'capability-probe', 'gpu-tier', 'typescript'],
  },
  '@liteship/edge': {
    description:
      'Choose the right UI state at the CDN edge for LiteShip: read Client Hints into a device tier, serve a ' +
      'content-addressed boundary cache, and compile the theme for first paint.',
    keywords: ['liteship', 'edge', 'cdn', 'client-hints', 'typescript'],
  },
  '@liteship/cloudflare': {
    description:
      'Run LiteShip on Cloudflare Workers: a site adapter with a KV-backed edge cache and the Astro middleware ' +
      'glue that caches boundaries at the edge.',
    keywords: ['liteship', 'cloudflare', 'workers', 'edge', 'typescript'],
  },
  '@liteship/worker': {
    description:
      "Move LiteShip's heavy work off the main thread: compositor and render workers plus a lock-free ring buffer " +
      'that stream state and frames without janking the UI.',
    keywords: ['liteship', 'web-worker', 'off-main-thread', 'offscreen-canvas', 'typescript'],
  },
  '@liteship/vite': {
    description:
      'The Vite plugin for LiteShip: compile `@token`, `@theme`, `@style`, and `@quantize` blocks into native CSS ' +
      'and hot-reload boundary definitions as you edit.',
    keywords: ['liteship', 'vite-plugin', 'css', 'hmr', 'typescript'],
  },
  '@liteship/astro': {
    description:
      'The Astro integration for LiteShip: render adaptive UI as islands with the `client:adaptive` directive and ' +
      'resolve device tiers on the server for first paint.',
    keywords: ['liteship', 'astro', 'integration', 'islands', 'typescript'],
  },
  '@liteship/remotion': {
    description:
      'Use LiteShip inside Remotion: React hooks and composition helpers that drive video frames and shader ' +
      'surfaces from the same boundary state used everywhere else.',
    keywords: ['liteship', 'remotion', 'video', 'react', 'typescript'],
  },
  '@liteship/scene': {
    description:
      'Author video timelines for LiteShip: a typed scene and track model built on the entity-component substrate ' +
      'in `@liteship/core`.',
    keywords: ['liteship', 'scene', 'timeline', 'video', 'typescript'],
  },
  '@liteship/stage': {
    description:
      'Export one LiteShip document graph to many carriers: prove a single source renders to both a static Astro ' +
      'page and a video, joined under one receipt.',
    keywords: ['liteship', 'dual-export', 'video', 'static-site', 'typescript'],
  },
  '@liteship/assets': {
    description:
      'Manage media assets for LiteShip: declare audio, video, and image assets and read cached analysis such as ' +
      'waveforms, beat markers, and onsets.',
    keywords: ['liteship', 'assets', 'audio', 'waveform', 'typescript'],
  },
  '@liteship/audit': {
    description:
      "Audit a LiteShip project's structure, integrity, and public surface: a downstream-installable engine that " +
      'builds a model of the repository and runs configurable checks over it.',
    keywords: ['liteship', 'audit', 'static-analysis', 'code-quality', 'typescript'],
  },
  '@liteship/command': {
    description:
      "The shared command registry behind LiteShip's tooling: one source of command definitions that both the " +
      '`liteship` CLI and the MCP server project from.',
    keywords: ['liteship', 'cli', 'mcp', 'command-registry', 'typescript'],
  },
  '@liteship/cli': {
    description:
      'The `liteship` command-line tool for LiteShip: JSON-in, JSON-out verbs built for AI agents, with a ' +
      'human-friendly terminal mode.',
    keywords: ['liteship', 'cli', 'command-line', 'json', 'typescript'],
  },
  '@liteship/mcp-server': {
    description:
      'The Model Context Protocol server for LiteShip: exposes the `liteship` commands and capsule catalog as MCP ' +
      'tools that AI assistants can call.',
    keywords: ['liteship', 'mcp', 'model-context-protocol', 'ai-tooling', 'typescript'],
  },
  'create-liteship': {
    description:
      'Scaffold a new LiteShip project: run `npm create liteship` to get a minimal Astro app wired to the ' +
      'framework in one step.',
    keywords: ['create-liteship', 'liteship', 'scaffold', 'astro', 'typescript'],
  },
  liteship: {
    description:
      'The LiteShip umbrella package: one dependency that installs the whole `@liteship/*` adaptive rendering stack — ' +
      'you still import from the individual scopes.',
    keywords: ['liteship', 'adaptive-rendering', 'framework', 'meta-package', 'typescript'],
  },
};

/**
 * The publishable roster keyed into the catalog: the canonical `@liteship/*` fleet from
 * `@liteship/audit`'s {@link LITESHIP_PACKAGE_ROSTER} (no private roster copy), plus the two
 * non-`@liteship` umbrellas that carry the whole fleet and publish last.
 */
const CATALOG_ROSTER: readonly string[] = [...LITESHIP_PACKAGE_ROSTER, 'create-liteship', 'liteship'];

/**
 * name → canonical metadata for every publishable scope. The KEY SET is derived
 * from {@link CATALOG_ROSTER} (anchored to `LITESHIP_PACKAGE_ROSTER`), keying the
 * hand-authored {@link PACKAGE_METADATA} annotations off it. The exhaustiveness
 * check below throws at module load if a roster member has no metadata entry — so a
 * package added to the fleet but missing an annotation fails fast, and the key set
 * stays aligned with the one fleet anchor rather than a second hand list.
 *
 * The manifests on disk copy these strings verbatim; the prepublish check
 * ({@link checkPackedMetadata}) re-derives its `expected` from this catalog.
 */
export const PACKAGE_METADATA_CATALOG: Readonly<Record<string, PackageMetadata>> = Object.fromEntries(
  CATALOG_ROSTER.map((name) => {
    const meta = PACKAGE_METADATA[name];
    if (meta === undefined) {
      throw InvariantViolationError(
        'package-metadata-catalog',
        `no metadata entry for "${name}" — every LITESHIP_PACKAGE_ROSTER member (plus the two umbrellas) must have a PACKAGE_METADATA annotation`,
      );
    }
    return [name, meta] as const;
  }),
);

/** The packed-manifest fields the metadata check reads (a narrow view of `package.json`). */
export interface PackedMetadata {
  readonly name?: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  readonly private?: boolean;
}

/** One metadata failure: which manifest field failed and why. */
export interface MetadataViolation {
  readonly package: string;
  readonly field: 'description' | 'keywords' | 'private' | 'catalog';
  readonly message: string;
}

/** Shortest string that can plausibly answer "what does this package do?". */
const MIN_DESCRIPTION_LENGTH = 24;

/**
 * A `Label: Sym, Sym, Sym…` opener — a symbol/type inventory rather than a
 * plain-English answer (e.g. `Primitives: Boundary, Token, Style`, `DOM runtime:
 * Morph, SlotRegistry, SSE`). The label is short and the tail is three or more
 * Capitalized identifiers in a comma list.
 */
const INVENTORY_RE = /^[A-Za-z][\w /-]{0,28}:\s+[A-Z][\w.]*(?:,\s+[A-Z][\w.]*){2,}/;

/** A dependency-list opener — `(deps `@liteship/…`)` and friends — instead of what the package does. */
const DEPENDENCY_LIST_RE = /\bdeps?\b[^)]*`?@liteship\//i;

/**
 * Return the reason `description` fails the answer-first bar, or `null` if it
 * passes. The exact-match-to-catalog check is the drift guard; this heuristic is
 * the SEMANTIC net that keeps the catalog itself honest (the unit test asserts
 * every catalog entry passes) and catches an obviously non-answer-first packed
 * description even if it somehow matched a bad catalog entry.
 */
export function answerFirstViolation(description: string, name: string): string | null {
  const trimmed = description.trim();
  if (trimmed.length === 0) return 'description is empty';
  if (trimmed === name) return 'description is just the package name';
  if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
    return `description is too terse (< ${MIN_DESCRIPTION_LENGTH} chars) to answer "what does this do?"`;
  }
  if (/^[`'"]/.test(trimmed)) return 'description opens with a code symbol instead of plain English';
  if (DEPENDENCY_LIST_RE.test(trimmed)) return 'description lists its dependencies instead of what it does';
  if (trimmed.includes('workspace:')) return 'description leaks a workspace: protocol string';
  if (INVENTORY_RE.test(trimmed)) {
    return 'description reads as a symbol inventory (Label: A, B, C, …) instead of a plain-English answer';
  }
  return null;
}

/** Structural equality of two keyword lists (order-sensitive — the catalog fixes the order). */
function keywordsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

/**
 * Validate one packed manifest's metadata against the catalog. `expected` is
 * re-derived from {@link PACKAGE_METADATA_CATALOG} (Law 6), never a second hand
 * list. Returns every violation found (empty ⇒ the manifest is publishable).
 */
export function checkPackedMetadata(manifest: PackedMetadata, name: string): MetadataViolation[] {
  const violations: MetadataViolation[] = [];
  const fail = (field: MetadataViolation['field'], message: string): void => {
    violations.push({ package: name, field, message });
  };

  const expected = PACKAGE_METADATA_CATALOG[name];
  if (!expected) {
    fail('catalog', `no canonical metadata entry — add "${name}" to PACKAGE_METADATA_CATALOG`);
    return violations;
  }

  // A published package must never carry accidental private/workspace metadata.
  if (manifest.private === true) {
    fail('private', 'packed manifest is marked "private": true but is being published');
  }

  const description = (manifest.description ?? '').trim();
  const answerFirst = answerFirstViolation(description, name);
  if (answerFirst) fail('description', answerFirst);
  if (description !== expected.description) {
    fail('description', `description drifted from the catalog — expected exactly: "${expected.description}"`);
  }

  const keywords = manifest.keywords ?? [];
  if (keywords.length === 0) {
    fail('keywords', 'keywords are missing or empty');
  }
  if (keywords.some((keyword) => keyword.toLowerCase() === 'internal')) {
    fail('keywords', 'keyword "internal" is set on a published package');
  }
  if (keywords.some((keyword) => keyword.includes('workspace:'))) {
    fail('keywords', 'a keyword leaks a workspace: protocol string');
  }
  if (!keywordsEqual(keywords, expected.keywords)) {
    fail('keywords', `keywords drifted from the catalog — expected exactly: ${JSON.stringify(expected.keywords)}`);
  }

  return violations;
}
