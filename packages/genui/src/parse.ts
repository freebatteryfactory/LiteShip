/**
 * Parse structured generated UI chunks from model text output.
 *
 * Discriminator: `{ "_genui": true, "name": "...", "props": { ... } }`.
 *
 * @module
 */

import type { GeneratedUINode } from './types.js';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isGeneratedUINode = (value: unknown): value is GeneratedUINode => {
  if (!isPlainObject(value)) {
    return false;
  }
  if (typeof value.name !== 'string' || !isPlainObject(value.props)) {
    return false;
  }
  if ('children' in value && value.children !== undefined) {
    if (!Array.isArray(value.children) || !value.children.every(isGeneratedUINode)) {
      return false;
    }
  }
  if ('slots' in value && value.slots !== undefined) {
    if (!isPlainObject(value.slots)) {
      return false;
    }
    for (const slotValue of Object.values(value.slots)) {
      if (Array.isArray(slotValue)) {
        if (!slotValue.every(isGeneratedUINode)) {
          return false;
        }
      } else if (!isGeneratedUINode(slotValue)) {
        return false;
      }
    }
  }
  return true;
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
  } catch (error) {
    // Malformed JSON — fall through to legacy token/text/HTML paths.
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}
