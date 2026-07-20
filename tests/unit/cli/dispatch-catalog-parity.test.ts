/**
 * Dispatch ↔ catalog parity (P10). The CLI dispatch table is a PROJECTION of the
 * one canonical command catalog in @liteship/command — never a parallel,
 * hand-rolled switch that can silently drift.
 *
 * This locks three laws:
 *  (a) every catalog command has a dispatch route — CLI_EXECUTORS covers every
 *      cli-orchestration descriptor, and every handler command's verb resolves;
 *  (b) no verb exists in dispatch that is not in the catalog;
 *  (c) the catalog `inputSchema` is the single source of each verb's flags.
 *
 * It reads the dispatch tables through a read-only introspection seam
 * (`cliExecutorNames` / `dispatchableTopLevelVerbs` / `resolveDispatchExecutor`),
 * so the assertion is over the REAL tables, not a copy.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { COMMAND_CATALOG } from '@liteship/command';
import type { CapsuleCommandDescriptor } from '@liteship/core';
import {
  cliExecutorNames,
  dispatchableTopLevelVerbs,
  resolveDispatchExecutor,
} from '../../../packages/cli/src/dispatch.js';

const topLevel = (name: string): string => name.split('.')[0]!;
const catalogNames = COMMAND_CATALOG.map((d) => d.name);
const catalogTopLevel = [...new Set(catalogNames.map(topLevel))];

describe('dispatch ↔ catalog parity — dispatch is a projection of the catalog', () => {
  describe('(a) every catalog command has a dispatch route', () => {
    it('CLI_EXECUTORS covers every cli-orchestration descriptor', () => {
      const cliOwned = COMMAND_CATALOG.filter((d) => d.executionKind === 'cli-orchestration').map((d) => d.name);
      const executors = new Set(cliExecutorNames());
      const uncovered = cliOwned.filter((name) => !executors.has(name));
      expect(uncovered, `cli-orchestration commands with no CLI executor: ${uncovered.join(', ')}`).toEqual([]);
    });

    it('every handler-backed command resolves to a dispatch executor (via its top-level verb)', () => {
      const handlers = COMMAND_CATALOG.filter((d) => d.executionKind === 'handler').map((d) => d.name);
      const unrouted = handlers.filter((name) => !resolveDispatchExecutor(topLevel(name)));
      expect(unrouted, `handler commands with no dispatch route: ${unrouted.join(', ')}`).toEqual([]);
    });

    it('every catalog top-level verb resolves (the module-load coverage assertion, made explicit)', () => {
      const unresolved = catalogTopLevel.filter((verb) => !resolveDispatchExecutor(verb));
      expect(unresolved, `catalog verbs with no executor: ${unresolved.join(', ')}`).toEqual([]);
    });
  });

  describe('(b) dispatch declares no verb outside the catalog', () => {
    it('every dispatchable top-level verb is a catalog top-level verb', () => {
      const extra = dispatchableTopLevelVerbs().filter((verb) => !catalogTopLevel.includes(verb));
      expect(extra, `dispatch verbs absent from the catalog: ${extra.join(', ')}`).toEqual([]);
    });

    it('every CLI executor name is a catalog command name (no orphan CLI executor)', () => {
      const names = new Set(catalogNames);
      const orphan = cliExecutorNames().filter((name) => !names.has(name));
      expect(orphan, `CLI executors with no catalog descriptor: ${orphan.join(', ')}`).toEqual([]);
    });

    it('a fabricated verb never resolves (the negative case proves the resolver is not vacuously true)', () => {
      expect(resolveDispatchExecutor('__no_such_verb__')).toBe(false);
    });
  });

  describe('(c) the catalog inputSchema is the single source of each verb flag set', () => {
    const descriptor = (name: string): CapsuleCommandDescriptor => {
      const d = COMMAND_CATALOG.find((c) => c.name === name);
      expect(d, `no catalog descriptor for ${name}`).toBeDefined();
      return d!;
    };
    const props = (name: string): Record<string, unknown> =>
      (descriptor(name).inputSchema as { properties?: Record<string, unknown> }).properties ?? {};

    it('doctor flags (fix/ci/preflight/target) live in the catalog inputSchema', () => {
      expect(Object.keys(props('doctor')).sort()).toEqual(['ci', 'fix', 'preflight', 'target']);
    });

    it('completion pins its required shell flag in the catalog inputSchema', () => {
      const d = descriptor('completion');
      expect((d.inputSchema as { required?: readonly string[] }).required).toEqual(['shell']);
      expect(Object.keys(props('completion'))).toEqual(['shell']);
    });

    it('dev flags (example/tutorial) live in the catalog inputSchema', () => {
      expect(Object.keys(props('dev')).sort()).toEqual(['example', 'tutorial']);
    });
  });
});
