/**
 * Structural validation for generated UI trees against a host catalog.
 *
 * @module
 */

import type { ComponentCatalog, GeneratedUIValidationError, GeneratedUINode } from './types.js';

export type ValidateGeneratedUIResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: GeneratedUIValidationError };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const propMatches = (value: unknown, type: 'string' | 'number' | 'boolean'): boolean => {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
  }
};

const validateNode = (node: GeneratedUINode, catalog: ComponentCatalog, path: string): ValidateGeneratedUIResult => {
  const def = catalog.components[node.name];
  if (!def) {
    return {
      ok: false,
      error: {
        code: 'genui/unknown-component',
        message: `Unknown generated UI component "${node.name}". Register it in the host catalog before rendering.`,
        path,
      },
    };
  }

  if (!isPlainObject(node.props)) {
    return {
      ok: false,
      error: {
        code: 'genui/invalid-prop',
        message: `Component "${node.name}" props must be a plain object.`,
        path: `${path}.props`,
      },
    };
  }

  for (const [key, schema] of Object.entries(def.props)) {
    const value = node.props[key];
    if (value === undefined) {
      if (schema.required) {
        return {
          ok: false,
          error: {
            code: 'genui/invalid-prop',
            message: `Missing required prop "${key}" on "${node.name}".`,
            path: `${path}.props.${key}`,
          },
        };
      }
      continue;
    }
    if (!propMatches(value, schema.type)) {
      return {
        ok: false,
        error: {
          code: 'genui/invalid-prop',
          message: `Prop "${key}" on "${node.name}" must be ${schema.type}.`,
          path: `${path}.props.${key}`,
        },
      };
    }
  }

  for (const key of Object.keys(node.props)) {
    if (!(key in def.props)) {
      return {
        ok: false,
        error: {
          code: 'genui/invalid-prop',
          message: `Unknown prop "${key}" on "${node.name}".`,
          path: `${path}.props.${key}`,
        },
      };
    }
  }

  const childPolicy = def.children ?? 'none';
  const children = node.children ?? [];

  if (childPolicy === 'none' && children.length > 0) {
    return {
      ok: false,
      error: {
        code: 'genui/invalid-children',
        message: `Component "${node.name}" does not accept children.`,
        path: `${path}.children`,
      },
    };
  }

  if (childPolicy === 'required' && children.length === 0) {
    return {
      ok: false,
      error: {
        code: 'genui/invalid-children',
        message: `Component "${node.name}" requires children.`,
        path: `${path}.children`,
      },
    };
  }

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    if (def.allowedChildNames && !def.allowedChildNames.includes(child.name)) {
      return {
        ok: false,
        error: {
          code: 'genui/invalid-children',
          message: `Child "${child.name}" is not allowed under "${node.name}".`,
          path: `${path}.children[${i}]`,
        },
      };
    }
    const childResult = validateNode(child, catalog, `${path}.children[${i}]`);
    if (!childResult.ok) {
      return childResult;
    }
  }

  if (node.slots) {
    for (const [slotName, slotValue] of Object.entries(node.slots)) {
      const slotNodes = Array.isArray(slotValue) ? slotValue : [slotValue];
      for (let i = 0; i < slotNodes.length; i++) {
        const slotResult = validateNode(slotNodes[i]!, catalog, `${path}.slots.${slotName}[${i}]`);
        if (!slotResult.ok) {
          return slotResult;
        }
      }
    }
  }

  return { ok: true };
};

/** Validate a generated UI tree against the host catalog. Unknown names / bad props → reject. */
export function validateGeneratedUITree(node: GeneratedUINode, catalog: ComponentCatalog): ValidateGeneratedUIResult {
  return validateNode(node, catalog, node.name);
}
