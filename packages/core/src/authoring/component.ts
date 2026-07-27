/**
 * ComponentDef -- adaptive component primitive for constraint-based rendering.
 *
 * A component binds a boundary, styles, and named slots into a single
 * content-addressed unit. Content-addressed via FNV-1a.
 *
 * @module
 */

import type { ContentAddress } from '../schema/brands.js';
import type { Boundary } from './boundary.js';
import type { Style } from './style.js';
import { CanonicalCbor } from '../schema/cbor.js';
import { fnv1aBytes } from '../evidence/fnv.js';

/** Per-slot configuration on a component — whether the slot must be provided, plus optional description. */
export interface SlotConfig {
  /** Default: false. */
  readonly required?: boolean;
  readonly description?: string;
}

interface ComponentDef<B extends Boundary = Boundary, SlotNames extends readonly string[] = readonly string[]> {
  readonly _tag: 'ComponentDef';
  readonly _version: 1;
  readonly id: ContentAddress;
  readonly name: string;
  readonly boundary?: B;
  readonly styles: Style<B>;
  readonly slots: { readonly [K in SlotNames[number]]: SlotConfig };
  readonly defaultSlot?: SlotNames[number];
}

function deterministicId<SlotNames extends readonly string[]>(
  name: string,
  boundaryId: string | undefined,
  stylesId: string,
  slots: { readonly [K in SlotNames[number]]: SlotConfig },
  defaultSlot?: string,
): ContentAddress {
  return fnv1aBytes(
    CanonicalCbor.encode({
      _tag: 'ComponentDef',
      _version: 1,
      name,
      boundaryId: boundaryId ?? null,
      stylesId,
      slots,
      defaultSlot: defaultSlot ?? null,
    }),
  );
}

/**
 * Create a {@link Component} — the content-addressed unit that binds a
 * {@link Boundary}, a {@link Style}, and named slots into a single declaration
 * compilers can target. The optional boundary gates style variants; the slots
 * describe the consumer-facing API (verb grammar, ADR-0046 — `create` allocates a
 * content-addressed unit).
 */
export function createComponent<
  B extends Boundary,
  const SN extends readonly [string, ...string[]] = readonly ['children'],
>(config: {
  readonly name: string;
  readonly boundary?: B;
  readonly styles: Style<B>;
  /** Default: an implied single 'children' slot with defaultSlot 'children'. */
  readonly slots?: { readonly [K in SN[number]]: SlotConfig };
  readonly defaultSlot?: SN[number];
}): ComponentDef<B, SN> {
  // Normalize so an omitted `required` hashes identically to an explicit `false`.
  const slotsInput = (config.slots ?? { children: {} }) as Record<string, SlotConfig>;
  const slots = Object.fromEntries(
    Object.entries(slotsInput).map(([slotName, slot]) => [
      slotName,
      {
        required: slot.required ?? false,
        ...(slot.description !== undefined ? { description: slot.description } : {}),
      },
    ]),
  ) as { readonly [K in SN[number]]: SlotConfig };
  const defaultSlot = config.defaultSlot ?? (config.slots === undefined ? ('children' as SN[number]) : undefined);

  const id = deterministicId<SN>(config.name, config.boundary?.id, config.styles.id, slots, defaultSlot);

  const def: ComponentDef<B, SN> = {
    _tag: 'ComponentDef',
    _version: 1,
    id,
    name: config.name,
    ...(config.boundary !== undefined ? { boundary: config.boundary } : {}),
    styles: config.styles,
    slots,
    ...(defaultSlot !== undefined ? { defaultSlot } : {}),
  };
  return Object.freeze(def);
}

/** Public structural type for `Component`. */
export type Component<B extends Boundary = Boundary, SN extends readonly string[] = readonly string[]> = ComponentDef<
  B,
  SN
>;
