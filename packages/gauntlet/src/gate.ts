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
import type { RepoIR } from './repo-ir.js';

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
