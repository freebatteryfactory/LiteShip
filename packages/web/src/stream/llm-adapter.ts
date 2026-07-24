/**
 * LLM Adapter -- provider-agnostic LLM stream adapter.
 *
 * Thin adapter that normalizes any LLM streaming API into liteship's
 * token buffer. Pure plumbing, model-blind.
 *
 * The user provides a ChunkParser function. liteship handles everything
 * downstream: buffering, quality adaptation, frame scheduling,
 * DOM application, receipt tracking.
 *
 * @module
 */

import type { SSEMessage } from '../types.js';
import { LLMChunkNormalization, type LLMChunk, type ToolCallAccumulator } from './llm-chunks.js';
export type { LLMChunk, LLMChunkType } from './llm-chunks.js';
export { tryParseGeneratedUIChunk } from '@liteship/genui';

// ---------------------------------------------------------------------------
// Chunk parser (user-provided)
// ---------------------------------------------------------------------------

/**
 * User-provided function that converts a raw SSE message into an
 * {@link LLMChunk} (or `null` to drop it). The adapter calls this
 * exactly once per incoming message.
 */
export type ChunkParser = (event: SSEMessage) => LLMChunk | null;

// ---------------------------------------------------------------------------
// LLM stream config
// ---------------------------------------------------------------------------

/**
 * Configuration accepted by {@link LLMAdapter.create}.
 *
 * `source` is typically the `messages` AsyncIterable of an {@link SSE} client,
 * but any `Iterable`/`AsyncIterable` of `SSEMessage` will do -- including plain
 * arrays in tests. Consumed with `for await`, so both sync and async sources work.
 */
export interface LLMStreamConfig {
  /** Iterable (or AsyncIterable) of parsed SSE messages. */
  readonly source: AsyncIterable<SSEMessage> | Iterable<SSEMessage>;
  /** Parser mapping SSE messages to typed LLM chunks. */
  readonly parser: ChunkParser;
}

// ---------------------------------------------------------------------------
// LLM adapter
// ---------------------------------------------------------------------------

/**
 * Host-facing surface of an LLM adapter. Exposes both the typed
 * {@link LLMChunk} stream and the decoded text-token stream derived
 * from it. Returned by {@link LLMAdapter.create}.
 */
export interface LLMAdapterShape {
  readonly chunks: AsyncIterable<LLMChunk>;
  readonly textTokens: AsyncIterable<string>;
}

/**
 * Create an LLM adapter that normalizes any LLM streaming API into typed
 * chunk and text-token streams.
 *
 * The user supplies a {@link ChunkParser} function that converts SSE messages
 * into {@link LLMChunk} objects. The adapter handles tool-call accumulation,
 * JSON argument parsing, and text-token extraction.
 *
 * @example
 * ```ts
 * import { LLMAdapter } from '@liteship/web';
 *
 * const adapter = LLMAdapter.create({
 *   source: sseMessageStream,
 *   parser: (event) => {
 *     if (event.type !== 'patch') return null;
 *     const data = event.data as { type?: string; content?: string };
 *     if (data.type === 'text' && typeof data.content === 'string') {
 *       return { type: 'text', partial: false, content: data.content };
 *     }
 *     return null;
 *   },
 * });
 * // adapter.textTokens is an AsyncIterable<string> of text content
 * // adapter.chunks is an AsyncIterable<LLMChunk> of all parsed chunks
 * for await (const token of adapter.textTokens) process.stdout.write(token);
 * ```
 *
 * @param config - Stream source and parser configuration
 * @returns An {@link LLMAdapterShape} with `chunks` and `textTokens` AsyncIterables
 */
function _create(config: LLMStreamConfig): LLMAdapterShape {
  // Each iteration replays the tool-call accumulator state from scratch and
  // re-reads `source` — matching the former Stream semantics (a fresh run per
  // subscription). Consumers iterate EITHER `chunks` OR `textTokens`.
  const parseChunks = async function* (): AsyncGenerator<LLMChunk, void, undefined> {
    let toolCallBuffer: ToolCallAccumulator = null;
    for await (const event of config.source) {
      const parsed = config.parser(event);
      if (!parsed) {
        continue;
      }
      const normalized = LLMChunkNormalization.normalize(parsed, toolCallBuffer);
      toolCallBuffer = normalized.toolCallBuffer;
      if (normalized.chunk) {
        yield normalized.chunk;
      }
    }
  };

  const chunks: AsyncIterable<LLMChunk> = {
    [Symbol.asyncIterator]: () => parseChunks(),
  };

  // Convenience stream of just text tokens (for feeding into TokenBuffer).
  const textTokens: AsyncIterable<string> = {
    async *[Symbol.asyncIterator](): AsyncGenerator<string, void, undefined> {
      for await (const chunk of parseChunks()) {
        if (chunk.type === 'text' && chunk.content !== undefined) {
          yield chunk.content;
        }
      }
    },
  };

  return { chunks, textTokens };
}

function _collect(config: {
  readonly source: Iterable<SSEMessage>;
  readonly parser: ChunkParser;
}): readonly LLMChunk[] {
  const chunks: LLMChunk[] = [];
  let toolCallBuffer: ToolCallAccumulator = null;

  for (const event of config.source) {
    const parsed = config.parser(event);
    if (!parsed) {
      continue;
    }

    const normalized = LLMChunkNormalization.normalize(parsed, toolCallBuffer);
    toolCallBuffer = normalized.toolCallBuffer;
    if (normalized.chunk) {
      chunks.push(normalized.chunk);
    }
  }

  return chunks;
}

/**
 * LLM adapter namespace.
 *
 * Provider-agnostic LLM stream adapter. Normalizes any LLM streaming API
 * (OpenAI, Anthropic, etc.) into liteship's typed chunk buffer via a user-provided
 * {@link ChunkParser}. Handles tool-call accumulation, JSON argument parsing,
 * and produces a convenience `textTokens` stream for feeding into a
 * token buffer.
 *
 * @example
 * ```ts
 * import { LLMAdapter, SSE } from '@liteship/web';
 *
 * const client = SSE.create({ url: '/api/llm/stream' });
 * const adapter = LLMAdapter.create({
 *   source: client.messages,
 *   parser: (msg) => {
 *     if (msg.type !== 'patch') return null;
 *     const data = msg.data as { type?: string; content?: string };
 *     return data.type === 'text' && typeof data.content === 'string'
 *       ? { type: 'text', partial: false, content: data.content }
 *       : null;
 *   },
 * });
 * for await (const token of adapter.textTokens) process.stdout.write(token);
 * ```
 */
export const LLMAdapter = { create: _create, collect: _collect };

/** Public structural type for `LLMAdapter`. */
export type LLMAdapter = LLMAdapterShape;

export declare namespace LLMAdapter {
  /** Adapter config type alias. */
  export type Config = LLMStreamConfig;
  /** Normalized LLM chunk type alias. */
  export type Chunk = LLMChunk;
  /** User-provided chunk-parser function. */
  export type Parser = ChunkParser;
}
