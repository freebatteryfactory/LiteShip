// Root grammar: the Type ABI combinators in types.d.ts.
//
// Mutations carried verbatim from the ratified verification kit; only the
// plumbing changed. Each entry rewrites one exact span of the live tree and
// must die on a named law. An entry whose anchor text is absent reports
// MISSING and fails the bank -- a bank that has drifted off the source must
// never be mistaken for a bank that passed.

import { runBank } from '../harness.mjs';

const TD = 'types.d.ts';

const M = [
  ['Extend stops rejecting shadowed keys', TD,
    `export type Extend<Upstream extends object, Local extends object> = [SharedKeys<Upstream, Local>] extends [never]`,
    `export type Extend<Upstream extends object, Local extends object> = [never] extends [never]`],
  ['Refine stops validating changes', TD,
    `export type Refine<Upstream extends object, Changes extends object> = [\n  InvalidRefinementKeys<Upstream, Changes>,\n] extends [never]`,
    `export type Refine<Upstream extends object, Changes extends object> = [\n  never,\n] extends [never]`],
  ['Refine becomes non-homomorphic (drops upstream modifiers)', TD,
    `  ? Simplify<{\n      [Key in keyof Upstream]: Key extends keyof Changes ? Changes[Key] : Upstream[Key];\n    }>`,
    `  ? Simplify<Omit<Upstream, keyof Changes> & Changes>`],
  ['Compose stops rejecting collisions', TD,
    `  ? [Extend<Accumulator, Head>] extends [never]\n    ? never\n    : ComposeLayers<Tail, Extend<Accumulator, Head> & object>`,
    `  ? ComposeLayers<Tail, Simplify<Accumulator & Head> & object>`],
  ['MergeRequirements stops rejecting contract conflicts', TD,
    `      ? Equal<HoleContract<Existing>, HoleContract<Value>> extends true\n        ? Accumulator\n        : never`,
    `      ? [unknown] extends [unknown]\n        ? Accumulator\n        : never`],
  ['MergeRequirements stops deduplicating equal holes', TD,
    `> = RequirementForKey<Accumulator, HoleKey<Value>> extends infer Existing\n  ? [Existing] extends [never]\n    ? readonly [...Accumulator, Value]`,
    `> = RequirementForKey<Accumulator, HoleKey<Value>> extends infer Existing\n  ? [unknown] extends [unknown]\n    ? readonly [...Accumulator, Value]`],
  ['ComposeSignatures stops checking connection', TD,
    `> = SignaturesConnect<Left, Right> extends true\n  ? ComposeConnectedSignatures<`,
    `> = [unknown] extends [unknown]\n  ? ComposeConnectedSignatures<`],
  ['ComposeSignatures drops the right-hand failure arm', TD,
    `      FailureOf<Left> | FailureOf<Right>,`, `      FailureOf<Left>,`],
  ['RefinePort stops preserving the encoded form', TD,
    `> = RebindPort<Value, Type, EncodedOf<Value>>;`, `> = RebindPort<Value, Type, ArrayBuffer>;`],
  ['Tagged stops rejecting reserved-tag collisions', TD,
    `export type Tagged<Tag extends string, Fields extends object = {}> = '_tag' extends keyof Fields\n  ? never`,
    `export type Tagged<Tag extends string, Fields extends object = {}> = [never] extends [string]\n  ? never`],
  ['UniqueRequirements stops rejecting duplicates', TD,
    `export type UniqueRequirements<Row extends RequirementRow> = [DuplicateRequirementKeys<Row>] extends [never]`,
    `export type UniqueRequirements<Row extends RequirementRow> = [never] extends [never]`],
  ['RequirementRow admits open arrays', TD,
    `export type RequirementRow = readonly [] | readonly [AnyHole, ...AnyHole[]];`,
    `export type RequirementRow = readonly AnyHole[];`],
  ['MissingRequirementKeys stops reporting absences', TD,
    `> = Exclude<RequirementKeys<Row>, keyof Context>;`, `> = never;`],
  ['IncompatibleRequirementKeys stops reporting mismatches', TD,
    `  readonly [Key in RequirementKeys<Row>]: IncompatibleRequirementKey<Row, Context, Key>;`,
    `  readonly [Key in RequirementKeys<Row>]: never;`],
  ['ContextFromBindings stops collapsing duplicate identities', TD,
    `export type ContextFromBindings<Row extends BindingRow> = [\n  UniqueRequirements<RequirementsFromBindings<Row>>,\n] extends [never]\n  ? never`,
    `export type ContextFromBindings<Row extends BindingRow> = [\n  never,\n] extends [never]\n  ? never`],
  ['Envelope stops reserving its keys', TD,
    `> = Extract<keyof Body, EnvelopeReservedKey> extends never`, `> = [unknown] extends [unknown]`],
];

process.exit(runBank('root', M).clean ? 0 : 1);
