/**
 * The gate — a fitness function over the repo, and the unit of extensibility.
 *
 * A gate is `(context) => Finding[]`: it folds over what it is given and emits
 * {@link Finding}s. A consumer registers their own gate the same way LiteShip
 * registers its built-ins — no fork, no rebuild. That is the whole plugin API.
 *
 * The authority ratchet is encoded in the TYPE: a {@link Gate} cannot be
 * constructed without {@link GateFixtures} (a red that must fail it, a green
 * that must pass, a mutation its own fixtures must kill). A gate that has not
 * self-proven against those fixtures can only ever be `advisory` — it earns
 * blocking authority, it is not granted it. (See `authority.ts`.)
 *
 * @module
 */

import { ValidationError, HostCapabilityError } from '@czap/error';
import type { AssuranceLevel } from './assurance.js';
import type { Finding } from './finding.js';
import type { FileId, RepoIR } from './repo-ir.js';
import type { SupplyChainFacts } from './supply-chain-facts.js';
import type { MutationFacts } from './mutation-facts.js';
import type { SimulationFacts } from './simulation-facts.js';

/**
 * What a gate runs against. Slice A keeps it minimal + extensible; Slice B
 * widens it with the triangulated repo-IR (LanguageService + AST + module graph
 * + receipts + schema). A gate reads ONLY through this context, so the same gate
 * runs against the real repo and against an in-memory fixture unchanged.
 */
export interface GateContext {
  /** Absolute root the gate's paths resolve against. */
  readonly repoRoot: string;
  /** Read a repo-relative file's text, or `undefined` if absent. */
  readFile(relativePath: string): string | undefined;
  /** Repo-relative paths the gate may consider (already filtered to its scope). */
  files(): readonly string[];
  /**
   * The triangulated repo-IR — an INJECTED capability (Slice B). OPTIONAL by
   * design: `@czap/gauntlet` is the lean engine and the IR is built+injected by
   * a host (the CLI, via `@czap/audit`'s `ts.Program`), so the gauntlet never
   * carries the heavy `typescript` dep. An existing regex gate ignores it
   * entirely; a new IR-fold gate that REQUIRES it must guard `ir === undefined`
   * (or use {@link requireIR}, which throws a clear tagged error when no IR was
   * injected). In-memory fixtures and the filesystem context leave it `undefined`
   * until a host supplies one. See {@link RepoIR}.
   */
  readonly ir?: RepoIR;
  /**
   * Pre-computed supply-chain evidence — an INJECTED capability (Slice C, the
   * avionics tier), the same lean-engine pattern as {@link ir}. OPTIONAL: the
   * heavy lockfile parse / SBOM build / ShipCapsule decode / CI scan all live in
   * a HOST (the CLI's `@czap/cli` supply-chain analyzer), which folds them into
   * flat {@link SupplyChainFacts} and lands them here. The
   * {@link supplyChainGate} reads ONLY through this; in-memory fixtures supply a
   * literal facts record (no I/O, no YAML). When ABSENT the supply-chain gate
   * reports an honest advisory "not-evidenced" finding rather than a silent
   * green. See {@link SupplyChainFacts}.
   */
  readonly supplyChain?: SupplyChainFacts;
  /**
   * Pre-computed mutation evidence — an INJECTED capability (Slice C, the avionics
   * tier — mutation-as-divergence), the same lean-engine pattern as {@link ir} and
   * {@link supplyChain}. OPTIONAL: the heavy AST mutation + the per-mutant vitest
   * runs all live in a HOST (`@czap/audit`'s mutation engine + the CLI's vitest
   * runner), which folds them into flat {@link MutationFacts} (every mutant's
   * kill/survive verdict + the committed score baseline) and lands them here. The
   * {@link mutationDivergenceGate} reads ONLY through this; in-memory fixtures
   * supply a literal facts record (no parse, no test run). When ABSENT the gate is
   * simply not in the set (mutation is opt-in: `czap check --ir --mutate`), so
   * there is no per-mutant cost and no noise on a default run. See
   * {@link MutationFacts}.
   */
  readonly mutation?: MutationFacts;
  /**
   * Pre-computed DETERMINISTIC-SIMULATION (DST) evidence — an INJECTED capability
   * (Slice C, the avionics tier), the same lean-engine pattern as {@link ir},
   * {@link supplyChain}, and {@link mutation}. OPTIONAL: the heavy work (minting a
   * seeded world, running the scenario corpus, replaying each seed twice, and
   * content-addressing the byte-exact traces) all lives in a HOST (the CLI's
   * `czap check --ir --simulate` path, driving the `@czap/core/simulation`
   * harness), which folds the verdicts into flat {@link SimulationFacts} (every
   * scenario's two replay digests + any divergence) and lands them here. The
   * {@link simulationDeterminismGate} reads ONLY through this; in-memory fixtures
   * supply a literal facts record (no world, no replay). When ABSENT the gate
   * reports an honest advisory "not-evidenced" finding rather than a silent green.
   * A replay-divergence fact carries its SEED, so the bug it folds replays
   * byte-for-byte. See {@link SimulationFacts}.
   */
  readonly simulation?: SimulationFacts;
}

/**
 * A named known-input for self-proof. `context` is the world the gate runs in;
 * the harness asserts the gate's findings against the fixture's role.
 */
export interface GateFixture {
  readonly name: string;
  readonly context: GateContext;
}

/**
 * The three fixtures every gate ships — the authority ratchet's evidence.
 * - `red`: a known-BAD world the gate MUST flag (≥1 finding). No red → no
 *   blocking authority (a gate that cannot demonstrate catching its target is
 *   advisory forever).
 * - `green`: a known-GOOD world the gate MUST pass clean (0 findings) — pins
 *   the false-positive floor.
 * - `mutation`: an operator that mutates the gate's OWN logic; the harness
 *   asserts the mutated gate then FAILS red-or-green — proving the fixtures
 *   actually constrain the logic (tests with teeth, not theatre).
 */
export interface GateFixtures {
  readonly red: GateFixture;
  readonly green: GateFixture;
  readonly mutation: GateMutation;
}

/** A mutation of a gate's own logic + the reason it should be caught. */
export interface GateMutation {
  readonly describe: string;
  /** Return a gate whose `run` is a plausible-but-wrong variant of the original. */
  readonly mutate: (gate: Gate) => Gate;
}

/** A gate — the registered fitness function. */
export interface Gate {
  /** Stable id; namespaces every {@link Finding} it emits (traceability). */
  readonly id: string;
  /** The assurance level this gate operates at — aims its rigor. */
  readonly level: AssuranceLevel;
  /** One-line human description of what it checks. */
  readonly describe: string;
  /** The fold: produce findings for `context`. Pure w.r.t. the context. */
  readonly run: (context: GateContext) => readonly Finding[];
  /**
   * OPTIONAL coverage declaration (Slice B, B2 — the content-addressed cache).
   * Returns the {@link FileId}s whose CONTENT this gate's verdict depends on, so
   * the verdict cache can content-key the gate against exactly those files.
   *
   * SOUNDNESS RAIL: when ABSENT, the cache conservatively assumes the gate covers
   * ALL files in the IR (the safe floor — any repo byte change invalidates the
   * cached verdict). Declaring `coverage` is an OPT-IN narrowing that is sound ONLY
   * when the gate GENUINELY reads only the returned files: an INACCURATE
   * (too-narrow) coverage is a SOUNDNESS BUG — it would serve a stale cached
   * verdict when an uncovered dependency changed. Narrow only when the gate folds
   * over a provably-closed subset (e.g. only files carrying a given fact). The
   * default-to-all floor never has that hazard; prefer it unless the narrowing is
   * demonstrably exact.
   *
   * Pure: derives the FileId set from the IR alone (no I/O, no clock). Only
   * consulted on the cache path; a run with no cache never calls it.
   */
  readonly coverage?: (ir: RepoIR) => readonly FileId[];
  /** The self-proof evidence — required, by construction. */
  readonly fixtures: GateFixtures;
}

/**
 * Define a gate — the one constructor. Validates the spec eagerly (a gate with
 * an empty id, or missing any of red/green/mutation, is a malformed plugin and
 * throws {@link ValidationError} at registration, not at run time).
 */
export function defineGate(spec: Gate): Gate {
  if (spec.id.trim() === '') {
    throw ValidationError('defineGate', 'gate id must be a non-empty string');
  }
  if (typeof spec.run !== 'function') {
    throw ValidationError('defineGate', `gate "${spec.id}" must supply a run function`);
  }
  const f = spec.fixtures;
  if (f === undefined || f.red === undefined || f.green === undefined || f.mutation === undefined) {
    throw ValidationError(
      'defineGate',
      `gate "${spec.id}" must ship red + green + mutation fixtures (the authority ratchet) — no fixtures, no blocking authority`,
    );
  }
  if (typeof f.mutation.mutate !== 'function') {
    throw ValidationError('defineGate', `gate "${spec.id}" mutation fixture must supply a mutate(gate) operator`);
  }
  return spec;
}

/**
 * Read the injected {@link RepoIR} from a context, or throw a clear tagged
 * {@link HostCapabilityError} when none was injected — the guard an IR-fold gate
 * uses so the lean engine's optional `ir` fails LOUD (never silently no-ops a
 * gate whose whole job is the IR). `gateId` is woven into the error for
 * traceability.
 */
export function requireIR(context: GateContext, gateId: string): RepoIR {
  if (context.ir === undefined) {
    throw HostCapabilityError(
      'repo-IR',
      `gate "${gateId}" requires the injected repo-IR, but none was supplied on the GateContext — a host (the CLI) must build it via @czap/audit's ts.Program and inject it as context.ir`,
    );
  }
  return context.ir;
}

/**
 * Read the injected {@link MutationFacts} from a context, or throw a clear tagged
 * {@link HostCapabilityError} when none was injected — the guard the
 * {@link mutationDivergenceGate} uses so the lean engine's optional `mutation`
 * fails LOUD (never silently no-ops a gate whose whole job is the mutation facts).
 * `gateId` is woven into the error for traceability. The same shape as
 * {@link requireIR}.
 */
export function requireMutation(context: GateContext, gateId: string): MutationFacts {
  if (context.mutation === undefined) {
    throw HostCapabilityError(
      'mutation-facts',
      `gate "${gateId}" requires the injected mutation facts, but none were supplied on the GateContext — a host (the CLI) must generate mutants via @czap/audit's mutation engine, run the covering tests, and inject the decided MutationFacts as context.mutation (the opt-in \`czap check --ir --mutate\` path)`,
    );
  }
  return context.mutation;
}
