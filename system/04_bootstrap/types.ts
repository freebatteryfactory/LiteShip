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
  BindingsFor,
  NonEmptyTuple,
  RequirementRow,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { DisposalReceipt } from '../../00_core/05_lifecycle/types.js';
import type { CliDisposition } from '../../02_wires/cli/types.js';
import type { WireCaller } from '../../02_wires/types.js';
import type { WorkspaceReference } from '../00_workspace/types.js';
import type {
  SystemProgramDefinitions,
  SystemProgramEntry,
  SystemProgramId,
  SystemProgramName,
  SystemProgramReference,
} from '../03_programs/types.js';

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

type ProgramsByName<
  Entries extends readonly SystemProgramEntry<SystemProgramName, unknown>[],
> = {
  readonly [Entry in Entries[number] as Entry['name']]: Entry['Program'];
};

/**
 * Every program in the roster, reachable by name.
 *
 * A mapped type over the roster rather than a hand-written record, so the
 * registry and the population are one population. Registering ten of eleven does
 * not compile; registering a twelfth does not compile either, because there is
 * no key for it.
 *
 * Each entry is the program's *contract*, not a placeholder wearing its name.
 * It used to be `SystemProgram<Name>` — exact over the name and broad over
 * everything that matters, so the `release` entry a bootstrap actually holds
 * accepted `unknown` while an exact `ReleaseSignature` sat one home away
 * describing what release should consume. Two correct declarations about
 * different things.
 *
 * Deriving from the definition map means the entry for `release` *is*
 * `ReleaseProgram`, whose input is a qualified candidate. The guarantee stopped
 * being adjacent to the dispatch path and became the dispatch path.
 */
export type ProgramRegistry = ProgramsByName<SystemProgramDefinitions>;

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
 *
 * There *is* a decoded input, and its absence was not restraint. A bootstrap
 * cannot invoke an operation without the operation's input, so an envelope
 * carrying only a program reference described something no dispatch could
 * perform. Parsing belongs to the wire and its product has to arrive
 * somewhere; `Input` is that somewhere, and it is the selected program's input
 * rather than a free type, so an envelope for `release` cannot carry what
 * `audit` accepts.
 */
export interface InvocationEnvelope<
  Name extends SystemProgramName = SystemProgramName,
  Input = unknown,
> {
  readonly workspace: WorkspaceReference;
  readonly program: SystemProgramReference<Name>;
  readonly input: Input;
  readonly caller: WireCaller;
}

/**
 * How one dispatch ended, with what it released.
 *
 * Every arm carries a disposal receipt. That is the whole design: a dispatch
 * that could not start still acquired the capabilities the entry point bound,
 * and an entry point that releases them only on the success path is the defect
 * that shows up as a leaked handle three hours into a CI run.
 *
 * The receipt names the **capability row** that was acquired. It used to name
 * the workspace, which was a general receipt shape being available rather than
 * workspace disposal being meaningful: the workspace reference is what the run
 * is *about*, and the handles are what a bootstrap actually holds and must let
 * go of. A receipt claiming the workspace was released says nothing about the
 * filesystem and process handles that leak.
 *
 * Two arms, not three. `unregistered` used to sit here, on the reasoning that a
 * runtime lookup can be handed a name that failed to resolve. It cannot get
 * this far: an `InvocationEnvelope` carries a roster-typed program reference,
 * so a name that failed to resolve produces no envelope, and with no envelope
 * there is no dispatch and no receipt. The refusal is the CLI wire's `rejected`
 * arm with a `usage` exit, which is where an unknown command belongs. Keeping
 * an arm for it here was the boundary refusal leaking one layer downstream and
 * being answered twice.
 */
export type DispatchOutcome<
  Name extends SystemProgramName = SystemProgramName,
  Output = unknown,
  Failure = readonly Diagnostic[],
  Requirements extends RequirementRow = RequirementRow,
> = Algebra<{
  dispatched: {
    readonly disposition: CliDisposition<Output, Failure, SystemProgramId<Name>>;
    readonly released: DisposalReceipt<BootstrapCapabilities<Requirements>>;
  };
  unavailable: {
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
    readonly released: DisposalReceipt<BootstrapCapabilities<Requirements>>;
  };
}>;

/**
 * One complete run of the entry point.
 *
 * The envelope and the outcome together, so a receipt names what it was asked to
 * do as well as what happened. Nothing else: no timing, no log, no environment
 * capture. A bootstrap receipt that grew those would be a telemetry product, and
 * `00_core/18_inspection` owns explanation.
 *
 * One `Name`, threaded to both members. The outcome used to take a free
 * `Op extends OperationId` while the envelope took a `Name`, with nothing
 * relating them — so a receipt could pair an envelope for `release` with a
 * disposition reporting on `ship`. A program's operation identity is computed
 * from its name, which is precisely what makes the two relatable, and the
 * previous shape declined to relate them.
 */
export interface BootstrapReceipt<
  Name extends SystemProgramName = SystemProgramName,
  Input = unknown,
  Output = unknown,
  Failure = readonly Diagnostic[],
  Requirements extends RequirementRow = RequirementRow,
> {
  readonly envelope: InvocationEnvelope<Name, Input>;
  readonly outcome: DispatchOutcome<Name, Output, Failure, Requirements>;
}

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
