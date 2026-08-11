// The ten scenarios reported as surviving the 82-law artifact.
//
// Mutations carried verbatim from the ratified verification kit; only the
// plumbing changed. Each entry rewrites one exact span of the live tree and
// must die on a named law. An entry whose anchor text is absent reports
// MISSING and fails the bank -- a bank that has drifted off the source must
// never be mistaken for a bank that passed.

import { runBank } from '../harness.mjs';

const TD = 'types.d.ts';
// The ten scenarios GPT Pro reported as surviving the full 82-law artifact.

const M = [
  ['handlers_requiredness :: Handlers stops requiring every case', TD,
    `  readonly [Tag in TagOf<Value>]: (value: CaseOf<Value, Tag>) => Output;`,
    `  readonly [Tag in TagOf<Value>]?: (value: CaseOf<Value, Tag>) => Output;`],

  ['refine_port_encoded_preservation :: RefinePort overwrites the encoded form', TD,
    `> = RebindPort<Value, Type, EncodedOf<Value>>;`,
    `> = RebindPort<Value, Type, Type>;`],

  ['context_of_unique_guard :: ContextOf drops its uniqueness guard', TD,
    `export type ContextOf<Row extends RequirementRow> = [UniqueRequirements<Row>] extends [never]`,
    `export type ContextOf<Row extends RequirementRow> = [unknown] extends [never]`],

  ['requirements_satisfied_unique_guard :: RequirementsSatisfied drops its uniqueness guard', TD,
    `> = [UniqueRequirements<Row>] extends [never]\n  ? false`,
    `> = [unknown] extends [never]\n  ? false`],

  ['bindings_for_unique_guard :: BindingsFor drops its uniqueness guard', TD,
    `export type BindingsFor<Row extends RequirementRow> = [UniqueRequirements<Row>] extends [never]`,
    `export type BindingsFor<Row extends RequirementRow> = [unknown] extends [never]`],

  ['merge_requirements_left_unique_guard :: MergeRequirements stops checking its left row', TD,
    `> = [UniqueRequirements<Left>] extends [never]`,
    `> = [unknown] extends [never]`],

  ['merge_requirements_right_unique_guard :: MergeRequirements stops checking its right row', TD,
    `  : [UniqueRequirements<Right>] extends [never]`,
    `  : [unknown] extends [never]`],

  ['signature_unique_requirements_guard :: Signature drops its uniqueness guard', TD,
    `> = [UniqueRequirements<Requirements>] extends [never]`,
    `> = [unknown] extends [never]`],

  ['predecessors_closed_row :: Predecessors stops being an ordered row', TD,
    `export type Predecessors<ReferenceValue> = readonly ReferenceValue[];`,
    `export type Predecessors<ReferenceValue> = unknown;`],

  ['causal_previous_shape :: Causal.previous stops being a predecessor row', TD,
    `  readonly previous: Predecessors<ReferenceValue>;`,
    `  readonly previous: ReferenceValue;`],
];

process.exit(runBank('v32', M).clean ? 0 : 1);
