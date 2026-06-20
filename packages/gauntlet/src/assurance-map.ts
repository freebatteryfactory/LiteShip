/**
 * The assurance map — what level each PATH lives at, so a gate's rigor is aimed.
 *
 * {@link assurance.ts} defines the criticality ladder (L0–L4) abstractly; this
 * module pins the ladder to the actual repo layout: an ORDERED list of
 * {@link LevelRule}s (most-specific FIRST, first match wins, default `L1`) that
 * answers "what level is THIS file?" via {@link levelOf}. The engine reads this
 * to SCOPE each gate (an L3 gate sees only L3+ files), so undifferentiated red —
 * a determinism gate drowning the report with legitimate CLI timestamps — stops
 * being a failure mode. The map is data the owner can redline.
 *
 * Composition, not inheritance: a rule is `{ glob, level }`; the matcher is a
 * tiny pure function. No filesystem, no `Date.now()`, no `Math.random()` — the
 * same path always resolves to the same level.
 *
 * The glob dialect is intentionally small (`**`, `*`, `{a,b}` alternation only),
 * hand-rolled rather than pulling a matcher dependency, so the resolution is
 * fully owned and deterministic.
 *
 * @module
 */

import type { AssuranceLevel } from './assurance.js';

/** One rule of the assurance map: paths matching `glob` are at `level`. */
export interface LevelRule {
  /** A repo-relative glob (dialect: `**`, `*`, `{a,b}` alternation only). */
  readonly glob: string;
  /** The assurance level paths matching {@link glob} carry. */
  readonly level: AssuranceLevel;
}

/**
 * LiteShip's default assurance map — ORDERED, most-specific FIRST, first match
 * wins, default `L1`. Owner-redlinable: the levels here are the criticality
 * judgement, encoded once.
 *
 * **The governing principle (owner redline): AUTHORITY decides assurance, not
 * folder names.** A file that can BLOCK a release, WAIVE a finding, RATCHET a
 * floor, GENERATE code/artifacts, VERIFY integrity, DISPATCH a tool, or BRIDGE
 * agent authority is part of the safety case and is high-assurance even when it
 * lives in a tools-shaped folder — "a grader cannot be low-assurance just
 * because it lives in a tools folder; that's how the nervous system gets drunk
 * and approves its own fake IDs." Cosmetic tooling (reports, scaffolds, shell
 * wrappers, previews) stays L0/L1, where ambient nondeterminism is legitimate.
 *
 * - **L4** — "if this lies, downstream trusts bad reality": the canonical/identity
 *   kernel (canonical/*, content-address + integrity-digest brands), the core
 *   trust spine (receipt/hlc/plan/dag/validated-output/assembly + the mixed
 *   brands file, conservatively whole until the Slice-C brand split), AND the
 *   gauntlet's own judgment core (engine/authority/waiver/gate/assurance-map/
 *   finding/assurance) — the grader that decides the cut IS the safety case.
 * - **L3** — deterministic runtime/projection/cache AND authority-bearing tooling:
 *   the core determinism paths (signal/zap/evaluate/gen-frame/speculative/
 *   token-buffer/blend/animation/boundary + ai-cast as a deterministic proposer),
 *   quantizer, web capture+stream, worker, astro runtime; the artifact-producing
 *   cores (stage dual-export/ffmpeg-encoder, remotion composition); the gauntlet
 *   I/O glue (runner/node-context) + its gates; the audit authority (structure/
 *   policy/devops-profile/integrity); the external-input + tool-dispatch +
 *   state-mutating boundaries (mcp http/stdio/dispatch, command dispatcher, cli
 *   dispatch + the mutating/verifying cli executors); and the gate/generate/
 *   verify SCRIPTS (the ones that exit-nonzero to fail a cut or emit artifacts).
 * - **L2** — public API + serialized contracts + typed external boundaries:
 *   index/contract/capsule, scene contract, edge manifest, the mcp protocol +
 *   resource descriptors, the command catalog/registry + command surfaces, the
 *   cli projector commands.
 * - **L0/L1** — cosmetic tooling: report/format/scaffold/clean/test-harness
 *   scripts, transport/shell wrappers, previews/examples; default L1.
 *
 * NOTE (granularity): the map is file-glob granular at the AUTHORITY ENTRYPOINTS.
 * Helper modules a gate-script imports (scripts/lib, scripts/support) are not yet
 * individually raised — Slice B's call-graph-aware repo-IR will propagate level
 * along the call edges; until then the entrypoint level is the agreed mechanism.
 */
export const LITESHIP_ASSURANCE_MAP: readonly LevelRule[] = [
  // ── L4: the trust spine — identity/integrity + the grader's own judgment core ─
  { glob: 'packages/canonical/src/**', level: 'L4' },
  // Identity/integrity brands (ContentAddress kernel, AssetRefId registry key).
  { glob: 'packages/{assets,genui}/src/brands.ts', level: 'L4' },
  // The core trust spine. `brands` kept whole at L4 (it holds ContentAddress +
  // IntegrityDigest); the cosmetic brands it also carries get the strict level
  // conservatively — under-protecting identity is the dangerous direction. The
  // file-split by criticality is a Slice-C precondition (the L3/L4 distinction is
  // inert until the avionics gates exist). `ai-cast` moved OUT of L4 → L3 per the
  // owner: it is a deterministic PROPOSER, not a trusted-artifact emitter.
  {
    glob: 'packages/core/src/{receipt,hlc,plan,dag,validated-output,assembly,brands}.ts',
    level: 'L4',
  },
  // The gauntlet's judgment core: it decides whether the cut may ship, so it is
  // itself part of the safety case and must clear the bar it enforces.
  {
    glob: 'packages/gauntlet/src/{engine,authority,waiver,gate,assurance-map,finding,assurance}.ts',
    level: 'L4',
  },

  // ── L3: deterministic runtime/projection/cache + authority-bearing tooling ────
  {
    glob: 'packages/core/src/{boundary,signal,zap,evaluate,gen-frame,speculative,token-buffer,blend,animation,ai-cast,clock,rng}.ts',
    level: 'L3',
  },
  { glob: 'packages/quantizer/src/**', level: 'L3' },
  { glob: 'packages/web/src/capture/**', level: 'L3' },
  { glob: 'packages/web/src/stream/**', level: 'L3' },
  { glob: 'packages/worker/src/**', level: 'L3' },
  { glob: 'packages/astro/src/runtime/**', level: 'L3' },
  // Artifact-producing cores — deterministic frame/media bytes downstream trusts.
  { glob: 'packages/stage/src/{dual-export,ffmpeg-encoder}.ts', level: 'L3' },
  { glob: 'packages/remotion/src/composition.ts', level: 'L3' },
  // The gauntlet's I/O glue + its gates (the rules ARE the standard).
  { glob: 'packages/gauntlet/src/{runner,node-context}.ts', level: 'L3' },
  { glob: 'packages/gauntlet/src/gates/**', level: 'L3' },
  // The audit authority — these four files gate topology/policy/profile/integrity.
  { glob: 'packages/audit/src/{structure,policy,devops-profile,integrity}.ts', level: 'L3' },
  // External-input + tool-dispatch + state-mutating boundaries.
  { glob: 'packages/mcp-server/src/{http,stdio,dispatch}.ts', level: 'L3' },
  { glob: 'packages/command/src/dispatcher.ts', level: 'L3' },
  { glob: 'packages/cli/src/dispatch.ts', level: 'L3' },
  {
    glob: 'packages/cli/src/commands/{ship,gauntlet,audit,doctor,scene-dev,scene-render,scene-compile,scene-verify,ship-verify,asset-analyze,asset-verify,capsule,plumb}.ts',
    level: 'L3',
  },
  // The plumb-completeness gate, migrated out of scripts/ into the command host.
  { glob: 'packages/command/src/commands/plumb.ts', level: 'L3' },
  { glob: 'packages/command/src/host/plumb-scan.ts', level: 'L3' },
  // Authority-bearing scripts: gate (exit-nonzero), ratchet, generate, verify.
  {
    glob: 'scripts/{gauntlet,audit-floor,bench-gate,check-invariants,runtime-gate,capsule-verify,capsule-compile,feedback-verify,flex-verify,package-smoke,merge-coverage,merge-subprocess-v8,docs-check,artifact-integrity,devx-check}.ts',
    level: 'L3',
  },

  // ── L2: public API + serialized contracts + typed external boundaries ─────────
  { glob: 'packages/*/src/index.ts', level: 'L2' },
  { glob: 'packages/*/src/{contract,capsule}.ts', level: 'L2' },
  { glob: 'packages/scene/src/contract.ts', level: 'L2' },
  { glob: 'packages/edge/src/manifest.ts', level: 'L2' },
  {
    glob: 'packages/mcp-server/src/{capabilities,jsonrpc,errors,prompts,resources,manifest-resource,app-resources,ui-resources}.ts',
    level: 'L2',
  },
  { glob: 'packages/command/src/{catalog,registry}.ts', level: 'L2' },
  { glob: 'packages/command/src/commands/**', level: 'L2' },
  { glob: 'packages/cli/src/commands/**', level: 'L2' },

  // ── L0/L1: cosmetic tooling — ambient nondeterminism is LEGIT here ────────────
  { glob: 'packages/{cli,command,mcp-server,audit,remotion,stage}/src/**', level: 'L1' },
  { glob: 'scripts/**', level: 'L1' },
];

/** Escape one literal character for use inside a regex. */
function escapeLiteral(ch: string): string {
  return ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compile a glob (dialect: `**`, `*`, `{a,b}` alternation) into an anchored
 * `RegExp` in ONE left-to-right walk. Pure + deterministic — the same glob
 * always yields the same regex.
 *
 * The single walk matters: the brace body and the `*`/`**`/literal handling must
 * be compiled in the SAME pass so the regex metacharacters one step emits are
 * never re-escaped by another. The token meanings:
 *
 * - `**` (double-star) → `.*` (any number of path segments, including zero); a
 *   trailing slash after a double-star is swallowed so `a/(double-star)/b` and a
 *   trailing `a/(double-star)` both work.
 * - `*` → `[^/]*` (within a single path segment).
 * - `{a,b,c}` → `(?:a|b|c)`, where each alternative is a comma-separated literal
 *   stem (the only brace content this dialect produces) escaped as a literal.
 * - anything else → an escaped literal.
 */
function globToRegExp(glob: string): RegExp {
  let src = '';
  let i = 0;
  while (i < glob.length) {
    if (glob.startsWith('**', i)) {
      src += '.*';
      i += 2;
      // Swallow a trailing slash after a double-star so a/(star-star)/b and a
      // trailing a/(star-star) both work (the `.*` already consumed separators).
      if (glob[i] === '/') i += 1;
      continue;
    }
    const ch = glob[i];
    if (ch === '*') {
      src += '[^/]*';
      i += 1;
      continue;
    }
    if (ch === '{') {
      const close = glob.indexOf('}', i);
      // No closing brace → treat `{` as a literal (defensive; the map never does this).
      if (close === -1) {
        src += escapeLiteral('{');
        i += 1;
        continue;
      }
      const body = glob.slice(i + 1, close);
      const alts = body.split(',').map((alt) => [...alt].map(escapeLiteral).join(''));
      src += `(?:${alts.join('|')})`;
      i = close + 1;
      continue;
    }
    src += escapeLiteral(ch ?? '');
    i += 1;
  }
  return new RegExp(`^${src}$`);
}

/** Memoize compiled regexes — the map is tiny and reused across every file. */
const REGEX_CACHE = new Map<string, RegExp>();

function compiledGlob(glob: string): RegExp {
  let re = REGEX_CACHE.get(glob);
  if (re === undefined) {
    re = globToRegExp(glob);
    REGEX_CACHE.set(glob, re);
  }
  return re;
}

/** True iff `file` matches `glob` under the small dialect. Pure + deterministic. */
export function matchesGlob(file: string, glob: string): boolean {
  return compiledGlob(glob).test(file);
}

/**
 * The level of `file` per the assurance map: the FIRST matching rule's level
 * (rules are most-specific first), else `L1`. Pure + deterministic — no clock,
 * no randomness, no filesystem; a repo-relative path in, a level out.
 *
 * @param file repo-relative path (forward slashes).
 * @param map the ordered rule list (defaults to {@link LITESHIP_ASSURANCE_MAP}).
 */
export function levelOf(file: string, map: readonly LevelRule[] = LITESHIP_ASSURANCE_MAP): AssuranceLevel {
  for (const rule of map) {
    if (matchesGlob(file, rule.glob)) return rule.level;
  }
  return 'L1';
}
