/**
 * Bootstrap: the contract the root executable satisfies.
 *
 * One file at the repository root is allowed to be an entry point, and this
 * home owns what it must be — not the file, which stays at the root, and not
 * the parsing, which is the CLI wire's. The contract is the part with no owner
 * upstream: what capabilities must exist before any program runs, that every
 * program is reachable, and that a dispatch releases what it acquired no matter
 * how it ended.
 *
 * Three facts.
 *
 * **The registry is total over the roster.** A mapped type over
 * `SystemProgramRoster`, so a program that exists and is not registered is a
 * compile error rather than a command that reports "unknown". This is the same
 * shape as the wire topology naming its children by surface, and it is here for
 * the same reason: a roster that cannot detect a gap is a list, and a list
 * drifts.
 *
 * **Capabilities are supplied once, at the edge, and bound rather than
 * assumed.** Every program declares its requirements in its operation
 * definition. Bootstrap is where those become an actual binding row through
 * root's own calculus, so a program cannot reach for a filesystem the entry
 * point never supplied.
 *
 * **Disposal is unconditional.** A dispatch that refused, a dispatch that ran
 * and failed, and a dispatch whose answer was lost all release what they
 * acquired. The receipt carries a `DisposalReceipt` on every arm, so "we forgot
 * to clean up on the error path" is not expressible — which is the single most
 * common defect in an entry point, and the one that only shows under load.
 *
 * What bootstrap does *not* own: argv grammar, exit codes, streams. Those are
 * `02_wires/cli`, and a bootstrap that parsed its own command language would be
 * a second wire wearing a smaller hat.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  BindingsFor,
  CaseOf,
  Equal,
  IsExactlyTrue,
  NonEmptyTuple,
  RequirementRow,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { DisposalReceipt } from '../../00_core/05_lifecycle/types.js';
import type { OperationId } from '../../00_core/07_operation/types.js';
import type { CliDisposition } from '../../02_wires/cli/types.js';
import type { WireCaller } from '../../02_wires/types.js';
import type { WorkspaceReference } from '../00_workspace/types.js';
import type {
  SystemProgram,
  SystemProgramName,
  SystemProgramReference,
  SystemProgramRoster,
} from '../03_programs/types.js';

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

type ProgramsByName<Names extends readonly SystemProgramName[]> = {
  readonly [Name in Names[number]]: SystemProgram<Name>;
};

/**
 * Every program in the roster, reachable by name.
 *
 * A mapped type over the roster rather than a hand-written record, so the
 * registry and the population are one population. Registering ten of eleven does
 * not compile; registering a twelfth does not compile either, because there is
 * no key for it.
 *
 * Each entry is exact over its own name — `SystemProgram<'release'>` and not
 * `SystemProgram` — so a registry that maps `release` to the `docs` program is
 * refused. That is the mistake a canary caught in the wire topology last week,
 * anticipated here rather than rediscovered.
 */
export type ProgramRegistry = ProgramsByName<SystemProgramRoster>;

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * What the entry point must supply before anything runs.
 *
 * A binding row over root's own calculus, not a bag of services. The row is a
 * parameter so a bootstrap for a narrow command can declare a smaller set than
 * a bootstrap for the whole population, and a law below pins that the free
 * binding row does not satisfy an exact one — the boundary defect `01_hosts`
 * states as a law and the reason a requirement row is a closed tuple.
 */
export type BootstrapCapabilities<Requirements extends RequirementRow = RequirementRow> =
  BindingsFor<Requirements>;

// ---------------------------------------------------------------------------
// Invocation
// ---------------------------------------------------------------------------

/**
 * What the entry point was asked to do.
 *
 * The program is named by reference rather than by string, so an envelope for a
 * program the roster does not contain cannot be constructed. The caller arm
 * rides along because a wire records who crossed it — and it confers nothing
 * here either, which is the point of carrying it where it can be seen doing
 * nothing.
 *
 * There is no `argv` member. Parsing is the CLI wire's, and an envelope holding
 * raw arguments would be a second place where a command language lives.
 */
export interface InvocationEnvelope<Name extends SystemProgramName = SystemProgramName> {
  readonly workspace: WorkspaceReference;
  readonly program: SystemProgramReference<Name>;
  readonly caller: WireCaller;
}

/**
 * How one dispatch ended, with what it released.
 *
 * Every arm carries a disposal receipt. That is the whole design: a dispatch
 * that never found its program still acquired the capabilities the entry point
 * bound, and an entry point that releases them only on the success path is the
 * defect that shows up as a leaked handle three hours into a CI run.
 *
 * `unregistered` exists because the registry is total over the roster but a
 * *runtime* lookup can still be handed a name that failed to resolve at the wire
 * — and a bootstrap that reported that as a program failure would blame the
 * program for the wire's refusal.
 */
export type DispatchOutcome<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> = Algebra<{
  dispatched: {
    readonly disposition: CliDisposition<Output, Failure, Op>;
    readonly released: DisposalReceipt<WorkspaceReference>;
  };
  unregistered: {
    readonly requested: string;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly released: DisposalReceipt<WorkspaceReference>;
  };
  unavailable: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly released: DisposalReceipt<WorkspaceReference>;
  };
}>;

/**
 * One complete run of the entry point.
 *
 * The envelope and the outcome together, so a receipt names what it was asked to
 * do as well as what happened. Nothing else: no timing, no log, no environment
 * capture. A bootstrap receipt that grew those would be a telemetry product, and
 * `00_core/18_inspection` owns explanation.
 */
export interface BootstrapReceipt<
  Name extends SystemProgramName = SystemProgramName,
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> {
  readonly envelope: InvocationEnvelope<Name>;
  readonly outcome: DispatchOutcome<Output, Failure, Op>;
}

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/**
 * Compile-time law: the registry is total over the roster, and exact per entry.
 *
 * Line one pins the key set against the name union, so a missing program has no
 * home and an extra one has no key. Lines two and three are the exactness that
 * makes it worth having: a registry entry is the program of *that* name, so
 * mapping `release` to another program is refused.
 *
 * Line three is the specific mistake a canary found in the wire topology — an
 * entry copy-pasted and edited in one of its two positions. It is checked here
 * before anyone has had the chance to make it.
 */
export type TheRegistryIsTotalOverTheRoster = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<keyof ProgramRegistry, SystemProgramName>,
        Equal<ProgramRegistry['release'], SystemProgram<'release'>>,
        SystemProgram<'docs'> extends ProgramRegistry['release'] ? true : false,
        SystemProgram extends ProgramRegistry['release'] ? true : false,
      ],
      [true, true, false, false]
    >
  >
>;

/**
 * Compile-time law: every dispatch releases what it acquired.
 *
 * Checked on all three arms by name, because this is the member a later edit
 * removes from the two arms that "cannot really leak anything". Both of them
 * can: the entry point bound its capabilities before it knew whether the program
 * existed.
 *
 * Line four is the anti-vacuity partner — the population is three, so an arm
 * added beside these without a receipt fails here rather than passing unnoticed.
 */
export type EveryDispatchReleasesWhatItAcquired = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CaseOf<DispatchOutcome, 'dispatched'>['released'], DisposalReceipt<WorkspaceReference>>,
        Equal<
          CaseOf<DispatchOutcome, 'unregistered'>['released'],
          DisposalReceipt<WorkspaceReference>
        >,
        Equal<CaseOf<DispatchOutcome, 'unavailable'>['released'], DisposalReceipt<WorkspaceReference>>,
        Equal<TagOf<DispatchOutcome>, 'dispatched' | 'unregistered' | 'unavailable'>,
      ],
      [true, true, true, true]
    >
  >
>;

/**
 * Compile-time law: bootstrap parses nothing and decides no exit.
 *
 * The envelope carries no argv, no flags, and no command string, because a
 * bootstrap holding raw arguments is a second place a command language lives.
 * The outcome carries the CLI wire's disposition whole rather than a summary of
 * it, so the exit arm a shell sees is the wire's decision and not a translation
 * of a translation.
 */
export type BootstrapParsesNothingAndDecidesNoExit = Assert<
  IsExactlyTrue<
    Equal<
      [
        'argv' extends keyof InvocationEnvelope ? true : false,
        'flags' extends keyof InvocationEnvelope ? true : false,
        'command' extends keyof InvocationEnvelope ? true : false,
        'exit' extends keyof CaseOf<DispatchOutcome, 'dispatched'> ? true : false,
        Equal<CaseOf<DispatchOutcome, 'dispatched'>['disposition'], CliDisposition>,
      ],
      [false, false, false, false, true]
    >
  >
>;

/**
 * Compile-time law: an envelope names a program the roster contains.
 *
 * The reference is exact, so an envelope for `release` is not one for `ship`,
 * and the broad form does not substitute for a named one. A `program: string`
 * would have made every one of these substitutable and moved the check to
 * runtime, which is where the previous arrangement kept it.
 */
export type AnEnvelopeNamesARosteredProgram = Assert<
  IsExactlyTrue<
    Equal<
      [
        InvocationEnvelope<'release'> extends InvocationEnvelope<'ship'> ? true : false,
        InvocationEnvelope extends InvocationEnvelope<'release'> ? true : false,
        InvocationEnvelope<'release'> extends InvocationEnvelope<'release'> ? true : false,
        Equal<InvocationEnvelope<'release'>['program'], SystemProgramReference<'release'>>,
      ],
      [false, false, true, true]
    >
  >
>;

// ---------------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------------

/** Type summary consumed by the root system topology. */
export interface BootstrapTypeSurface {
  readonly registry: ProgramRegistry;
  readonly capabilities: BootstrapCapabilities;
  readonly envelope: InvocationEnvelope;
  readonly outcome: DispatchOutcome;
  readonly receipt: BootstrapReceipt;
}
