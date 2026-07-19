/**
 * `@liteship/genui` — host-owned generated UI catalog renderer.
 *
 * @module
 */

export type {
  ComponentCatalog,
  ComponentDef,
  ComponentPropDef,
  GeneratedUINode,
  GeneratedUIValidationError,
} from './types.js';
export { ContentAddress } from './brands.js';

export { defineComponentCatalog } from './catalog.js';
export type { ComponentCatalogInput } from './catalog.js';
export { validateGeneratedUITree } from './validate.js';
export type { ValidateGeneratedUIResult } from './validate.js';
export { renderFromCatalog } from './render.js';
export type { RenderFromCatalogOptions, RenderFromCatalogResult } from './render.js';
export { catalogHash, renderHash } from './identity.js';
export { tryParseGeneratedUIChunk } from './parse.js';
export { DEMO_COMPONENT_CATALOG } from './demo-catalog.js';
