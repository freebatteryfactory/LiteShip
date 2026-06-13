/**
 * Parse structured generated UI chunks from model text output.
 *
 * Discriminator: `{ "_genui": true, "name": "...", "props": { ... } }`.
 *
 * @module
 */

import type { GeneratedUINode } from './types.js';

const isGeneratedUINode = (value: unknown): value is GeneratedUINode => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string' && record.props !== null && typeof record.props === 'object';
};

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
    if (!isGeneratedUINode(rest)) {
      return null;
    }
    return rest;
  } catch {
    return null;
  }
}
