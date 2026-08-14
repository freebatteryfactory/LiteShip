/**
 * Compile-time laws for `system/04_bootstrap`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { DisposalReceipt } from '../../00_core/05_lifecycle/types.js';
import type { CliDisposition } from '../../02_wires/cli/types.js';
import type { Assert, CaseOf, Equal, IsExactlyTrue, TagOf } from '../../types.js';
import type { WorkspaceReference } from '../00_workspace/types.js';
import type {
  ReleaseProgram,
  SystemProgram,
  SystemProgramId,
  SystemProgramName,
  SystemProgramReference,
} from '../03_programs/types.js';
import type { BootstrapCapabilities, BootstrapReceipt, DispatchOutcome, InvocationEnvelope, ProgramRegistry } from './types.js';

// ---------------------------------------------------------------------------
// Laws
// ---------------------------------------------------------------------------

/**
 * Compile-time law: the registry is total over the roster, and exact per entry.
 *
 * Line one pins the key set against the name union, so a missing program has no
 * home and an extra one has no key. Lines two and three are the exactness that
 * makes it worth having: a registry entry is the program of *that* name with
 * *that* contract, so mapping `release` to another program is refused and so
 * is mapping it to a placeholder that merely carries the right name.
 *
 * Line three is the one that changed. `Equal<registry['release'],
 * SystemProgram<'release'>>` used to be `true`, and that was the defect: the
 * broad placeholder and the registry entry were the same type, so a bootstrap
 * held something accepting `unknown` while `ReleaseSignature` described the
 * real contract one home away. It is now `false`, and the entry is
 * `ReleaseProgram`.
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
        Equal<ProgramRegistry['release'], ReleaseProgram>,
        Equal<ProgramRegistry['release'], SystemProgram<'release'>>,
        SystemProgram<'ship'> extends ProgramRegistry['release'] ? true : false,
        SystemProgram extends ProgramRegistry['release'] ? true : false,
      ],
      [true, true, false, false, false]
    >
  >
>;


/**
 * Compile-time law: every dispatch releases what it acquired.
 *
 * Checked on both arms by name, because this is the member a later edit removes
 * from the arm that "cannot really leak anything". It can: the entry point
 * bound its capabilities before it knew whether the run could start.
 *
 * The subject is the capability row, not the workspace. Lines one and two pin
 * that, and line three refuses the workspace outright — a receipt naming what
 * the run was *about* rather than what it *held* is a disposal claim about the
 * wrong noun, and the handles it does not name are the ones that leak.
 *
 * Line four is the anti-vacuity partner — the population is two, so an arm
 * added beside these without a receipt fails here rather than passing unnoticed.
 */
export type EveryDispatchReleasesWhatItAcquired = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<DispatchOutcome, 'dispatched'>['released'],
          DisposalReceipt<BootstrapCapabilities>
        >,
        Equal<
          CaseOf<DispatchOutcome, 'unavailable'>['released'],
          DisposalReceipt<BootstrapCapabilities>
        >,
        Equal<
          CaseOf<DispatchOutcome, 'dispatched'>['released'],
          DisposalReceipt<WorkspaceReference>
        >,
        Equal<TagOf<DispatchOutcome>, 'dispatched' | 'unavailable'>,
      ],
      [true, true, false, true]
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
 *
 * It does carry a decoded `input`, and the distinction is the whole point:
 * parsing is the wire's and its *product* has to arrive somewhere. Line four
 * pins that the input exists, so a later edit that removes it — restoring the
 * shape where no dispatch could actually invoke anything — fails here.
 *
 * Line six pins the disposition is the wire's whole type at the program's own
 * operation identity, which is what relates the reported operation to the
 * envelope's program instead of leaving them two free parameters.
 */
export type BootstrapParsesNothingAndDecidesNoExit = Assert<
  IsExactlyTrue<
    Equal<
      [
        'argv' extends keyof InvocationEnvelope ? true : false,
        'flags' extends keyof InvocationEnvelope ? true : false,
        'command' extends keyof InvocationEnvelope ? true : false,
        'input' extends keyof InvocationEnvelope ? true : false,
        'exit' extends keyof CaseOf<DispatchOutcome, 'dispatched'> ? true : false,
        Equal<
          CaseOf<DispatchOutcome<'release'>, 'dispatched'>['disposition'],
          CliDisposition<unknown, readonly Diagnostic[], SystemProgramId<'release'>>
        >,
      ],
      [false, false, false, true, false, true]
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


/**
 * Compile-time law: a receipt reports on the program its envelope names.
 *
 * The envelope took a `Name` and the outcome took a free `Op extends
 * OperationId`, with nothing relating them, so a receipt could pair an envelope
 * for `release` with a disposition reporting on `ship` and be perfectly
 * well-typed. Both halves were individually exact, which is what made it
 * invisible — the exactness was real and it was about two different things.
 *
 * A program's operation identity is computed from its name, so the relation was
 * always available and simply not taken. Line one takes it. Line two is what
 * makes the law a measurement: the same disposition read against a *different*
 * program's identity is refused, so this distinguishes rather than observing
 * that some identity arrived. Line four is the anti-vacuity partner.
 */
export type AReceiptReportsOnTheProgramItNames = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          CaseOf<BootstrapReceipt<'release'>['outcome'], 'dispatched'>['disposition'],
          CliDisposition<unknown, readonly Diagnostic[], SystemProgramId<'release'>>
        >,
        Equal<
          CaseOf<BootstrapReceipt<'release'>['outcome'], 'dispatched'>['disposition'],
          CliDisposition<unknown, readonly Diagnostic[], SystemProgramId<'ship'>>
        >,
        Equal<BootstrapReceipt<'release'>['envelope']['program'], SystemProgramReference<'release'>>,
        [BootstrapReceipt<'release'>] extends [never] ? true : false,
      ],
      [true, false, true, false]
    >
  >
>;
