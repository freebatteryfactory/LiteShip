/**
 * genui's shared structural type guards.
 *
 * `isPlainObject` is the single "is this a JSON object literal, not null / array /
 * primitive" predicate the parser and the validator both lean on when narrowing
 * MODEL-controlled input before touching its members. Both paths carried a
 * byte-identical local copy; this leaf module owns the one definition so they can
 * share the narrowing without a parse↔validate import cycle.
 *
 * @module
 */

/** Default hostile-input limits. Rendering is bounded by the same admitted tree. */
export const GENERATED_UI_LIMITS = Object.freeze({ maxDepth: 64, maxNodes: 4096 });

export type GeneratedUITreeShapeFailure = 'node' | 'name' | 'props' | 'children' | 'slots' | 'budget';

export type GeneratedUITreeShapeResult =
  | { readonly ok: true; readonly nodeCount: number }
  | { readonly ok: false; readonly failure: GeneratedUITreeShapeFailure; readonly path: string };

/** True only for ordinary/null-prototype data records. */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
};

function ownDataValue(
  record: Record<string, unknown>,
  key: string,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return { ok: true, value: undefined };
  return 'value' in descriptor ? { ok: true, value: descriptor.value } : { ok: false };
}

/**
 * Validate the recursive GeneratedUINode carrier without recursion or getter
 * execution. Semantic catalog checks happen after this shape gate.
 */
export function inspectGeneratedUITreeShape(root: unknown): GeneratedUITreeShapeResult {
  const pending: Array<{ readonly value: unknown; readonly path: string; readonly depth: number }> = [
    { value: root, path: '$', depth: 0 },
  ];
  const seen = new WeakSet<object>();
  let nodeCount = 0;

  while (pending.length > 0) {
    const frame = pending.pop()!;
    if (frame.depth > GENERATED_UI_LIMITS.maxDepth || nodeCount >= GENERATED_UI_LIMITS.maxNodes) {
      return { ok: false, failure: 'budget', path: frame.path };
    }
    if (!isPlainObject(frame.value) || seen.has(frame.value)) {
      return { ok: false, failure: 'node', path: frame.path };
    }
    seen.add(frame.value);
    nodeCount += 1;

    const name = ownDataValue(frame.value, 'name');
    if (!name.ok || typeof name.value !== 'string') {
      return { ok: false, failure: 'name', path: `${frame.path}.name` };
    }
    const props = ownDataValue(frame.value, 'props');
    if (!props.ok || !isPlainObject(props.value)) {
      return { ok: false, failure: 'props', path: `${frame.path}.props` };
    }
    for (const key of Object.keys(props.value)) {
      if (!ownDataValue(props.value, key).ok) {
        return { ok: false, failure: 'props', path: `${frame.path}.props.${key}` };
      }
    }

    const children = ownDataValue(frame.value, 'children');
    if (!children.ok || (children.value !== undefined && !Array.isArray(children.value))) {
      return { ok: false, failure: 'children', path: `${frame.path}.children` };
    }
    if (Array.isArray(children.value)) {
      for (let index = children.value.length - 1; index >= 0; index -= 1) {
        pending.push({
          value: children.value[index],
          path: `${frame.path}.children[${index}]`,
          depth: frame.depth + 1,
        });
      }
    }

    const slots = ownDataValue(frame.value, 'slots');
    if (!slots.ok || (slots.value !== undefined && !isPlainObject(slots.value))) {
      return { ok: false, failure: 'slots', path: `${frame.path}.slots` };
    }
    if (isPlainObject(slots.value)) {
      for (const slotName of Object.keys(slots.value).reverse()) {
        const slot = ownDataValue(slots.value, slotName);
        if (!slot.ok) return { ok: false, failure: 'slots', path: `${frame.path}.slots.${slotName}` };
        const values = Array.isArray(slot.value) ? slot.value : [slot.value];
        for (let index = values.length - 1; index >= 0; index -= 1) {
          pending.push({
            value: values[index],
            path: `${frame.path}.slots.${slotName}[${index}]`,
            depth: frame.depth + 1,
          });
        }
      }
    }
  }

  return { ok: true, nodeCount };
}
