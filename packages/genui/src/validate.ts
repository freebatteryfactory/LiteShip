/**
 * Structural and catalog validation for hostile generated UI trees.
 *
 * @module
 */

import type { ComponentCatalog, ComponentDef, GeneratedUIValidationError, GeneratedUINode } from './types.js';
import { isInteractionProp } from './interaction.js';
import { inspectGeneratedUITreeShape } from './guards.js';

/** Successful validation or one stable generated-UI refusal. */
export type ValidateGeneratedUIResult =
  { readonly ok: true } | { readonly ok: false; readonly error: GeneratedUIValidationError };

interface ValidationFrame {
  readonly node: GeneratedUINode;
  readonly path: string;
}

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

const own = <T>(record: Readonly<Record<string, T>>, key: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;

const reject = (
  code: GeneratedUIValidationError['code'],
  message: string,
  path: string,
): ValidateGeneratedUIResult => ({ ok: false, error: { code, message, path } });

/** Browser-safe href policy: relative references plus explicit web/contact schemes. */
export function isSafeGeneratedUIHref(value: string): boolean {
  if (/[\x00-]/u.test(value)) return false;
  const href = value.trim();
  if (href.startsWith('//')) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/iu.exec(href)?.[1]?.toLowerCase();
  return scheme === undefined || scheme === 'http' || scheme === 'https' || scheme === 'mailto' || scheme === 'tel';
}

function validateProps(node: GeneratedUINode, def: ComponentDef, path: string): ValidateGeneratedUIResult | undefined {
  for (const [key, schema] of Object.entries(def.props)) {
    const value = own(node.props, key);
    if (value === undefined) {
      if (schema.required) {
        return reject(
          'genui/invalid-prop',
          `Missing required prop "${key}" on "${node.name}".`,
          `${path}.props.${key}`,
        );
      }
      continue;
    }
    if (isInteractionProp(key)) {
      if (key !== 'onClick') {
        return reject(
          'genui/invalid-prop',
          `Handler "${key}" on "${node.name}" is not supported — genui serves onClick with an opaque action id.`,
          `${path}.props.${key}`,
        );
      }
      if (typeof value !== 'string') {
        return reject(
          'genui/invalid-prop',
          `onClick on "${node.name}" must be a string action id.`,
          `${path}.props.${key}`,
        );
      }
    }
    if (!propMatches(value, schema.type)) {
      return reject(
        'genui/invalid-prop',
        `Prop "${key}" on "${node.name}" must be ${schema.type}.`,
        `${path}.props.${key}`,
      );
    }
    if (key === 'href' && typeof value === 'string' && !isSafeGeneratedUIHref(value)) {
      return reject(
        'genui/invalid-prop',
        `Prop "href" on "${node.name}" uses a refused URL scheme.`,
        `${path}.props.href`,
      );
    }
  }

  for (const key of Object.keys(node.props)) {
    if (!Object.prototype.hasOwnProperty.call(def.props, key)) {
      return reject('genui/invalid-prop', `Unknown prop "${key}" on "${node.name}".`, `${path}.props.${key}`);
    }
  }
  return undefined;
}

function structuralFailure(
  node: unknown,
  failure: ReturnType<typeof inspectGeneratedUITreeShape>,
): ValidateGeneratedUIResult {
  if (failure.ok) return { ok: true };
  const nameDescriptor =
    typeof node === 'object' && node !== null ? Object.getOwnPropertyDescriptor(node, 'name') : undefined;
  const rootPath =
    nameDescriptor !== undefined && 'value' in nameDescriptor && typeof nameDescriptor.value === 'string'
      ? nameDescriptor.value
      : '$';
  const path = failure.path === '$' ? rootPath : failure.path.replace(/^\$/u, rootPath);
  if (failure.failure === 'slots') {
    return reject('genui/invalid-slots', 'Generated UI slots must be data records containing valid nodes.', path);
  }
  if (failure.failure === 'children' || failure.failure === 'budget' || failure.failure === 'node') {
    return reject(
      'genui/invalid-children',
      failure.failure === 'budget'
        ? 'Generated UI tree exceeds the bounded depth or node-count budget.'
        : 'Generated UI children must form an acyclic bounded tree of data records.',
      path,
    );
  }
  return reject('genui/invalid-prop', 'Generated UI node name and props must be plain data values.', path);
}

/** Validate a generated UI tree against the host catalog. Unknown or unrepresentable input refuses. */
export function validateGeneratedUITree(node: GeneratedUINode, catalog: ComponentCatalog): ValidateGeneratedUIResult {
  const shape = inspectGeneratedUITreeShape(node);
  if (!shape.ok) return structuralFailure(node, shape);

  const rootPath = node.name;
  const pending: ValidationFrame[] = [{ node, path: rootPath }];
  while (pending.length > 0) {
    const frame = pending.pop()!;
    const current = frame.node;
    const def = own(catalog.components, current.name);
    if (def === undefined) {
      return reject(
        'genui/unknown-component',
        `Unknown generated UI component "${current.name}". Register it in the host catalog before rendering.`,
        frame.path,
      );
    }

    const propFailure = validateProps(current, def, frame.path);
    if (propFailure !== undefined) return propFailure;

    const children = current.children ?? [];
    const slotted = Object.entries(current.slots ?? {}).flatMap(([slotName, value]) =>
      (Array.isArray(value) ? value : [value]).map((child, index) => ({
        child,
        path: `${frame.path}.slots.${slotName}[${index}]`,
      })),
    );
    const direct = [
      ...children.map((child, index) => ({ child, path: `${frame.path}.children[${index}]` })),
      ...slotted,
    ];
    const childPolicy = def.children ?? 'none';
    if (childPolicy === 'none' && direct.length > 0) {
      return reject(
        'genui/invalid-children',
        `Component "${current.name}" does not accept children or slotted descendants.`,
        direct[0]!.path,
      );
    }
    if (childPolicy === 'required' && direct.length === 0) {
      return reject(
        'genui/invalid-children',
        `Component "${current.name}" requires children (a child or slotted descendant).`,
        `${frame.path}.children`,
      );
    }
    for (const descendant of direct) {
      if (def.allowedChildNames !== undefined && !def.allowedChildNames.includes(descendant.child.name)) {
        return reject(
          'genui/invalid-children',
          `Child "${descendant.child.name}" is not allowed under "${current.name}".`,
          descendant.path,
        );
      }
    }
    for (let index = direct.length - 1; index >= 0; index -= 1) {
      const descendant = direct[index]!;
      pending.push({ node: descendant.child, path: descendant.path });
    }
  }

  return { ok: true };
}
