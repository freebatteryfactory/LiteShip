/**
 * Parse structured generated UI chunks from model text output.
 *
 * Discriminator: `{ "_genui": true, "name": "...", "props": { ... } }`.
 *
 * @module
 */

import type { GeneratedUINode } from './types.js';
import { inspectGeneratedUITreeShape } from './guards.js';

/**
 * Try to parse a text chunk as a generated UI tree.
 * Returns `null` for legacy token/text/HTML paths.
 */
export function tryParseGeneratedUIChunk(content: string): GeneratedUINode | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed._genui !== true) {
      return null;
    }
    const { _genui: _marker, ...rest } = parsed;
    void _marker;
    if (!inspectGeneratedUITreeShape(rest).ok) {
      return null;
    }
    return rest as unknown as GeneratedUINode;
  } catch (error) {
    // Malformed JSON — fall through to legacy token/text/HTML paths.
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}
