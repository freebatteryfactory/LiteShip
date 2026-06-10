/**
 * Capsule declaration wrapping TokenBuffer as a stateMachine.
 * Proves the factory kernel against a stateful LLM-token primitive
 * with bounded-allocation discipline.
 *
 * @module
 */

import { Schema } from 'effect';
import { defineCapsule } from '../assembly.js';
import { TokenBuffer } from '../token-buffer.js';

const TokenEventSchema = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('push'), token: Schema.String }),
  Schema.Struct({ _tag: Schema.Literal('flush') }),
  Schema.Struct({ _tag: Schema.Literal('reset') }),
]);

const PhaseSchema = Schema.Union([Schema.Literal('idle'), Schema.Literal('buffering'), Schema.Literal('draining')]);

const BufferStateSchema = Schema.Struct({
  phase: PhaseSchema,
  tokens: Schema.Array(Schema.String),
  totalBytes: Schema.Number,
});

type TokenEvent = Schema.Schema.Type<typeof TokenEventSchema>;
type BufferState = Schema.Schema.Type<typeof BufferStateSchema>;

/**
 * Fold one event into a state snapshot by driving the PRODUCTION
 * TokenBuffer: rebuild the ring buffer from the snapshot, apply the event
 * through its real push/drain/reset surface, then drain to re-snapshot.
 * A parallel reimplementation of the ring-buffer logic here would be the
 * exact shadow-double drift this harness channel exists to prevent.
 */
function stepTokenBuffer(state: BufferState, event: TokenEvent): BufferState {
  const buffer = TokenBuffer.make<string>({ capacity: state.tokens.length + 1 });
  for (const token of state.tokens) buffer.push(token);

  switch (event._tag) {
    case 'push':
      buffer.push(event.token);
      break;
    case 'flush':
      buffer.drain();
      break;
    case 'reset':
      buffer.reset();
      break;
  }

  const tokens = buffer.drain();
  return {
    phase:
      event._tag === 'reset' ? 'idle' : event._tag === 'flush' ? 'draining' : tokens.length > 0 ? 'buffering' : 'idle',
    tokens,
    totalBytes: tokens.reduce((sum, token) => sum + token.length, 0),
  };
}

/**
 * Declared capsule for TokenBuffer. Registered in the module-level
 * catalog at import time; walked by the factory compiler.
 */
export const tokenBufferCapsule = defineCapsule({
  _kind: 'stateMachine',
  name: 'core.token-buffer',
  input: TokenEventSchema,
  output: BufferStateSchema,
  capabilities: { reads: [], writes: ['buffer.tokens'] },
  invariants: [
    {
      name: 'phase-matches-content',
      check: (_i, o) => {
        const out = o as { phase: string; tokens: readonly string[] };
        return out.tokens.length === 0 ? out.phase !== 'buffering' : true;
      },
      message: 'empty buffer cannot be in buffering phase',
    },
    {
      name: 'totalBytes-tracks-tokens',
      check: (_i, o) => {
        const out = o as { tokens: readonly string[]; totalBytes: number };
        const expected = out.tokens.reduce((s, t) => s + t.length, 0);
        return out.totalBytes === expected;
      },
      message: 'totalBytes must equal sum of token byte lengths',
    },
  ],
  budgets: { p95Ms: 0.5, allocClass: 'bounded' },
  site: ['node', 'browser'],
  initialState: { phase: 'idle', tokens: [], totalBytes: 0 },
  step: stepTokenBuffer,
});
