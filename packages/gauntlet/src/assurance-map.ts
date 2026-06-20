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
 * - L4: the "if this lies, downstream trusts bad reality" spine (canonical,
 *   receipt/HLC/plan/dag/validated-output/ai-cast/assembly/brands).
 * - L3: the deterministic runtime / projection / cache paths (core signal/zap/
 *   evaluate/gen-frame/speculative/token-buffer/blend/animation/boundary,
 *   quantizer, web capture+stream, worker, astro runtime).
 * - L2: public API surfaces + serialized contracts (index/contract/capsule,
 *   scene contract, edge manifest).
 * - L0/L1: tooling where ambient nondeterminism (timestamps, seeds) is LEGIT —
 *   cli/command/mcp-server/audit/gauntlet/remotion/stage + scripts.
 * - default: L1.
 */
export const LITESHIP_ASSURANCE_MAP: readonly LevelRule[] = [
  // ── L4: the trust spine ────────────────────────────────────────────────
  { glob: 'packages/canonical/src/**', level: 'L4' },
  {
    glob: 'packages/core/src/{receipt,hlc,plan,dag,validated-output,ai-cast,assembly,brands}.ts',
    level: 'L4',
  },

  // ── L3: the deterministic runtime / projection / cache paths ───────────
  {
    glob: 'packages/core/src/{boundary,signal,zap,evaluate,gen-frame,speculative,token-buffer,blend,animation}.ts',
    level: 'L3',
  },
  { glob: 'packages/quantizer/src/**', level: 'L3' },
  { glob: 'packages/web/src/capture/**', level: 'L3' },
  { glob: 'packages/web/src/stream/**', level: 'L3' },
  { glob: 'packages/worker/src/**', level: 'L3' },
  { glob: 'packages/astro/src/runtime/**', level: 'L3' },

  // ── L2: public API + serialized contracts ──────────────────────────────
  { glob: 'packages/*/src/index.ts', level: 'L2' },
  { glob: 'packages/*/src/{contract,capsule}.ts', level: 'L2' },
  { glob: 'packages/scene/src/contract.ts', level: 'L2' },
  { glob: 'packages/edge/src/manifest.ts', level: 'L2' },

  // ── L0/L1: tooling — ambient nondeterminism is LEGIT here ──────────────
  { glob: 'packages/{cli,command,mcp-server,audit,gauntlet,remotion,stage}/src/**', level: 'L1' },
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
