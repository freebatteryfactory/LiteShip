/**
 * @czap/genui type spine — host-owned generated UI catalog contracts.
 */

import type { ContentAddress } from './core.d.ts';

/** Structured UI node emitted by model/runtime — references catalog components by name. */
export interface GeneratedUINode {
  readonly name: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children?: readonly GeneratedUINode[];
  readonly slots?: Readonly<Record<string, GeneratedUINode | readonly GeneratedUINode[]>>;
}

/** Prop schema entry for a catalog component. */
export interface ComponentPropDef {
  readonly type: 'string' | 'number' | 'boolean';
  readonly required?: boolean;
}

/** Catalog component definition — props and child constraints. */
export interface ComponentDef {
  readonly props: Readonly<Record<string, ComponentPropDef>>;
  readonly children?: 'none' | 'optional' | 'required';
  readonly allowedChildNames?: readonly string[];
  /** DOM tag used by the trusted renderer (defaults to `div`). */
  readonly tag?: string;
}

/** Host-registered component catalog for generated UI. */
export interface ComponentCatalog {
  readonly version: string;
  readonly catalogHash: ContentAddress;
  readonly components: Readonly<Record<string, ComponentDef>>;
}

/** Validation failure for generated UI trees. */
export interface GeneratedUIValidationError {
  readonly code: 'genui/unknown-component' | 'genui/invalid-prop' | 'genui/invalid-children' | 'genui/invalid-slots';
  readonly message: string;
  readonly path?: string;
}
