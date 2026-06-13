/**
 * Demo catalog for tutorials, MCP discovery, and integration tests.
 *
 * Host apps define their own catalogs — this is not the framework's only catalog.
 *
 * @module
 */

import { defineComponentCatalog } from './catalog.js';

/** Starter demo catalog shipped with LiteShip examples and MCP registry projection. */
export const DEMO_COMPONENT_CATALOG = defineComponentCatalog({
  version: 'demo-1',
  components: {
    Card: {
      tag: 'section',
      props: {
        title: { type: 'string', required: true },
      },
      children: 'optional',
      allowedChildNames: ['Text', 'Button'],
    },
    Text: {
      tag: 'p',
      props: {
        text: { type: 'string', required: true },
      },
      children: 'none',
    },
    Button: {
      tag: 'button',
      props: {
        label: { type: 'string', required: true },
        onClick: { type: 'string' },
      },
      children: 'none',
    },
  },
});
