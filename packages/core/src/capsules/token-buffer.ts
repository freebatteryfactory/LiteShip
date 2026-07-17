/**
 * Capsule declaration wrapping TokenBuffer as a stateMachine.
 * Proves the factory kernel against a stateful LLM-token primitive
 * with bounded-allocation discipline.
 *
 * @module
 */

import { assertNever } from '@czap/error';
import { defineCapsule } from '../assembly.js';
import { S } from '../schema/index.js';
import type { Infer } from '../schema/index.js';
import { TokenBuffer } from '../token-buffer.js';

const TokenEventSchema = S.union(
  S.struct({ _tag: S.literal('push'), token: S.string }),
  S.struct({ _tag: S.literal('flush') }),
  S.struct({ _tag: S.literal('reset') }),
);

const PhaseSchema = S.union(S.literal('idle'), S.literal('buffering'), S.literal('draining'));

const BufferStateSchema = S.struct({
  phase: PhaseSchema,
  tokens: S.array(S.string),
  totalBytes: S.number,
});

type TokenEvent = Infer<typeof TokenEventSchema>;
type BufferState = Infer<typeof BufferStateSchema>;

const utf8 = new TextEncoder();

/** Real UTF-8 byte length — `string.length` counts UTF-16 code units. */
function byteLength(token: string): number {
  return utf8.encode(token).length;
}

/**
 * Fold one event into a state snapshot by driving the PRODUCTION
 * TokenBuffer: rebuild the ring buffer from the snapshot, apply the event
 * through its real push/drain/reset surface, then drain to re-snapshot.
 * A parallel reimplementation of the ring-buffer logic here would be the
 * exact shadow-double drift this harness channel exists to prevent.
 *
 * The rebuild uses the production DEFAULT capacity (256) — an expanding
 * capacity would let the snapshot grow without bound and never exercise
 * the ring's oldest-overwrite overflow, diverging from the hot path this
 * harness probes (Codex P2, PR #15).
 */
function stepTokenBuffer(state: BufferState, event: TokenEvent): BufferState {
  const buffer = TokenBuffer.make<string>();
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
    default:
      // Exhaustiveness guard over the TokenEvent union: every `_tag` is
      // handled, so `event` is `never` here and this compiles. Add a fourth
      // event variant to TokenEventSchema without a case and tsc rejects this
      // (TS2345). At runtime — reachable only if a decoded event escapes the
      // schema's type — it fails as a typed InvariantViolationError rather
      // than silently no-op'ing the fold.
      return assertNever(event, 'TokenEvent._tag');
  }

  const tokens = buffer.drain();
  return {
    phase:
      event._tag === 'reset' ? 'idle' : event._tag === 'flush' ? 'draining' : tokens.length > 0 ? 'buffering' : 'idle',
    tokens,
    totalBytes: tokens.reduce((sum, token) => sum + byteLength(token), 0),
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
      // `o` is contextually typed as the output state (`BufferState`) from the
      // capsule's `step` signature — no cast needed.
      check: (_i, o) => (o.tokens.length === 0 ? o.phase !== 'buffering' : true),
      message: 'empty buffer cannot be in buffering phase',
    },
    {
      name: 'totalBytes-tracks-tokens',
      check: (_i, o) => o.totalBytes === o.tokens.reduce((s, t) => s + byteLength(t), 0),
      message: 'totalBytes must equal sum of token UTF-8 byte lengths',
    },
  ],
  budgets: { p95Ms: 0.5, allocClass: 'bounded' },
  site: ['node', 'browser'],
  initialState: { phase: 'idle', tokens: [], totalBytes: 0 },
  step: stepTokenBuffer,
});
