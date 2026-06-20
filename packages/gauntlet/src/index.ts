/**
 * `@czap/gauntlet` — the self-proving, extendable rigor engine.
 *
 * The foundations (Slice A): the {@link Finding} vocabulary humans and agents
 * share, {@link AssuranceLevel} (the hazard model that aims rigor), the
 * {@link Gate} plugin contract (a fitness function `(context) => Finding[]`),
 * and the authority ratchet (a gate earns blocking power by self-proving
 * against its own red/green/mutation fixtures — see {@link verifyGate}).
 *
 * Extend by composing: a downstream project `defineGate`s its own gate with its
 * own fixtures and hands it to {@link runGates} alongside LiteShip's built-ins —
 * no fork, no rebuild. The engine qualifies every gate, theirs and ours, by the
 * same ratchet.
 *
 * Slice B widens {@link GateContext} into the triangulated repo-IR; Slice C adds
 * the mutation/simulation/avionics gate families. The contracts here do not
 * change underneath them.
 *
 * @module
 */

export {
  type AssuranceLevel,
  type AssuranceSpec,
  ASSURANCE_LEVELS,
  ASSURANCE,
  rankOf,
  atLeast,
  maxLevel,
} from './assurance.js';

export {
  type Severity,
  type SourceLocation,
  type Remediation,
  type Finding,
  type FindingInput,
  SEVERITIES,
  finding,
  isFinding,
  fromError,
  isProjectableError,
  tallyBySeverity,
} from './finding.js';

export {
  type GateContext,
  type GateFixture,
  type GateFixtures,
  type GateMutation,
  type Gate,
  defineGate,
} from './gate.js';

export { type Authority, type GateProof, verifyGate, earnedAuthority } from './authority.js';

export { type GateOutcome, type GauntletResult, runGates, memoryContext } from './engine.js';

export { nodeContext } from './node-context.js';

export { type RunGauntletOnRepoOptions, runGauntletOnRepo } from './runner.js';

export { noBareThrowGate } from './gates/no-bare-throw.js';
export { noTsIgnoreGate } from './gates/no-ts-ignore.js';
export { noNondeterminismGate } from './gates/no-nondeterminism.js';
export { noSilentCatchGate } from './gates/no-silent-catch.js';
