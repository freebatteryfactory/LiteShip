import { SlotRegistry, dispatchLiteshipEvent } from '@liteship/web';
import type { DirectiveName } from './directive-boot.js';
import { readRuntimeGlobal, writeRuntimeGlobal } from './globals.js';

interface RuntimeWindow extends Window {
  __LITESHIP_SLOT_REGISTRY__?: SlotRegistry;
  __LITESHIP_SLOT_BOOTSTRAPPED__?: boolean;
  __LITESHIP_SLOTS__?: {
    readonly registry: SlotRegistry;
    readonly entries: Record<string, { path: string; mode: string }>;
  };
}

/** The explicit cross-directive marker used by the plain-element boot scanner. */
export const DIRECTIVE_MARKER_ATTRIBUTE = 'data-liteship-directive';

/** One directive-owned root attribute and whether it is unambiguous enough for implicit boot. */
export interface DirectiveRootAttribute {
  readonly scope: 'root';
  readonly attribute: string;
  readonly implicitBoot: boolean;
}

/** A payload owned by a directive on a qualified descendant of its marked root. */
export interface DirectiveDescendantAttribute {
  readonly scope: 'descendant';
  readonly attribute: string;
  readonly owner: DirectiveName;
  readonly requires: readonly string[];
}

/** Every attribute ownership shape understood by directive discovery and diagnostics. */
export type DirectiveAttributeClaim = DirectiveRootAttribute | DirectiveDescendantAttribute;

/**
 * Canonical directive-root attribute registry. `slots.ts` owns this because its
 * reinit/teardown selector is the broad runtime-root discovery source; the boot
 * scanner derives its implicit plain-element selectors from the same data.
 */
export const DIRECTIVE_ATTRIBUTE_REGISTRY = {
  adaptive: [{ scope: 'root', attribute: 'data-liteship-boundary', implicitBoot: false }],
  stream: [{ scope: 'root', attribute: 'data-liteship-stream-url', implicitBoot: true }],
  llm: [{ scope: 'root', attribute: 'data-liteship-llm-url', implicitBoot: true }],
  worker: [{ scope: 'root', attribute: 'data-liteship-boundary', implicitBoot: false }],
  gpu: [{ scope: 'root', attribute: 'data-liteship-shader-src', implicitBoot: true }],
  wasm: [{ scope: 'root', attribute: 'data-liteship-wasm', implicitBoot: true }],
  graph: [{ scope: 'root', attribute: 'data-liteship-graph', implicitBoot: true }],
  motion: [{ scope: 'root', attribute: 'data-liteship-motion-program', implicitBoot: true }],
  svg: [
    {
      scope: 'descendant',
      attribute: 'data-liteship-boundary',
      owner: 'svg',
      requires: ['data-liteship-entity', 'data-liteship-svg'],
    },
  ],
} as const satisfies Record<DirectiveName, readonly DirectiveAttributeClaim[]>;

function attributeSelector(attribute: string): string {
  return `[${attribute}]`;
}

function uniqueDirectiveAttributes(): readonly string[] {
  return [
    ...new Set(
      Object.values(DIRECTIVE_ATTRIBUTE_REGISTRY)
        .flat()
        .filter((entry) => entry.scope === 'root')
        .map((entry) => entry.attribute),
    ),
  ];
}

/** Return the unambiguous attribute selectors that implicitly boot `name` on plain elements. */
export function implicitDirectiveSelectors(name: DirectiveName): readonly string[] {
  return DIRECTIVE_ATTRIBUTE_REGISTRY[name].flatMap((entry) =>
    entry.scope === 'root' && entry.implicitBoot ? [attributeSelector(entry.attribute)] : [],
  );
}

function directiveOwnerSelector(owner: DirectiveName): string {
  return [
    `[data-liteship-directive~="${owner}"]`,
    `[client\\:${owner}]`,
    `[data-liteship-directive-bound~="${owner}"]`,
  ].join(',');
}

/** Whether `element` is a fully-qualified descendant payload owned by a marked directive root. */
export function isClaimedDirectiveDescendant(element: Element, attribute?: string): boolean {
  for (const claims of Object.values(DIRECTIVE_ATTRIBUTE_REGISTRY)) {
    for (const claim of claims) {
      if (claim.scope !== 'descendant') continue;
      if (attribute !== undefined && claim.attribute !== attribute) continue;
      if (!element.hasAttribute(claim.attribute)) continue;
      if (!claim.requires.every((required) => element.hasAttribute(required))) continue;
      const ownerRoot = element.closest(directiveOwnerSelector(claim.owner));
      if (ownerRoot !== null && ownerRoot !== element) return true;
    }
  }
  return false;
}

const REINIT_SELECTOR = [...uniqueDirectiveAttributes(), DIRECTIVE_MARKER_ATTRIBUTE].map(attributeSelector).join(',');

function isSlotRegistryShape(value: unknown): value is SlotRegistry {
  if (typeof value !== 'object' || value === null) return false;
  if (!('get' in value) || !('register' in value) || !('entries' in value)) return false;
  return typeof value.get === 'function' && typeof value.register === 'function' && typeof value.entries === 'function';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function runtimeWindow(): RuntimeWindow | null {
  return typeof window === 'undefined' ? null : (window as RuntimeWindow);
}

/**
 * Return the document-scoped {@link SlotRegistry}, creating and
 * persisting one on `window.__LITESHIP_SLOT_REGISTRY__` the first time
 * it's requested. Returns a detached registry under SSR.
 */
export function getSlotRegistry(): SlotRegistry {
  const win = runtimeWindow();
  if (!win) {
    return SlotRegistry.create();
  }

  const existingRegistry = readRuntimeGlobal('__LITESHIP_SLOT_REGISTRY__', isSlotRegistryShape);
  if (!existingRegistry) {
    return writeRuntimeGlobal('__LITESHIP_SLOT_REGISTRY__', SlotRegistry.create());
  }

  return existingRegistry;
}

/**
 * Clear and rebuild the slot registry by scanning `root` for
 * `data-liteship-slot` elements. Also writes a serialised
 * `__LITESHIP_SLOTS__` snapshot for devtools / diagnostics consumers.
 */
export function rescanSlots(root: ParentNode = document): SlotRegistry {
  const registry = getSlotRegistry();
  const existingPaths = Array.from(registry.entries().keys());
  for (const path of existingPaths) {
    registry.unregister(path);
  }

  const scanRoot = root instanceof Element ? root : document.documentElement;
  SlotRegistry.scanDOM(registry, scanRoot);

  const win = runtimeWindow();
  if (win) {
    writeRuntimeGlobal('__LITESHIP_SLOTS__', {
      registry,
      entries: Object.fromEntries(
        Array.from(registry.entries().entries()).map(([path, entry]) => [path, { path, mode: entry.mode }]),
      ),
    });
  }

  return registry;
}

/**
 * One-shot INITIAL bootstrap: arm a slot-registry scan on
 * `DOMContentLoaded` (or immediately if the document is already ready).
 * Idempotent -- subsequent calls return the same registry.
 *
 * The post-swap re-scan is NOT registered here: it is the first step of the
 * single ordered swap pipeline (`./swap-pipeline.ts`, F-1), so slot-rescan,
 * directive-boot, and reinit run in a guaranteed order rather than racing on
 * listener-registration luck.
 */
export function bootstrapSlots(): SlotRegistry {
  const win = runtimeWindow();
  if (!win) {
    return SlotRegistry.create();
  }

  const scan = (): void => {
    rescanSlots(document.documentElement);
  };

  if (!readRuntimeGlobal('__LITESHIP_SLOT_BOOTSTRAPPED__', isBoolean)) {
    writeRuntimeGlobal('__LITESHIP_SLOT_BOOTSTRAPPED__', true);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scan, { once: true });
    } else {
      scan();
    }
  }

  return getSlotRegistry();
}

/**
 * Dispatch `liteship:reinit` on every known directive root so directives can RE-READ
 * fresh `data-liteship-*` attributes without remounting. The reinit handlers
 * self-clean (each directive's `liteship:reinit` listener disposes its prior wiring
 * before re-initializing), so this no longer broadcasts `liteship:teardown` — that
 * event is reserved for FINAL teardown ({@link teardownDirectives}). Conflating
 * the two (the old single `liteship:dispose`) forced gpu.ts to special-case "dispose
 * during a live reinit"; splitting them removes that hazard (F-2).
 *
 * Used after Astro View Transitions `after-swap` (the third step of the swap
 * pipeline).
 */
export function reinitializeDirectives(): void {
  document.querySelectorAll<HTMLElement>(REINIT_SELECTOR).forEach((element) => {
    dispatchLiteshipEvent(element, 'liteship:reinit');
  });
}

/**
 * Dispatch `liteship:teardown` on every known directive root — the FINAL teardown
 * signal (the page/element is going away for good). Directives release every
 * observer/listener and do NOT re-initialize. Distinct from
 * {@link reinitializeDirectives} (re-read attrs, stay live).
 */
export function teardownDirectives(): void {
  document.querySelectorAll<HTMLElement>(REINIT_SELECTOR).forEach((element) => {
    dispatchLiteshipEvent(element, 'liteship:teardown');
  });
}
