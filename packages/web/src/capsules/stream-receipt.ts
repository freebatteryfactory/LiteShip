/**
 * Capsule declaration wrapping the SSE morph + receipt flow as a
 * `receiptedMutation` instance. Proves the factory kernel against
 * a side-effecting op that emits an audit receipt per applied
 * stream message.
 *
 * @module
 */

import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';

const StreamMessageSchema = Schema.Struct({
  kind: Schema.Union([
    Schema.Literal('patch'),
    Schema.Literal('batch'),
    Schema.Literal('signal'),
    Schema.Literal('snapshot'),
  ]),
  payload: Schema.Unknown,
});

const ReceiptResultSchema = Schema.Struct({
  status: Schema.Union([Schema.Literal('applied'), Schema.Literal('skipped'), Schema.Literal('failed')]),
  receipt: Schema.Struct({
    messageId: Schema.String,
    appliedAt: Schema.Number,
    morphPath: Schema.optional(Schema.String),
  }),
});

/**
 * Declared capsule for the SSE stream receipt flow. Registered in the
 * module-level catalog at import time; walked by the factory compiler.
 */
export const streamReceiptCapsule = defineCapsule({
  _kind: 'receiptedMutation',
  name: 'web.stream.receipt',
  input: StreamMessageSchema,
  output: ReceiptResultSchema,
  capabilities: { reads: ['stream.incoming'], writes: ['dom.morph', 'receipt.ledger'] },
  // TYPED escape hatch (mandatory-`mutate` rule): the receipt here is the
  // OUTCOME of applying a DOM morph. `status` (applied / skipped / failed)
  // depends on whether the live morph succeeded against the current DOM,
  // `receipt.appliedAt` is the wall-clock instant the morph ran, and
  // `receipt.morphPath` resolves the live target element. None of these can be
  // derived from the incoming stream message by a pure function — they only
  // exist once the side effect runs. So this declares `effect-outcome` with a
  // reason rather than a vacuous `mutate`. The contract round-trip still proves
  // the receipt schema is well-formed.
  receiptKind: 'effect-outcome',
  reason:
    'receipt is the outcome of applying a live DOM morph; status (applied/skipped/failed), ' +
    'appliedAt (wall-clock), and morphPath (resolved live target) only exist after the morph ' +
    'effect runs against the current DOM and cannot be derived purely from the stream message.',
  invariants: [
    {
      name: 'receipt-accompanies-every-mutation',
      check: (
        _i: { kind: string; payload: unknown },
        o: { status: string; receipt: { messageId: string; appliedAt: number; morphPath?: string } },
      ): boolean => o.status !== 'applied' || typeof o.receipt.messageId === 'string',
      message: 'applied mutations must carry a receipt',
    },
  ],
  budgets: { p95Ms: 2 },
  site: ['node', 'browser'],
});
