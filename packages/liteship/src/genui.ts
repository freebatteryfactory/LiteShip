/**
 * `liteship/genui` — the curated facade over `@liteship/genui`.
 *
 * The facade preserves referential identity: every value is a direct re-export
 * from the existing package owner, never a wrapper or second implementation.
 *
 * @module
 */

export type {
  ComponentCatalog,
  ComponentDef,
  ComponentPropDef,
  GeneratedUINode,
  GeneratedUIValidationError,
  ComponentCatalogInput,
  ValidateGeneratedUIResult,
  RenderFromCatalogOptions,
  RenderFromCatalogResult,
} from '@liteship/genui';

export {
  ContentAddress,
  defineComponentCatalog,
  validateGeneratedUITree,
  renderFromCatalog,
  catalogHash,
  renderHash,
  tryParseGeneratedUIChunk,
  DEMO_COMPONENT_CATALOG,
} from '@liteship/genui';
