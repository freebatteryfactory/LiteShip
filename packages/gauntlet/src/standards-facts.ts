/**
 * Standards-surface facts — the AGENT-SAFETY META-GAUNTLET (the "raccoon rule"),
 * phase A: the lean model + the pure WEAKENING-DIFF the {@link standardsIntegrityGate}
 * folds. "The repairman may be a raccoon with commit access" — an edit must not
 * SILENTLY WEAKEN the gauntlet's own rigor standards.
 *
 * This is the UNCONDITIONAL COMMIT BACKSTOP: it diffs the LIVE standards surface
 * (the gauntlet's own rigor config — the gate set, each gate's self-proving
 * fixtures, the assurance map, the waivers, the invariants ledger, the numeric
 * floors) against a COMMITTED, content-addressed snapshot, classifies every change
 * STRENGTHEN | WEAKEN | NEUTRAL, and blocks an UNSIGNED weakening regardless of
 * who/how it landed (it checks committed reality, not anyone's declaration).
 *
 * Like {@link TraceabilityFacts}, {@link RepoIR}, {@link SupplyChainFacts}, and
 * {@link MutationFacts}, this module defines ONLY the lean INTERFACE + the PURE
 * diff/classify functions and carries NO heavy dependency: `@czap/gauntlet` stays
 * the lean engine, so it never reads the filesystem, never content-addresses (the
 * fnv1a kernel lives in `@czap/core`), and never reads a clock. A HOST (the CLI's
 * `packages/cli/src/lib/standards-surface.ts` extractor) does the heavy lifting —
 * read the live config off `@czap/gauntlet`'s own exports + the committed
 * `benchmarks/`/`traceability/` artifacts, content-address the surface via the ONE
 * `contentAddressOf` kernel, diff it against the committed snapshot, apply the
 * owner sign-offs — and hands the engine these flat, already-decided facts. The
 * gate's only job is to FOLD them into Findings (the lean engine folds facts; the
 * host computes them — ADR-0012).
 *
 * THE ONLY HONEST ESCAPE. A weakening is permitted ONLY via an explicit committed
 * {@link StandardsWaiver} — a waiver-with-teeth (owner, justification, the exact
 * element being weakened, expiry), the SAME accountability shape as the gauntlet's
 * own {@link Waiver}. An UNSIGNED weakening is the raccoon caught (blocking). A
 * SIGNED one is allowed + recorded. The sign-off can NEVER cover
 * {@link ALWAYS_BLOCKING_RULES} (placeholder/skip can never be weakened-in).
 *
 * Composition, not inheritance: every surface element is a `_tag`-discriminated
 * DATA record; the diff is standalone functions over them. No classes.
 *
 * @module
 */

import type { AssuranceLevel } from './assurance.js';

// ───────────────────────────── the surface model ────────────────────────────
//
// A canonical, content-addressed serialization of the gauntlet's own rigor
// standards. Every element carries enough to CLASSIFY a change (strengthen vs
// weaken). The model is a sorted, deterministic union of `_tag`ged records.

/**
 * One GATE in a standards set: its ruleId, the assurance level it operates at, the
 * set it belongs to, and the PRESENCE of each self-proving fixture (the authority
 * ratchet's evidence). A REMOVED gate (gone from the set), a gate dropped from a
 * set, a LOWERED level, or a REDUCED fixture count (a gate that no longer
 * self-proves loses its teeth) is a WEAKEN.
 */
export interface GateSurface {
  readonly _tag: 'gate';
  /** The gate's stable ruleId (the {@link Finding} namespace). */
  readonly ruleId: string;
  /** Which standards set this gate belongs to (`LITESHIP_GATES` / `LITESHIP_IR_GATES` / an opt-in set). */
  readonly set: string;
  /** The assurance level the gate operates at — LOWERING it is a WEAKEN. */
  readonly level: AssuranceLevel;
  /** 1 iff the gate ships a `red` fixture (the known-bad world it MUST flag), else 0. */
  readonly redFixtureCount: number;
  /** 1 iff the gate ships a `green` fixture (the known-good world it MUST pass), else 0. */
  readonly greenFixtureCount: number;
  /** 1 iff the gate ships a `mutation` fixture (the operator its fixtures must kill), else 0. */
  readonly mutationFixtureCount: number;
}

/**
 * One WAIVER in `LITESHIP_WAIVERS`: the rule it suppresses + its expiry. A NEW
 * waiver (more is waived), or a waiver whose expiry is EXTENDED (the debt deferred
 * longer), is a WEAKEN.
 */
export interface WaiverSurface {
  readonly _tag: 'waiver';
  /** A stable, content-derived key (ruleId + optional file/line) identifying this waiver. */
  readonly key: string;
  /** The rule whose finding this waiver suppresses. */
  readonly ruleId: string;
  /** The waiver's expiry (ISO `yyyy-mm-dd`). A LATER expiry is a WEAKEN. */
  readonly expiry: string;
}

/**
 * One ALWAYS-BLOCKING rule (`ALWAYS_BLOCKING_RULES`) — the never-waivable floor
 * (placeholder/skip). The SET SHRINKING (a rule removed from it) is a WEAKEN.
 */
export interface AlwaysBlockingSurface {
  readonly _tag: 'always-blocking';
  /** The rule id that no waiver may ever cover. */
  readonly ruleId: string;
}

/**
 * One ASSURANCE-MAP entry (`LITESHIP_ASSURANCE_MAP`): a glob → level. A file's
 * level LOWERED (an L4 path demoted to L2) is a WEAKEN. The key is the glob (a
 * stable identity); a change in its level is the diff.
 */
export interface AssuranceSurface {
  readonly _tag: 'assurance';
  /** The repo-relative glob this rule scopes. */
  readonly glob: string;
  /** The assurance level paths matching the glob carry — LOWERING it is a WEAKEN. */
  readonly level: AssuranceLevel;
}

/**
 * One INVARIANT in the traceability ledger (`traceability/invariants.yaml`): its
 * id, level, and how it is proved. An invariant REMOVED, its level LOWERED, or a
 * PROOF replaced by a WAIVER is a WEAKEN.
 */
export interface InvariantSurface {
  readonly _tag: 'invariant';
  /** The stable INV-* id. */
  readonly id: string;
  /** The invariant's assurance level — LOWERING it is a WEAKEN. */
  readonly level: AssuranceLevel;
  /** How the invariant is upheld — `proof` (a proving test) is stronger than `waiver` (a signed deferral). */
  readonly proofKind: 'proof' | 'waiver';
}

/**
 * The DIRECTION of a numeric floor — which way is STRONGER. Captured per-floor so
 * the diff knows which way is weakening WITHOUT a hardcoded per-name table:
 *  - `higher-is-stronger`: a coverage floor, a mutation-score baseline (a LOWER
 *    value is a WEAKEN — less is demanded).
 *  - `lower-is-stronger`: a complexity-class ceiling, an advisory budget (a HIGHER
 *    value is a WEAKEN — more is tolerated).
 */
export type FloorDirection = 'higher-is-stronger' | 'lower-is-stronger';

/**
 * One committed numeric FLOOR (a mutation-score baseline entry, a complexity
 * ceiling, the zero-advisory floor, a coverage floor). The {@link direction}
 * declares which way is weakening, so the diff is direction-aware.
 */
export interface FloorSurface {
  readonly _tag: 'floor';
  /** A stable name identifying this floor (e.g. `mutation-score::packages/canonical/src/fnv.ts`). */
  readonly name: string;
  /** The committed value. */
  readonly value: number;
  /** Which way is STRONGER — so the diff knows which way is weakening. */
  readonly direction: FloorDirection;
}

/**
 * One SANCTIONED CAPABILITY-GATED SKIP (an entry in `SANCTIONED_SKIPS`) — the
 * waiver-with-teeth that makes a legit `tests/` skip VISIBLE + auditable. A skip is a
 * lie UNLESS it is enumerated; enumerating it is the honest, accountable escape. ADDING
 * an entry (more is skipped) is a WEAKEN — it surfaces in the raccoon-rule diff and must
 * be an intentional snapshot regeneration; REMOVING one (a re-enabled test) is a
 * STRENGTHEN. It can NEVER be signed off against the always-blocking rule it relaxes (the
 * `gauntlet/no-skipped-test` floor), so an allowlist-add is a {@link NEVER_SIGNABLE_WEAKENINGS}
 * class — the meta-analogue of "you cannot waive a lie".
 */
export interface SkipAllowlistSurface {
  readonly _tag: 'skip-allowlist';
  /** The repo-relative test file whose skip is sanctioned. */
  readonly file: string;
  /**
   * The SITE discriminator — the normalized source line the sanctioned skip sits on. The
   * sanction is PER-SITE, not per-file: `(file, site)` is the stable identity, so a file
   * may carry MULTIPLE sanctioned sites (e.g. the wasm-parity dual arms) as two distinct
   * surface elements, and adding a NEW site to an already-sanctioned file is a visible
   * WEAKEN (one more skip allowed) the raccoon-rule diff surfaces.
   */
  readonly site: string;
  /** The capability whose absence sanctions the skip (ffmpeg-absent / wasm-absent / …). */
  readonly capability: string;
}

/** One element of the standards surface — a `_tag`-discriminated union. */
export type StandardsElement =
  | GateSurface
  | WaiverSurface
  | AlwaysBlockingSurface
  | AssuranceSurface
  | InvariantSurface
  | FloorSurface
  | SkipAllowlistSurface;

/**
 * The full content-addressed STANDARDS SURFACE — a sorted, deterministic list of
 * elements + the address of the resolved surface (the drift keystone). The HOST
 * mints the address via the ONE `contentAddressOf` kernel; two extractions of the
 * same live config produce a byte-identical surface and the same address.
 */
export interface StandardsSurface {
  /** Snapshot format version — bumped if the element schema itself changes. */
  readonly snapshotFormat: 1;
  /** Every standards element, in canonical order (sorted by {@link surfaceElementKey}). */
  readonly elements: readonly StandardsElement[];
  /** The content address (fnv1a over the canonical elements) — host-minted; drift detector. */
  readonly address: string;
}

// ───────────────────────────── the standards waiver ─────────────────────────

/**
 * The OWNER SIGN-OFF — the only honest escape for a weakening. A signed
 * authorization that a SPECIFIC weakening is intentional, with the SAME
 * accountability shape as the gauntlet's own {@link Waiver}: an owner, a
 * justification, the EXACT element key being weakened, and an expiry.
 *
 * An UNSIGNED weakening = the raccoon caught (blocking). A SIGNED one = allowed +
 * recorded. The sign-off can NEVER cover {@link ALWAYS_BLOCKING_RULES} (the
 * always-blocking set shrinking, or a gate emitting an always-blocking rule being
 * weakened) — checked in {@link diffStandardsSurface}, never honoured here.
 */
export interface StandardsWaiver {
  /** The exact {@link surfaceElementKey} of the element being weakened. */
  readonly elementKey: string;
  /** The expected weakening CLASS this sign-off authorizes (a sign-off is class-specific). */
  readonly weakening: WeakeningClass;
  /** Who signed off — accountability is mandatory, never anonymous. */
  readonly owner: string;
  /** Why the weakening is sanctioned — the justification of record. */
  readonly justification: string;
  /** When the sign-off dies (ISO `yyyy-mm-dd`). Past the injected date ⇒ the weakening re-reds. */
  readonly expiry: string;
}

// ─────────────────────────── the canonical element key ──────────────────────

/**
 * The STABLE IDENTITY of a surface element — the key the diff matches on (so a
 * change to an element's value is seen as a MODIFY, not an add+remove). Pure +
 * deterministic; the same element always yields the same key. A gate's key is
 * namespaced by its SET (the same ruleId in two sets is two elements — dropping it
 * from one set is a real weaken).
 */
export function surfaceElementKey(el: StandardsElement): string {
  switch (el._tag) {
    case 'gate':
      return `gate::${el.set}::${el.ruleId}`;
    case 'waiver':
      return `waiver::${el.key}`;
    case 'always-blocking':
      return `always-blocking::${el.ruleId}`;
    case 'assurance':
      return `assurance::${el.glob}`;
    case 'invariant':
      return `invariant::${el.id}`;
    case 'floor':
      return `floor::${el.name}`;
    case 'skip-allowlist':
      // PER-SITE identity: `(file, site)`. A file may carry multiple sanctioned sites, so
      // the file alone is not the identity — keying by file would collapse the dual arms
      // into one element and hide a sanctioned site from the snapshot.
      return `skip-allowlist::${el.file}::${el.site}`;
  }
}

/** Code-unit (UTF-16) compare — byte-stable across machines/locales, never `localeCompare`. */
function codeUnitCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Sort a list of surface elements into the CANONICAL order (by their stable key),
 * returning a NEW array. The host serializes this order so the committed snapshot
 * is byte-reproducible and diffs are minimal + reviewable.
 */
export function sortSurfaceElements(elements: readonly StandardsElement[]): readonly StandardsElement[] {
  return [...elements].sort((a, b) => codeUnitCompare(surfaceElementKey(a), surfaceElementKey(b)));
}

// ─────────────────────────── the assurance-level ladder ─────────────────────
//
// The diff needs to know which way is "lower" for an assurance level WITHOUT
// importing the engine's rank helper into a value position that would couple the
// modules — a tiny closed constant, the L0..L4 ascending ladder, pinned by a guard
// test against `assurance.ASSURANCE_LEVELS`.

const LEVEL_LADDER = ['L0', 'L1', 'L2', 'L3', 'L4'] as const;

/** The rank of an assurance level (0..4); higher is stricter. */
function levelRank(level: AssuranceLevel): number {
  return (LEVEL_LADDER as readonly string[]).indexOf(level);
}

// ──────────────────────────────── the weakening diff ────────────────────────

/**
 * The classification of one change between the committed snapshot and the live
 * surface:
 *  - `strengthen`: added gate/fixture/invariant/always-blocking-rule, raised floor,
 *    raised level, removed waiver, shortened waiver expiry → OK (but the snapshot
 *    should be regenerated; an un-regenerated strengthen is NEUTRAL drift, not
 *    blocking).
 *  - `weaken`: removed gate, reduced fixtures, lowered floor, lowered/removed
 *    invariant, added/extended waiver, lowered level, shrunk always-blocking set,
 *    a proof replaced by a waiver → BLOCKING unless owner-signed.
 *  - `neutral`: a change that neither strengthens nor weakens (e.g. a snapshot that
 *    is simply un-regenerated after a strengthen, or an address-only restamp).
 */
export type ChangeClass = 'strengthen' | 'weaken' | 'neutral';

/**
 * The WEAKENING CLASS of a weaken (the specific erosion) — used to match an owner
 * sign-off (a sign-off is class-specific, so authorizing a "lowered floor" does not
 * also authorize a "removed gate" on the same key by accident).
 */
export type WeakeningClass =
  | 'gate-removed'
  | 'gate-level-lowered'
  | 'fixture-reduced'
  | 'waiver-added'
  | 'waiver-extended'
  | 'always-blocking-removed'
  | 'assurance-level-lowered'
  | 'invariant-removed'
  | 'invariant-level-lowered'
  | 'invariant-proof-to-waiver'
  | 'floor-lowered'
  | 'skip-allowlist-added';

/** A single classified change between the committed snapshot and the live surface. */
export interface StandardsChange {
  /** The stable key of the element that changed. */
  readonly elementKey: string;
  /** Strengthen (OK), weaken (blocks unless signed), or neutral. */
  readonly changeClass: ChangeClass;
  /** For a weaken, the specific weakening class (matched against a sign-off); empty for non-weakens. */
  readonly weakening?: WeakeningClass;
  /** Human-readable WHY — enough to act on without re-reading the surface. */
  readonly detail: string;
}

/**
 * The full DECIDED diff the gate folds: every classified change, partitioned by the
 * host's owner-sign-off application. The host has ALREADY applied the standards
 * waivers (matched a `weaken` to a non-expired, class-matching sign-off), so the
 * gate just reports.
 */
export interface StandardsIntegrityFacts {
  /** Unsigned WEAKENINGS — the raccoon caught. Each is a BLOCKING finding. */
  readonly unsignedWeakenings: readonly StandardsChange[];
  /** Signed weakenings — allowed + recorded (the honest escape). Reported as an audit advisory. */
  readonly signedWeakenings: readonly (StandardsChange & { readonly owner: string; readonly justification: string })[];
  /**
   * Un-regenerated STRENGTHENS / NEUTRAL drift — the snapshot is stale but in a
   * SAFE direction. A normal "regenerate intentionally" finding (warning), NOT
   * blocking-as-weakening.
   */
  readonly unregeneratedStrengthens: readonly StandardsChange[];
  /**
   * FORBIDDEN sign-offs — a standards waiver that tried to authorize an
   * always-blocking weakening (the skip/placeholder floor). VOID: it errors AND the
   * weakening it tried to cover stays in {@link unsignedWeakenings}.
   */
  readonly forbiddenSignoffs: readonly {
    readonly elementKey: string;
    readonly owner: string;
    readonly detail: string;
  }[];
  /** EXPIRED sign-offs — a sign-off whose expiry is past the injected date (the weakening re-reds). */
  readonly expiredSignoffs: readonly { readonly elementKey: string; readonly owner: string; readonly expiry: string }[];
  /** The committed snapshot's address + the live surface's address (the drift keystone, carried for the report). */
  readonly committedAddress: string;
  readonly liveAddress: string;
}

/**
 * Diff two GATE surfaces (same key) — a removed/added gate is handled by the
 * caller's key set-difference; this handles a MODIFY (level, fixtures).
 */
function diffGate(prior: GateSurface, current: GateSurface): readonly StandardsChange[] {
  const key = surfaceElementKey(current);
  const out: StandardsChange[] = [];
  const priorRank = levelRank(prior.level);
  const currentRank = levelRank(current.level);
  if (currentRank < priorRank) {
    out.push({
      elementKey: key,
      changeClass: 'weaken',
      weakening: 'gate-level-lowered',
      detail: `gate ${current.ruleId} (set ${current.set}) level LOWERED ${prior.level} → ${current.level} — a gate's rigor was demoted.`,
    });
  } else if (currentRank > priorRank) {
    out.push({
      elementKey: key,
      changeClass: 'strengthen',
      detail: `gate ${current.ruleId} (set ${current.set}) level raised ${prior.level} → ${current.level}.`,
    });
  }
  const priorFixtures = prior.redFixtureCount + prior.greenFixtureCount + prior.mutationFixtureCount;
  const currentFixtures = current.redFixtureCount + current.greenFixtureCount + current.mutationFixtureCount;
  if (currentFixtures < priorFixtures) {
    out.push({
      elementKey: key,
      changeClass: 'weaken',
      weakening: 'fixture-reduced',
      detail: `gate ${current.ruleId} (set ${current.set}) self-proof fixtures REDUCED ${priorFixtures} → ${currentFixtures} (red ${prior.redFixtureCount}→${current.redFixtureCount}, green ${prior.greenFixtureCount}→${current.greenFixtureCount}, mutation ${prior.mutationFixtureCount}→${current.mutationFixtureCount}) — a gate that no longer self-proves loses its teeth.`,
    });
  } else if (currentFixtures > priorFixtures) {
    out.push({
      elementKey: key,
      changeClass: 'strengthen',
      detail: `gate ${current.ruleId} (set ${current.set}) self-proof fixtures added ${priorFixtures} → ${currentFixtures}.`,
    });
  }
  return out;
}

/** Diff a waiver MODIFY (same key) — only an EXTENDED expiry is a weaken. */
function diffWaiver(prior: WaiverSurface, current: WaiverSurface): readonly StandardsChange[] {
  const key = surfaceElementKey(current);
  const priorTime = new Date(prior.expiry).getTime();
  const currentTime = new Date(current.expiry).getTime();
  if (currentTime > priorTime) {
    return [
      {
        elementKey: key,
        changeClass: 'weaken',
        weakening: 'waiver-extended',
        detail: `waiver for ${current.ruleId} expiry EXTENDED ${prior.expiry} → ${current.expiry} — the debt is deferred longer (more is waived for longer).`,
      },
    ];
  }
  if (currentTime < priorTime) {
    return [
      {
        elementKey: key,
        changeClass: 'strengthen',
        detail: `waiver for ${current.ruleId} expiry shortened ${prior.expiry} → ${current.expiry}.`,
      },
    ];
  }
  return [];
}

/** Diff an assurance-map MODIFY (same glob) — a LOWERED level is a weaken. */
function diffAssurance(prior: AssuranceSurface, current: AssuranceSurface): readonly StandardsChange[] {
  const key = surfaceElementKey(current);
  const priorRank = levelRank(prior.level);
  const currentRank = levelRank(current.level);
  if (currentRank < priorRank) {
    return [
      {
        elementKey: key,
        changeClass: 'weaken',
        weakening: 'assurance-level-lowered',
        detail: `assurance for ${current.glob} LOWERED ${prior.level} → ${current.level} — a path was demoted to a weaker rigor band.`,
      },
    ];
  }
  if (currentRank > priorRank) {
    return [
      {
        elementKey: key,
        changeClass: 'strengthen',
        detail: `assurance for ${current.glob} raised ${prior.level} → ${current.level}.`,
      },
    ];
  }
  return [];
}

/** Diff an invariant MODIFY (same id) — a lowered level OR proof→waiver is a weaken. */
function diffInvariant(prior: InvariantSurface, current: InvariantSurface): readonly StandardsChange[] {
  const key = surfaceElementKey(current);
  const out: StandardsChange[] = [];
  const priorRank = levelRank(prior.level);
  const currentRank = levelRank(current.level);
  if (currentRank < priorRank) {
    out.push({
      elementKey: key,
      changeClass: 'weaken',
      weakening: 'invariant-level-lowered',
      detail: `invariant ${current.id} level LOWERED ${prior.level} → ${current.level} — a system law was demoted.`,
    });
  } else if (currentRank > priorRank) {
    out.push({
      elementKey: key,
      changeClass: 'strengthen',
      detail: `invariant ${current.id} level raised ${prior.level} → ${current.level}.`,
    });
  }
  if (prior.proofKind === 'proof' && current.proofKind === 'waiver') {
    out.push({
      elementKey: key,
      changeClass: 'weaken',
      weakening: 'invariant-proof-to-waiver',
      detail: `invariant ${current.id} proof REPLACED BY A WAIVER (proof → waiver) — a proven law became a deferred one.`,
    });
  } else if (prior.proofKind === 'waiver' && current.proofKind === 'proof') {
    out.push({
      elementKey: key,
      changeClass: 'strengthen',
      detail: `invariant ${current.id} upgraded from a waiver to a real proof.`,
    });
  }
  return out;
}

/** Diff a floor MODIFY (same name) — direction-aware (the floor declares which way is stronger). */
function diffFloor(prior: FloorSurface, current: FloorSurface): readonly StandardsChange[] {
  const key = surfaceElementKey(current);
  if (current.value === prior.value) return [];
  // Weaker iff the value moved in the DECLARED weak direction.
  const movedWeaker =
    current.direction === 'higher-is-stronger' ? current.value < prior.value : current.value > prior.value;
  if (movedWeaker) {
    return [
      {
        elementKey: key,
        changeClass: 'weaken',
        weakening: 'floor-lowered',
        detail: `floor ${current.name} relaxed ${prior.value} → ${current.value} (${current.direction}) — less rigor is now demanded.`,
      },
    ];
  }
  return [
    {
      elementKey: key,
      changeClass: 'strengthen',
      detail: `floor ${current.name} tightened ${prior.value} → ${current.value} (${current.direction}).`,
    },
  ];
}

/**
 * Diff a skip-allowlist MODIFY (same `(file, site)`) — only the CAPABILITY reason changed.
 * The exact SITE is still sanctioned (the skip is still allowed), so the count of allowed
 * skips is unchanged: NEUTRAL drift (re-label the reason; regenerate the snapshot to
 * refresh it). A re-worded SITE is NOT a modify — the site is part of the identity, so it
 * surfaces as a remove (strengthen) + add (weaken), re-opening the sanction (correct).
 */
function diffSkipAllowlist(prior: SkipAllowlistSurface, current: SkipAllowlistSurface): readonly StandardsChange[] {
  if (prior.capability === current.capability) return [];
  return [
    {
      elementKey: surfaceElementKey(current),
      changeClass: 'neutral',
      detail: `sanctioned skip for ${current.file} (site \`${current.site}\`) capability re-labelled ${prior.capability} → ${current.capability} — still sanctioned (the skip count is unchanged); regenerate the snapshot to refresh the recorded reason.`,
    },
  ];
}

/** The detail message for a REMOVED element (gone from the live surface) — always a weaken. */
function removalChange(el: StandardsElement): StandardsChange {
  const key = surfaceElementKey(el);
  switch (el._tag) {
    case 'gate':
      return {
        elementKey: key,
        changeClass: 'weaken',
        weakening: 'gate-removed',
        detail: `gate ${el.ruleId} REMOVED from set ${el.set} — a self-proving gate dropped from a standards set.`,
      };
    case 'always-blocking':
      return {
        elementKey: key,
        changeClass: 'weaken',
        weakening: 'always-blocking-removed',
        detail: `ALWAYS_BLOCKING rule ${el.ruleId} REMOVED — the never-waivable floor (placeholder/skip family) shrank. This can NEVER be signed off.`,
      };
    case 'invariant':
      return {
        elementKey: key,
        changeClass: 'weaken',
        weakening: 'invariant-removed',
        detail: `invariant ${el.id} REMOVED from the ledger — a system law dropped from the safety case.`,
      };
    case 'floor':
      return {
        elementKey: key,
        changeClass: 'weaken',
        weakening: 'floor-lowered',
        detail: `floor ${el.name} REMOVED — a committed numeric floor dropped (no floor demands no rigor).`,
      };
    case 'assurance':
      return {
        elementKey: key,
        changeClass: 'weaken',
        weakening: 'assurance-level-lowered',
        detail: `assurance rule for ${el.glob} (${el.level}) REMOVED — a path lost its rigor band (defaults to the weak L1 floor).`,
      };
    case 'waiver':
      // A REMOVED waiver = LESS is waived = a STRENGTHEN.
      return {
        elementKey: key,
        changeClass: 'strengthen',
        detail: `waiver for ${el.ruleId} removed — less is waived.`,
      };
    case 'skip-allowlist':
      // A REMOVED sanctioned site = LESS is skipped (a test re-enabled, or the skip
      // re-worded so this exact site no longer matches) = a STRENGTHEN.
      return {
        elementKey: key,
        changeClass: 'strengthen',
        detail: `sanctioned skip for ${el.file} (site \`${el.site}\`) removed — one fewer skip SITE is allowed (a capability gate was re-wired, re-worded, or the dead skip dropped).`,
      };
  }
}

/** The detail message for an ADDED element (new to the live surface). */
function additionChange(el: StandardsElement): StandardsChange {
  const key = surfaceElementKey(el);
  if (el._tag === 'waiver') {
    // A NEW waiver = MORE is waived = a WEAKEN.
    return {
      elementKey: key,
      changeClass: 'weaken',
      weakening: 'waiver-added',
      detail: `NEW waiver for ${el.ruleId} (expires ${el.expiry}) — more is waived than the committed snapshot recorded.`,
    };
  }
  if (el._tag === 'skip-allowlist') {
    // A NEW sanctioned skip = MORE is skipped = a WEAKEN (the always-blocking
    // no-skipped-test floor relaxed for one more file). Like a waiver-add, this can
    // NEVER be signed off (it relaxes an always-blocking rule) — `skip-allowlist-added`
    // is in NEVER_SIGNABLE_WEAKENINGS.
    return {
      elementKey: key,
      changeClass: 'weaken',
      weakening: 'skip-allowlist-added',
      detail: `NEW sanctioned skip for ${el.file} (site \`${el.site}\`, capability: ${el.capability}) — one more skip SITE is allowed than the committed snapshot recorded. A skip allowlist entry can never be signed off (it relaxes the always-blocking no-skipped-test floor); regenerate the snapshot intentionally only if the capability gate is genuinely honest.`,
    };
  }
  // Adding any other element (gate, invariant, always-blocking rule, floor,
  // assurance band) is a STRENGTHEN.
  return {
    elementKey: key,
    changeClass: 'strengthen',
    detail: `${el._tag} ${key} ADDED — the standards surface grew (more rigor).`,
  };
}

/**
 * The PURE weakening diff — classify every change between the committed snapshot's
 * elements and the live surface's elements. Order-independent (keyed by
 * {@link surfaceElementKey}). Returns the changes sorted by key.
 *
 * This is the core of the backstop: it has NO clock, NO I/O, NO content-address (the
 * host supplies the addresses). The host runs this, then partitions the weakenings
 * by the owner sign-offs (`applyStandardsWaivers`).
 */
export function diffStandardsSurface(
  prior: readonly StandardsElement[],
  current: readonly StandardsElement[],
): readonly StandardsChange[] {
  const priorByKey = new Map(prior.map((el) => [surfaceElementKey(el), el] as const));
  const currentByKey = new Map(current.map((el) => [surfaceElementKey(el), el] as const));
  const changes: StandardsChange[] = [];

  for (const [key, currentEl] of currentByKey) {
    const priorEl = priorByKey.get(key);
    if (priorEl === undefined) {
      changes.push(additionChange(currentEl));
      continue;
    }
    // Same key, possibly different value — dispatch on the (matching) tag.
    if (priorEl._tag === 'gate' && currentEl._tag === 'gate') changes.push(...diffGate(priorEl, currentEl));
    else if (priorEl._tag === 'waiver' && currentEl._tag === 'waiver') changes.push(...diffWaiver(priorEl, currentEl));
    else if (priorEl._tag === 'assurance' && currentEl._tag === 'assurance')
      changes.push(...diffAssurance(priorEl, currentEl));
    else if (priorEl._tag === 'invariant' && currentEl._tag === 'invariant')
      changes.push(...diffInvariant(priorEl, currentEl));
    else if (priorEl._tag === 'floor' && currentEl._tag === 'floor') changes.push(...diffFloor(priorEl, currentEl));
    else if (priorEl._tag === 'skip-allowlist' && currentEl._tag === 'skip-allowlist')
      changes.push(...diffSkipAllowlist(priorEl, currentEl));
    else if (priorEl._tag !== currentEl._tag) {
      // The element kind under one key changed — a structural change; treat
      // conservatively as a weaken (the prior guarantee is gone).
      changes.push({
        elementKey: key,
        changeClass: 'weaken',
        weakening: 'gate-removed',
        detail: `element ${key} changed kind ${priorEl._tag} → ${currentEl._tag} — the prior standards guarantee under this key is gone.`,
      });
    }
    // (always-blocking carries no value beyond its key — presence is the whole
    // signal; a MODIFY is impossible, only add/remove.)
  }
  for (const [key, priorEl] of priorByKey) {
    if (!currentByKey.has(key)) changes.push(removalChange(priorEl));
  }

  return changes.sort((a, b) => codeUnitCompare(a.elementKey, b.elementKey));
}

// ─────────────────────── the owner-sign-off application ─────────────────────

/**
 * The rule ids no STANDARDS WAIVER may ever sign off on — the always-blocking
 * floor. A sign-off authorizing the removal of an always-blocking rule, or a
 * weakening of a gate that emits one, is FORBIDDEN (void). This is the
 * "you cannot weaken-in a lie" floor, the meta-analogue of {@link ALWAYS_BLOCKING_RULES}.
 *
 * A weakening's `weakening` class of `always-blocking-removed` can NEVER be signed.
 * (The set is kept open so the host can compose the live `ALWAYS_BLOCKING_RULES` ids
 * onto it for the gate-level check.)
 */
export const NEVER_SIGNABLE_WEAKENINGS: readonly WeakeningClass[] = [
  'always-blocking-removed',
  // A skip-allowlist add relaxes the always-blocking no-skipped-test floor for one more
  // file — the meta-analogue of "you cannot waive a lie". It is permitted only by an
  // INTENTIONAL snapshot regeneration (the visible, reviewed record), never by a sign-off.
  'skip-allowlist-added',
];

/** True iff the standards waiver's expiry is strictly before `now` (day granularity). */
function signoffExpired(expiry: string, now: Date): boolean {
  return new Date(expiry).getTime() < now.getTime();
}

/**
 * Partition the classified changes against the committed owner sign-offs as of
 * `now` (the INJECTED wall-clock date — the two-clock law, never `Date.now()`), and
 * the live always-blocking rule ids (so a weakening of a gate emitting one is
 * forbidden from being signed). Pure + deterministic.
 *
 * A WEAKEN is:
 *  - FORBIDDEN if its class is in {@link NEVER_SIGNABLE_WEAKENINGS} OR its element's
 *    ruleId is an always-blocking rule → it stays unsigned (blocking) AND a forbidden
 *    sign-off finding is emitted if a sign-off tried to cover it.
 *  - SIGNED if a non-expired sign-off matches its `elementKey` AND its `weakening`
 *    class → allowed + recorded.
 *  - EXPIRED if the only matching sign-off is past `now` → unsigned (blocking) +
 *    an expired-sign-off finding.
 *  - else UNSIGNED → blocking.
 *
 * A STRENGTHEN/NEUTRAL is un-regenerated drift (a stale-but-safe snapshot).
 */
export function applyStandardsWaivers(
  changes: readonly StandardsChange[],
  signoffs: readonly StandardsWaiver[],
  now: Date,
  alwaysBlockingRuleIds: ReadonlySet<string>,
): Omit<StandardsIntegrityFacts, 'committedAddress' | 'liveAddress'> {
  const unsignedWeakenings: StandardsChange[] = [];
  const signedWeakenings: (StandardsChange & { owner: string; justification: string })[] = [];
  const unregeneratedStrengthens: StandardsChange[] = [];
  const forbiddenSignoffs: { elementKey: string; owner: string; detail: string }[] = [];
  const expiredSignoffs: { elementKey: string; owner: string; expiry: string }[] = [];

  // Index sign-offs by (elementKey, weakening class) for an exact match.
  const signoffByKey = new Map<string, StandardsWaiver>();
  for (const s of signoffs) signoffByKey.set(`${s.elementKey}::${s.weakening}`, s);

  // A weakening's element ruleId is embedded in the key for gate/always-blocking;
  // for the forbidden check we re-parse the ruleId out of the detail-bearing key.
  const elementRuleIdForbidden = (change: StandardsChange): boolean => {
    if (change.weakening !== undefined && NEVER_SIGNABLE_WEAKENINGS.includes(change.weakening)) return true;
    // A gate weakening whose ruleId is an always-blocking rule can never be signed.
    // The key shape is `gate::<set>::<ruleId>`; pull the ruleId tail.
    if (change.elementKey.startsWith('gate::')) {
      const parts = change.elementKey.split('::');
      const ruleId = parts.slice(2).join('::');
      if (alwaysBlockingRuleIds.has(ruleId)) return true;
    }
    return false;
  };

  for (const change of changes) {
    if (change.changeClass !== 'weaken') {
      unregeneratedStrengthens.push(change);
      continue;
    }
    const matchKey = `${change.elementKey}::${change.weakening ?? ''}`;
    const signoff = signoffByKey.get(matchKey);

    if (elementRuleIdForbidden(change)) {
      // The weakening can NEVER be signed. It stays blocking. If someone TRIED to
      // sign it, that sign-off is void → a forbidden finding.
      unsignedWeakenings.push(change);
      if (signoff !== undefined) {
        forbiddenSignoffs.push({
          elementKey: change.elementKey,
          owner: signoff.owner,
          detail: `sign-off by ${signoff.owner} tried to authorize "${change.weakening}" on ${change.elementKey}, which is an ALWAYS-BLOCKING weakening (the placeholder/skip floor) — VOID. ${change.detail}`,
        });
      }
      continue;
    }

    if (signoff === undefined) {
      unsignedWeakenings.push(change);
      continue;
    }
    if (signoffExpired(signoff.expiry, now)) {
      unsignedWeakenings.push(change);
      expiredSignoffs.push({ elementKey: change.elementKey, owner: signoff.owner, expiry: signoff.expiry });
      continue;
    }
    signedWeakenings.push({ ...change, owner: signoff.owner, justification: signoff.justification });
  }

  return { unsignedWeakenings, signedWeakenings, unregeneratedStrengthens, forbiddenSignoffs, expiredSignoffs };
}
