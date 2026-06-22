/**
 * The HOST standards-surface EXTRACTOR — the AGENT-SAFETY META-GAUNTLET (the
 * "raccoon rule"), phase A: read the LIVE standards surface, content-address it,
 * diff it against the committed snapshot, apply the owner sign-offs, and produce the
 * flat {@link StandardsIntegrityFacts} the lean `@czap/gauntlet`
 * `standardsIntegrityGate` folds.
 *
 * "The repairman may be a raccoon with commit access." This is the UNCONDITIONAL
 * COMMIT BACKSTOP: it reads COMMITTED REALITY (the gauntlet's own rigor config off
 * its exports + the committed `benchmarks/`/`traceability/` artifacts), not anyone's
 * declaration — so it catches a silent weakening of the standards regardless of
 * who/how it landed.
 *
 * This is the SAME host-injection pattern as `traceability.ts` (the host computes
 * the heavy facts off disk; the lean engine just folds): the gauntlet carries no
 * `@czap/core` content-address kernel and reads no clock, so the addressing + the
 * sign-off-expiry comparison live HERE. The extractor is DETERMINISTIC — the same
 * live config + committed snapshot + sign-offs + injected date yield a byte-identical
 * surface and the same verdicts.
 *
 * THE STANDARDS SURFACE (what the snapshot captures — the gauntlet's own rigor):
 *  - THE GATE SET: every gate in `LITESHIP_GATES` + `LITESHIP_IR_GATES` + the opt-in
 *    gates (ruleId + assurance level + the presence of each self-proving fixture).
 *  - THE ASSURANCE MAP: `LITESHIP_ASSURANCE_MAP` (glob → level).
 *  - THE WAIVERS: `LITESHIP_WAIVERS` (ruleId + expiry) + `ALWAYS_BLOCKING_RULES`.
 *  - THE INVARIANTS LEDGER: `traceability/invariants.yaml` (id + level + proof/waiver).
 *  - THE FLOORS: the committed numeric floors (`benchmarks/mutation-score.json`,
 *    the `benchmarks/complexity-map.json` complexity ceilings) — each with its
 *    DECLARED direction so the diff knows which way is weakening.
 *
 * @module
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentAddressOf } from '@czap/core';
import { InvariantViolationError, ParseError } from '@czap/error';
import {
  LITESHIP_GATES,
  LITESHIP_IR_GATES,
  LITESHIP_WAIVERS,
  LITESHIP_ASSURANCE_MAP,
  ALWAYS_BLOCKING_RULES,
  supplyChainGate,
  mutationDivergenceGate,
  mcdcCoverageGate,
  simulationDeterminismGate,
  traceabilityBridgeGate,
  standardsIntegrityGate,
  sortSurfaceElements,
  surfaceElementKey,
  diffStandardsSurface,
  applyStandardsWaivers,
  type AssuranceLevel,
  type Gate,
  type Waiver,
  type StandardsElement,
  type StandardsSurface,
  type StandardsWaiver,
  type StandardsIntegrityFacts,
} from '@czap/gauntlet';
import { buildTraceabilityFacts } from './traceability.js';

/** Repo-relative location of the committed, reviewable standards snapshot. */
export const STANDARDS_SNAPSHOT_PATH = 'traceability/standards-snapshot.json';
/** Repo-relative location of the committed owner sign-offs (the only honest escape). */
export const STANDARDS_WAIVERS_PATH = 'traceability/standards-waivers.json';
/** The committed per-file mutation-score baseline (higher = stronger). */
const MUTATION_SCORE_BASELINE = 'benchmarks/mutation-score.json';
/** The committed complexity map (each entry's class ceiling; lower rank = stronger). */
const COMPLEXITY_MAP = 'benchmarks/complexity-map.json';

/**
 * The NAMED standards gate sets, captured under their set name so the SAME ruleId in
 * two sets is two surface elements — dropping a gate from one set is a real weaken,
 * even if it survives in the other. The opt-in / always-on host gates are captured as
 * a single `HOST_GATES` set (they are the standards the host composes onto a run).
 */
const GATE_SETS: readonly { readonly set: string; readonly gates: readonly Gate[] }[] = [
  { set: 'LITESHIP_GATES', gates: LITESHIP_GATES },
  { set: 'LITESHIP_IR_GATES', gates: LITESHIP_IR_GATES },
  {
    set: 'HOST_GATES',
    gates: [
      supplyChainGate,
      mutationDivergenceGate,
      mcdcCoverageGate,
      simulationDeterminismGate,
      traceabilityBridgeGate,
      standardsIntegrityGate,
    ],
  },
];

/** The complexity-class ladder (ascending growth) — a LOWER rank is a STRICTER ceiling. */
const COMPLEXITY_LADDER = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A stable per-waiver identity (ruleId + optional file/line) — the diff's match key. */
function waiverKey(w: Waiver): string {
  const file = w.file ?? '';
  const line = w.line ?? '';
  return `${w.ruleId}|${file}|${line}`;
}

/**
 * Extract every GATE-set element: one {@link GateSurface} per gate per set, recording
 * its ruleId, level, and the presence of each self-proving fixture (the authority
 * ratchet's evidence — a reduced count is a gate that no longer self-proves).
 */
function gateElements(): readonly StandardsElement[] {
  const out: StandardsElement[] = [];
  for (const { set, gates } of GATE_SETS) {
    for (const gate of gates) {
      const f = gate.fixtures;
      out.push({
        _tag: 'gate',
        ruleId: gate.id,
        set,
        level: gate.level,
        // `defineGate` enforces all three; capturing the presence FAITHFULLY models the
        // self-proof so a future gate that somehow loses a fixture (or is composed into a
        // set without one) is caught as `fixture-reduced`.
        redFixtureCount: f.red !== undefined ? 1 : 0,
        greenFixtureCount: f.green !== undefined ? 1 : 0,
        mutationFixtureCount: f.mutation !== undefined ? 1 : 0,
      });
    }
  }
  return out;
}

/** Extract every WAIVER element + every ALWAYS-BLOCKING rule element. */
function waiverElements(): readonly StandardsElement[] {
  const out: StandardsElement[] = [];
  for (const w of LITESHIP_WAIVERS) {
    out.push({ _tag: 'waiver', key: waiverKey(w), ruleId: w.ruleId, expiry: w.expires });
  }
  for (const ruleId of ALWAYS_BLOCKING_RULES) {
    out.push({ _tag: 'always-blocking', ruleId });
  }
  return out;
}

/** Extract every ASSURANCE-MAP element (glob → level). */
function assuranceElements(): readonly StandardsElement[] {
  return LITESHIP_ASSURANCE_MAP.map(
    (rule): StandardsElement => ({ _tag: 'assurance', glob: rule.glob, level: rule.level }),
  );
}

/**
 * Extract every INVARIANT-ledger element. Reuses the host traceability state machine
 * ({@link buildTraceabilityFacts}) so the invariants + their resolved proof/waiver kind
 * come from the SAME source of truth the traceability gate uses — never a fork. The
 * proof kind: a `waived`/`expired` invariant is held by a WAIVER; everything else
 * (proven, or declared-with-intent-of-proof) is `proof`.
 */
function invariantElements(repoRoot: string, now: Date): readonly StandardsElement[] {
  const facts = buildTraceabilityFacts(repoRoot, now);
  return facts.invariants.map((inv): StandardsElement => {
    const proofKind: 'proof' | 'waiver' =
      inv.state._tag === 'waived' || inv.state._tag === 'expired' ? 'waiver' : 'proof';
    return { _tag: 'invariant', id: inv.id, level: inv.level as AssuranceLevel, proofKind };
  });
}

/**
 * Extract every committed numeric FLOOR element, each with its DECLARED direction so
 * the diff knows which way is weakening:
 *  - the per-file mutation-score baseline (higher-is-stronger — a LOWER baseline
 *    demands less);
 *  - the complexity-class ceiling per pinned hot path, captured as the ladder RANK
 *    (lower-is-stronger — a HIGHER rank tolerates a worse class).
 */
function floorElements(repoRoot: string): readonly StandardsElement[] {
  const out: StandardsElement[] = [];

  const scorePath = join(repoRoot, MUTATION_SCORE_BASELINE);
  if (existsSync(scorePath)) {
    const parsed: unknown = JSON.parse(readFileSync(scorePath, 'utf8'));
    if (!isRecord(parsed)) {
      throw InvariantViolationError(
        'standards-surface',
        `${MUTATION_SCORE_BASELINE} is not a JSON object of file→score — a corrupt floor artifact`,
      );
    }
    for (const [file, score] of Object.entries(parsed)) {
      if (typeof score !== 'number' || !Number.isFinite(score)) {
        throw InvariantViolationError(
          'standards-surface',
          `${MUTATION_SCORE_BASELINE} entry for "${file}" is not a finite number (got ${String(score)})`,
        );
      }
      out.push({ _tag: 'floor', name: `mutation-score::${file}`, value: score, direction: 'higher-is-stronger' });
    }
  }

  const complexityPath = join(repoRoot, COMPLEXITY_MAP);
  if (existsSync(complexityPath)) {
    const parsed: unknown = JSON.parse(readFileSync(complexityPath, 'utf8'));
    if (!isRecord(parsed) || !Array.isArray(parsed.entries)) {
      throw ParseError(COMPLEXITY_MAP, 'expected an { entries: [...] } object');
    }
    for (const entry of parsed.entries) {
      if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.class !== 'string') continue;
      const rank = (COMPLEXITY_LADDER as readonly string[]).indexOf(entry.class);
      if (rank < 0) {
        throw InvariantViolationError(
          'standards-surface',
          `${COMPLEXITY_MAP} records path "${entry.path}" with unrecognized class "${entry.class}"`,
        );
      }
      // The committed CLASS RANK is the ceiling-floor: a HIGHER rank (worse class)
      // tolerated for the path is a WEAKEN, so lower-is-stronger.
      out.push({ _tag: 'floor', name: `complexity-class::${entry.path}`, value: rank, direction: 'lower-is-stronger' });
    }
  }

  return out;
}

/**
 * Read the LIVE standards surface — the gauntlet's own rigor config (off its exports)
 * + the committed `benchmarks/`/`traceability/` artifacts — into a canonical,
 * content-addressed model. Pure given (`repoRoot`, `now`): deterministic + sorted; the
 * content address is minted via the ONE `contentAddressOf` kernel over the SORTED
 * elements (so the address omits ordering noise). `now` is the INJECTED wall-clock date
 * the traceability state machine resolves invariant states against (the two-clock law).
 *
 * Run twice over the same config → byte-identical surface + identical address.
 */
export function readLiveStandardsSurface(repoRoot: string, now: Date): StandardsSurface {
  const elements = sortSurfaceElements([
    ...gateElements(),
    ...waiverElements(),
    ...assuranceElements(),
    ...invariantElements(repoRoot, now),
    ...floorElements(repoRoot),
  ]);
  // A duplicate key would silently collapse two elements in the diff — fail loud.
  const seen = new Set<string>();
  for (const el of elements) {
    const key = surfaceElementKey(el);
    if (seen.has(key)) {
      throw InvariantViolationError(
        'standards-surface',
        `duplicate standards element key "${key}" — the surface model is not uniquely keyed (a real extractor bug, never a silent collapse)`,
      );
    }
    seen.add(key);
  }
  // `contentAddressOf` already returns a `fnv1a:`-prefixed ContentAddress — record it
  // verbatim (no re-prefix), so the address is the exact kernel output.
  const address = String(contentAddressOf(elements));
  return { snapshotFormat: 1, elements, address };
}

/**
 * Serialize a surface to its CANONICAL JSON string — sorted elements, 2-space indent,
 * a trailing newline — so the committed snapshot is byte-reproducible and diffs are
 * minimal + reviewable (the same contract as the api-surface snapshot).
 */
export function serializeStandardsSurface(surface: StandardsSurface): string {
  return `${JSON.stringify(
    { snapshotFormat: surface.snapshotFormat, address: surface.address, elements: surface.elements },
    null,
    2,
  )}\n`;
}

/** Read + parse the committed standards snapshot. Fails loud on a malformed file. */
export function readCommittedSnapshot(repoRoot: string): StandardsSurface {
  const path = join(repoRoot, STANDARDS_SNAPSHOT_PATH);
  if (!existsSync(path)) {
    throw InvariantViolationError(
      'standards-surface',
      `the committed standards snapshot ${STANDARDS_SNAPSHOT_PATH} is missing — the raccoon-rule backstop needs the committed ground truth to diff against. Generate it intentionally (CZAP_UPDATE_STANDARDS_SNAPSHOT=1).`,
    );
  }
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isRecord(parsed) || parsed.snapshotFormat !== 1 || !Array.isArray(parsed.elements)) {
    throw ParseError(STANDARDS_SNAPSHOT_PATH, 'not a recognizable standards snapshot (snapshotFormat 1 + elements[])');
  }
  return {
    snapshotFormat: 1,
    elements: parsed.elements as readonly StandardsElement[],
    address: typeof parsed.address === 'string' ? parsed.address : '',
  };
}

/** Write the committed standards snapshot (the intentional-regeneration path). */
export function writeCommittedSnapshot(repoRoot: string, surface: StandardsSurface): void {
  writeFileSync(join(repoRoot, STANDARDS_SNAPSHOT_PATH), serializeStandardsSurface(surface));
}

/**
 * Read the committed owner sign-offs (the only honest escape). Absent file → an EMPTY
 * list (no weakening is signed — the strict default). A malformed file is a tagged
 * throw (a corrupt sign-off ledger must be visible, never silently treated as "no
 * sign-offs", which would re-block a legitimately-signed weakening — or worse, a
 * truncated file could silently DROP a forbidden-check entry).
 */
export function readStandardsWaivers(repoRoot: string): readonly StandardsWaiver[] {
  const path = join(repoRoot, STANDARDS_WAIVERS_PATH);
  if (!existsSync(path)) return [];
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isRecord(parsed) || !Array.isArray(parsed.signoffs)) {
    throw ParseError(STANDARDS_WAIVERS_PATH, 'expected a { signoffs: [...] } object');
  }
  const out: StandardsWaiver[] = [];
  for (const s of parsed.signoffs) {
    if (
      !isRecord(s) ||
      typeof s.elementKey !== 'string' ||
      typeof s.weakening !== 'string' ||
      typeof s.owner !== 'string' ||
      typeof s.justification !== 'string' ||
      typeof s.expiry !== 'string'
    ) {
      throw InvariantViolationError(
        'standards-surface',
        `a sign-off in ${STANDARDS_WAIVERS_PATH} is missing a required field (elementKey, weakening, owner, justification, expiry all required + string)`,
      );
    }
    out.push({
      elementKey: s.elementKey,
      weakening: s.weakening as StandardsWaiver['weakening'],
      owner: s.owner,
      justification: s.justification,
      expiry: s.expiry,
    });
  }
  return out;
}

/**
 * Build the {@link StandardsIntegrityFacts} the `standardsIntegrityGate` folds — the
 * HOST's heavy job (the raccoon-rule backstop). Pure given (`repoRoot`, `now`):
 *
 *  1. Read the LIVE standards surface (content-addressed).
 *  2. Read the COMMITTED snapshot.
 *  3. Diff them (the PURE `diffStandardsSurface` — classify every change).
 *  4. Apply the owner sign-offs against the injected `now` + the live always-blocking
 *     rule ids (so a weakening of an always-blocking rule can never be signed).
 *
 * `now` is the INJECTED wall-clock date (the two-clock law — never `Date.now()` here).
 * A SUCCESSFUL extraction over an UN-weakened repo yields zero unsigned weakenings (the
 * gate is green); a weakening without a matching sign-off yields a blocking finding.
 */
export function buildStandardsIntegrityFacts(repoRoot: string, now: Date): StandardsIntegrityFacts {
  const live = readLiveStandardsSurface(repoRoot, now);
  const committed = readCommittedSnapshot(repoRoot);
  const changes = diffStandardsSurface(committed.elements, live.elements);
  const signoffs = readStandardsWaivers(repoRoot);
  const alwaysBlocking = new Set(ALWAYS_BLOCKING_RULES);
  const partitioned = applyStandardsWaivers(changes, signoffs, now, alwaysBlocking);
  return { ...partitioned, committedAddress: committed.address, liveAddress: live.address };
}
