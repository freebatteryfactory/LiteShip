/**
 * Compile-time laws for the root type ABI.
 *
 * `types.d.ts` is the declaration-only shape calculus. It cannot host its own
 * fixtures without those fixtures becoming part of the addressed public type
 * surface, so the root's proof obligations live here instead.
 *
 * Every law below is a positive or negative fixture for one numbered obligation
 * in the root `README.md`. A law that cannot fail is not a law: each obligation
 * pairs a conforming case with a non-conforming case that must resolve to
 * `never` or `false`.
 *
 * Two fixture hazards are load-bearing here and are called out at their sites:
 *
 * 1. An operand pair that TypeScript reduces to `never` on its own proves
 *    nothing about the guard under test.
 * 2. A guard proven only at the helper that defines it says nothing about the
 *    operators that claim to apply it. Each consumer needs its own red fixture.
 *
 * This module declares no runtime values and emits no JavaScript. It is not the
 * root declaration entry and does not participate in the root Type ABI surface.
 *
 * @module
 */

import type {
  Algebra,
  AnyHole,
  Assert,
  Binding,
  BindingsFor,
  CaseOf,
  Causal,
  Compose,
  ComposeSignatures,
  ContextFromBindings,
  ContextOf,
  Envelope,
  Equal,
  Executor,
  ErrOf,
  Extend,
  FailureOf,
  Handlers,
  Hole,
  IncompatibleRequirementKeys,
  InputOf,
  IsNever,
  MergeRequirements,
  MissingRequirementKeys,
  OkOf,
  OutputOf,
  PartialHandlers,
  Port,
  Predecessors,
  RebindPort,
  Refine,
  RefinePort,
  RequiredKeys,
  RequirementRow,
  RequirementsFromBindings,
  RequirementsOf,
  RequirementsSatisfied,
  Result,
  SatisfiedContext,
  Signature,
  SignaturesConnect,
  Tagged,
  UniqueRequirements,
  WithoutOrdinalPrefix,
} from './types.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

type Colour = Algebra<{
  red: { readonly hue: 0 };
  green: { readonly hue: 120 };
}>;

type HoleA = Hole<'a', string>;
type HoleB = Hole<'b', number>;
/** Same name as `HoleA`, incompatible contract. */
type HoleAConflicting = Hole<'a', boolean>;

/**
 * A duplicate hole name carrying an identical contract. This isolates the
 * duplicate-name defect from the contract-conflict defect: an operator that has
 * lost its uniqueness guard still merges this row successfully, so only a real
 * guard makes the surrounding laws resolve to `never`.
 */
type RepeatedRow = readonly [HoleA, HoleA];

/**
 * The encoded side is deliberately unrelated to either admitted type. A port
 * whose encoded form equals its narrowed admitted type cannot detect a
 * `RefinePort` that overwrites the encoding instead of preserving it.
 */
interface LabelledPort extends Port<string | number, Uint8Array> {
  readonly label: 'demo';
}

type Produce = Signature<string, number, 'produce-failed', readonly [HoleA]>;
/**
 * `Consume`'s input is deliberately **wider** than `Produce`'s output.
 *
 * It used to accept exactly `number`, which is what `Produce` emits. That made
 * the connection symmetric, and a symmetric fixture cannot test a directional
 * operator: `[OutputOf<Left>] extends [InputOf<Right>]` and its reverse both
 * answered `true`, so reversing `SignaturesConnect` survived the whole law
 * suite. `Disconnected` did not help either — its input is unrelated, so both
 * directions answered `false` there too.
 *
 * With `number | string` accepted here, the forward reading holds and the
 * reverse does not, which is what makes the connection laws below discriminate.
 * A pipeline is connected when the producer's output *fits into* the consumer's
 * input, not when the two are equal.
 */
type Consume = Signature<number | string, boolean, 'consume-failed', readonly [HoleB]>;
/** Input does not accept `Produce`'s output, so the pipeline is disconnected. */
type Disconnected = Signature<boolean, boolean, 'unrelated', readonly []>;

// ---------------------------------------------------------------------------
// Obligation 4 — tagged algebras discriminate, reject reserved tags, and derive
// exhaustive handler tables
// ---------------------------------------------------------------------------

export type TaggedCarriesItsDiscriminant = Assert<
  Equal<CaseOf<Colour, 'red'>, { readonly _tag: 'red'; readonly hue: 0 }>
>;

export type TaggedRejectsReservedTagCollision = Assert<
  IsNever<Tagged<'red', { readonly _tag: string }>>
>;

export type HandlersCoverEveryCase = Assert<Equal<keyof Handlers<Colour, string>, 'red' | 'green'>>;

/**
 * `keyof` is blind to the optional modifier, so key coverage alone cannot prove
 * exhaustiveness. These two laws test the modifier and the assignability
 * consequence directly.
 */
export type HandlersRequireEveryCase = Assert<
  Equal<RequiredKeys<Handlers<Colour, string>>, 'red' | 'green'>
>;

export type HandlersRejectAnIncompleteTable = Assert<
  Equal<
    { readonly red: (value: CaseOf<Colour, 'red'>) => string } extends Handlers<Colour, string>
      ? true
      : false,
    false
  >
>;

export type PartialHandlersAcceptAnIncompleteTable = Assert<
  Equal<{ readonly red: (value: CaseOf<Colour, 'red'>) => string } extends PartialHandlers<Colour, string> ? true : false, true>
>;

// ---------------------------------------------------------------------------
// Obligation 5 — Result arms narrow to their exact payloads
// ---------------------------------------------------------------------------

export type ResultProjectsItsSuccessPayload = Assert<Equal<OkOf<Result<string, Error>>, string>>;

export type ResultProjectsItsFailurePayload = Assert<Equal<ErrOf<Result<string, Error>>, Error>>;

export type ResultArmsDoNotLeakIntoEachOther = Assert<
  Equal<OkOf<Result<string, Error>> extends Error ? true : false, false>
>;

// ---------------------------------------------------------------------------
// Obligation 6 — RefinePort narrows and preserves encoding; RebindPort is the
// explicit path for a true transform
// ---------------------------------------------------------------------------

export type RefinePortNarrowsTheAdmittedType = Assert<
  Equal<RefinePort<LabelledPort, string>['Type'], string>
>;

export type RefinePortPreservesTheEncodedForm = Assert<
  Equal<RefinePort<LabelledPort, string>['Encoded'], Uint8Array>
>;

export type RefinePortPreservesOwnerFields = Assert<
  Equal<RefinePort<LabelledPort, string>['label'], 'demo'>
>;

export type RebindPortReplacesBothSides = Assert<
  Equal<RebindPort<LabelledPort, boolean, string>['Type'], boolean> extends true
    ? Equal<RebindPort<LabelledPort, boolean, string>['Encoded'], string>
    : false
>;

// ---------------------------------------------------------------------------
// Obligation 7 — Extend and Compose reject shadowing; Refine rejects foreign
// keys, widening, and presence-law weakening while preserving modifiers
// ---------------------------------------------------------------------------

export type ExtendComposesDisjointShapes = Assert<
  Equal<Extend<{ readonly a: 1 }, { readonly b: 2 }>, { readonly a: 1; readonly b: 2 }>
>;

/**
 * The shared-key fixtures below deliberately avoid disjoint unit types. An
 * intersection such as `{ a: 1 } & { a: 2 }` collapses to `never` through
 * TypeScript's own discriminant reduction, which would make the law pass even
 * with the guard removed. These shapes stay inhabited unless `Extend` rejects
 * them.
 */
export type ExtendRejectsAKeySharedWithTheSameType = Assert<
  IsNever<Extend<{ readonly a: string }, { readonly a: string }>>
>;

export type ExtendRejectsAKeySharedWithADifferentType = Assert<
  IsNever<Extend<{ readonly a: { readonly x: 1 } }, { readonly a: { readonly y: 2 } }>>
>;

export type ComposeAcceptsADisjointLayerRow = Assert<
  Equal<
    Compose<[{ readonly a: 1 }, { readonly b: 2 }, { readonly c: 3 }]>,
    { readonly a: 1; readonly b: 2; readonly c: 3 }
  >
>;

export type ComposeRejectsACollisionAtAnyDepth = Assert<
  IsNever<Compose<[{ readonly a: string }, { readonly b: number }, { readonly a: string }]>>
>;

export type RefineNarrowsAnOwnedMember = Assert<
  Equal<Refine<{ readonly a: string | number }, { a: string }>, { readonly a: string }>
>;

export type RefineRejectsAForeignKey = Assert<IsNever<Refine<{ readonly a: string }, { b: string }>>>;

export type RefineRejectsWidening = Assert<
  IsNever<Refine<{ readonly a: string }, { a: string | number }>>
>;

/**
 * A refinement must actually refine.
 *
 * Both fixtures were measured **accepted** before the operator was corrected.
 * The first is a change identical to what it replaces. The second is subtler
 * and is the reason this law exists: a caller asking to make a required member
 * optional, where the upstream value already admits `undefined` so the widening
 * arm sees nothing wrong. It was accepted, and the result still had `a`
 * required — the caller was told yes and given nothing.
 *
 * This replaces `RefineRejectsPresenceLawWeakening`, which was deleted rather
 * than repaired. That law asserted `IsNever<Refine<{readonly a: string}, {a?:
 * string}>>` and passed — but not for the reason its name gave. Under
 * `exactOptionalPropertyTypes`, `{a?: string}` indexes to `string | undefined`,
 * which is not assignable to `string`, so the *widening* arm rejected it. It
 * was `RefineRejectsWidening` with a different fixture and a misleading name,
 * and it is why `exactOptionalPropertyTypes` measured as load-bearing for
 * nothing in this repository.
 *
 * Presence itself was never at risk: `Refine`'s result maps homomorphically
 * over `keyof Upstream`, so modifiers come from the upstream authority by
 * construction. `RefinePreservesUpstreamModifiers` below is the law that proves
 * that, and it proves it positively — an optional upstream member stays
 * optional even when the change declares it required.
 */
export type RefineRejectsANoOpChange = Assert<IsNever<Refine<{ readonly a: string }, { a: string }>>>;

export type RefineRejectsAPresenceOnlyChangeThatCannotTakeEffect = Assert<
  IsNever<Refine<{ readonly a: string | undefined }, { a?: string }>>
>;

export type RefinePreservesUpstreamModifiers = Assert<
  Equal<Refine<{ readonly a?: string | number }, { a: string }>, { readonly a?: string }>
>;

// ---------------------------------------------------------------------------
// Obligation 8 — requirement rows are closed, ordered, and duplicate-free
// ---------------------------------------------------------------------------

export type RequirementRowsExcludeOpenArrays = Assert<
  Equal<readonly AnyHole[] extends RequirementRow ? true : false, false>
>;

export type RequirementRowsAdmitTheEmptyRow = Assert<
  Equal<readonly [] extends RequirementRow ? true : false, true>
>;

export type RequirementRowsPreserveDeclarationOrder = Assert<
  Equal<UniqueRequirements<readonly [HoleA, HoleB]>, readonly [HoleA, HoleB]>
>;

export type RequirementRowsRejectDuplicateNames = Assert<
  IsNever<UniqueRequirements<readonly [HoleA, HoleAConflicting]>>
>;

// ---------------------------------------------------------------------------
// Obligation 8b — every operator that promises duplicate rejection reaches the
// guard. Proving `UniqueRequirements` in isolation shows only that the check
// exists, not that its claimed consumers apply it.
// ---------------------------------------------------------------------------

export type ContextOfRejectsARepeatedRow = Assert<IsNever<ContextOf<RepeatedRow>>>;

export type BindingsForRejectsARepeatedRow = Assert<IsNever<BindingsFor<RepeatedRow>>>;

export type RequirementsSatisfiedRejectsARepeatedRow = Assert<
  Equal<RequirementsSatisfied<RepeatedRow, { readonly a: string }>, false>
>;

export type SignatureRejectsARepeatedRequirementRow = Assert<
  IsNever<Signature<string, number, 'failed', RepeatedRow>>
>;

export type MergeRejectsARepeatedLeftRow = Assert<
  IsNever<MergeRequirements<RepeatedRow, readonly [HoleB]>>
>;

export type MergeRejectsARepeatedRightRow = Assert<
  IsNever<MergeRequirements<readonly [HoleB], RepeatedRow>>
>;

// ---------------------------------------------------------------------------
// Obligation 9 — missing and incompatible capabilities stay separately visible
// ---------------------------------------------------------------------------

export type MissingCapabilitiesAreNamed = Assert<
  Equal<MissingRequirementKeys<readonly [HoleA, HoleB], { readonly a: string }>, 'b'>
>;

export type IncompatibleCapabilitiesAreNamedSeparately = Assert<
  Equal<
    IncompatibleRequirementKeys<readonly [HoleA, HoleB], { readonly a: boolean; readonly b: number }>,
    'a'
  >
>;

/**
 * A supplied capability narrower than the required contract is compatible.
 *
 * The law above cannot prove this. Its fixture supplies `boolean` where
 * `string` is required — mutually non-assignable, so the check answers the same
 * either way and reversing the operator survives it. Compatibility is
 * directional: the supplier must satisfy the requirement, not the reverse. A
 * host offering exactly `'literal'` where a `string` is asked for is lawful,
 * and a host offering `string` where `'literal'` is required is not.
 *
 * `HoleA` requires `string`; this context supplies `'literal'`, which is
 * strictly narrower. Forward, nothing is incompatible. Reversed, `'a'` would be
 * reported and this law turns red.
 */
export type ANarrowerSuppliedCapabilitySatisfiesAWiderRequirement = Assert<
  IsNever<IncompatibleRequirementKeys<readonly [HoleA], { readonly a: 'literal' }>>
>;

export type ASatisfiedContextIsAccepted = Assert<
  Equal<RequirementsSatisfied<readonly [HoleA, HoleB], { readonly a: string; readonly b: number }>, true>
>;

export type AnUnsatisfiedContextIsRejected = Assert<
  IsNever<SatisfiedContext<readonly [HoleA, HoleB], { readonly a: string }>>
>;

// ---------------------------------------------------------------------------
// Obligation 10 — closed binding tuples recover their row and derive one context
// ---------------------------------------------------------------------------

export type BindingsForDerivesOneBindingPerHole = Assert<
  Equal<BindingsFor<readonly [HoleA, HoleB]>, readonly [Binding<HoleA>, Binding<HoleB>]>
>;

export type BindingsRecoverTheirRequirementRow = Assert<
  Equal<RequirementsFromBindings<readonly [Binding<HoleA>, Binding<HoleB>]>, readonly [HoleA, HoleB]>
>;

export type BindingsAndRowsDeriveTheSameContext = Assert<
  Equal<
    ContextFromBindings<readonly [Binding<HoleA>, Binding<HoleB>]>,
    ContextOf<readonly [HoleA, HoleB]>
  >
>;

export type DuplicateBindingIdentitiesCollapse = Assert<
  IsNever<ContextFromBindings<readonly [Binding<HoleA>, Binding<HoleAConflicting>]>>
>;

// ---------------------------------------------------------------------------
// Obligation 11 — requirement merges dedupe, append, and reject conflicts
// ---------------------------------------------------------------------------

export type MergeAppendsNewHolesInOrder = Assert<
  Equal<MergeRequirements<readonly [HoleA], readonly [HoleB]>, readonly [HoleA, HoleB]>
>;

export type MergeDeduplicatesIdenticalHoles = Assert<
  Equal<MergeRequirements<readonly [HoleA], readonly [HoleA]>, readonly [HoleA]>
>;

export type MergeRejectsSameNameContractConflicts = Assert<
  IsNever<MergeRequirements<readonly [HoleA], readonly [HoleAConflicting]>>
>;

// ---------------------------------------------------------------------------
// Obligation 12 — signatures project their four dimensions
// ---------------------------------------------------------------------------

export type SignatureProjectsInput = Assert<Equal<InputOf<Produce>, string>>;
export type SignatureProjectsOutput = Assert<Equal<OutputOf<Produce>, number>>;
export type SignatureProjectsFailure = Assert<Equal<FailureOf<Produce>, 'produce-failed'>>;
export type SignatureProjectsRequirements = Assert<Equal<RequirementsOf<Produce>, readonly [HoleA]>>;

// ---------------------------------------------------------------------------
// Obligation 13 — composition rejects disconnected pipelines, unions failures,
// and merges requirements by identity rather than position
// ---------------------------------------------------------------------------

export type ConnectedSignaturesReportConnected = Assert<Equal<SignaturesConnect<Produce, Consume>, true>>;

export type DisconnectedSignaturesReportDisconnected = Assert<
  Equal<SignaturesConnect<Produce, Disconnected>, false>
>;

export type ComposingUnionsFailuresAndMergesRequirements = Assert<
  Equal<
    ComposeSignatures<Produce, Consume>,
    Signature<string, boolean, 'produce-failed' | 'consume-failed', readonly [HoleA, HoleB]>
  >
>;

/**
 * Executing a signature consumes its input and yields its result, with the
 * output in the success arm and the failure algebra in the failure arm.
 *
 * `SignatureResult` is `Result<OutputOf<V>, FailureOf<V>>`, and both arms of
 * `Result` carry one payload each, so swapping the arguments produces a
 * perfectly valid type that means the opposite. Nothing tested it — neither
 * `SignatureResult` nor `Executor` had a single consumer anywhere in the
 * repository.
 *
 * The claim is proved through `Executor` rather than by reading
 * `SignatureResult` directly, because that is where the relationship is
 * actually used: an executor takes the signature's input and returns its
 * result. `Produce` emits `number` and fails with `'produce-failed'`, two
 * unrelated types, so a swap turns this red rather than merely reordering
 * equals.
 */
export type ExecutingASignatureConsumesItsInputAndYieldsItsResult = Assert<
  Equal<
    [Parameters<Executor<Produce>>[0], Awaited<ReturnType<Executor<Produce>>>],
    [string, Result<number, 'produce-failed'>]
  >
>;

export type ComposingADisconnectedPipelineIsRejected = Assert<
  IsNever<ComposeSignatures<Produce, Disconnected>>
>;

// ---------------------------------------------------------------------------
// Ordinal-prefix parsing preserves complete Unicode code points and passes
// unnumbered names through unchanged
// ---------------------------------------------------------------------------

export type AnAstralCharacterSurvivesOrdinalPrefixRemoval = Assert<
  Equal<WithoutOrdinalPrefix<'07_🛸scene'>, '🛸scene'>
>;

export type AnAsciiOrdinalPrefixIsRemoved = Assert<
  Equal<WithoutOrdinalPrefix<'09_quantization'>, 'quantization'>
>;

export type AnUnnumberedNamePassesThrough = Assert<
  Equal<WithoutOrdinalPrefix<'editor'>, 'editor'>
>;

// ---------------------------------------------------------------------------
// Obligation 14 — one predecessor row covers genesis, linear, and merge
// ancestry; versioned envelopes reject reserved-key shadowing
// ---------------------------------------------------------------------------

type Ancestor = { readonly kind: 'revision'; readonly id: string };

/**
 * The three admission laws below are positive fixtures: every one of them still
 * holds if `Predecessors` widens to `unknown`. The exactness and rejection laws
 * are what actually pin the representation.
 */
export type PredecessorsIsAnOrderedRowOfReferences = Assert<
  Equal<Predecessors<Ancestor>, readonly Ancestor[]>
>;

export type PredecessorsRejectsANonRowShape = Assert<
  Equal<Ancestor extends Predecessors<Ancestor> ? true : false, false>
>;

export type GenesisIsARepresentablePredecessorRow = Assert<
  Equal<readonly [] extends Predecessors<Ancestor> ? true : false, true>
>;

export type LinearAncestryIsARepresentablePredecessorRow = Assert<
  Equal<readonly [Ancestor] extends Predecessors<Ancestor> ? true : false, true>
>;

export type MergeAncestryIsARepresentablePredecessorRow = Assert<
  Equal<readonly [Ancestor, Ancestor] extends Predecessors<Ancestor> ? true : false, true>
>;

export type CausalCarriesAnOrderedPredecessorRow = Assert<
  Equal<Causal<Ancestor>['previous'], readonly Ancestor[]>
>;

export type EnvelopeAcceptsANonShadowingBody = Assert<
  Equal<
    Envelope<'Sample', 1, { readonly payload: string }>,
    { readonly _tag: 'Sample'; readonly _version: 1; readonly payload: string }
  >
>;

export type EnvelopeRejectsTagShadowing = Assert<
  IsNever<Envelope<'Sample', 1, { readonly _tag: string }>>
>;

export type EnvelopeRejectsVersionShadowing = Assert<
  IsNever<Envelope<'Sample', 1, { readonly _version: number }>>
>;
