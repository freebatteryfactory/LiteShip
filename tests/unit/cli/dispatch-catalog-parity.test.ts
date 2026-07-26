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
 * (`cliExecutorNames` / `dispatchableTopLevelVerbs` / `hasDispatchExecutor`),
 * so the assertion is over the REAL tables, not a copy.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { COMMAND_CATALOG } from '@liteship/command';
import type { CapsuleCommandDescriptor } from '@liteship/core';
import {
  catalogCliFlagNames,
  cliExecutorNames,
  dispatchableTopLevelVerbs,
  hasDispatchExecutor,
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
      const unrouted = handlers.filter((name) => !hasDispatchExecutor(topLevel(name)));
      expect(unrouted, `handler commands with no dispatch route: ${unrouted.join(', ')}`).toEqual([]);
    });

    it('every catalog top-level verb resolves (the module-load coverage assertion, made explicit)', () => {
      const unresolved = catalogTopLevel.filter((verb) => !hasDispatchExecutor(verb));
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
      expect(hasDispatchExecutor('__no_such_verb__')).toBe(false);
    });
  });

  describe('(c) the catalog owns the complete CLI flag projection', () => {
    const descriptor = (name: string): CapsuleCommandDescriptor => {
      const d = COMMAND_CATALOG.find((c) => c.name === name);
      expect(d, `no catalog descriptor for ${name}`).toBeDefined();
      return d!;
    };
    const props = (name: string): Record<string, unknown> =>
      (descriptor(name).inputSchema as { properties?: Record<string, unknown> }).properties ?? {};

    it('doctor flags, including deployed probing, live in the catalog inputSchema', () => {
      expect(Object.keys(props('doctor')).sort()).toEqual(['ci', 'deployed', 'fix', 'preflight', 'target']);
    });

    it('completion pins its required positional shell in the catalog contract', () => {
      const d = descriptor('completion');
      expect((d.inputSchema as { required?: readonly string[] }).required).toEqual(['shell']);
      expect(Object.keys(props('completion'))).toEqual(['shell']);
      expect(d.cli?.positionals).toEqual(['shell']);
      expect(catalogCliFlagNames('completion')).toEqual([]);
    });

    it('dev flags (example/tutorial) live in the catalog inputSchema', () => {
      expect(Object.keys(props('dev')).sort()).toEqual(['example', 'tutorial']);
    });

    it.each([
      [
        'check',
        [
          '--capability-gate',
          '--composition',
          '--cure',
          '--ir',
          '--json',
          '--mcdc',
          '--mutate',
          '--no-cache',
          '--plan',
          '--profile',
          '--proof',
          '--simulate',
          '--spine-relation',
          '--supply-chain',
          '--symbols',
          '--taint',
        ],
      ],
      ['doctor', ['--ci', '--deployed', '--fix', '--preflight', '--target']],
      ['package-smoke', ['--artifact-dir', '--hermetic']],
      ['scene.render', ['--force', '--output', '-o']],
      ['asset.analyze', ['--force', '--projection']],
      ['audit', ['--consumer', '--consumer-app', '--findings', '--profile']],
      ['explain', ['--json']],
      ['context', ['--json', '--subject', '--task']],
    ] as const)('%s projects every parsed CLI flag from its descriptor', (name, expected) => {
      expect([...catalogCliFlagNames(name)].sort()).toEqual([...expected].sort());
    });

    it('forbids raw flag literals at dispatch parser call sites', () => {
      const path = resolve(process.cwd(), 'packages/cli/src/dispatch.ts');
      const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
      const violations: string[] = [];

      const inspect = (node: ts.Node): void => {
        if (ts.isCallExpression(node)) {
          const callee = node.expression;
          if (ts.isIdentifier(callee) && callee.text === 'takeFlagValue') {
            const flagArg = node.arguments[1];
            if (
              flagArg === undefined ||
              !ts.isCallExpression(flagArg) ||
              !ts.isIdentifier(flagArg.expression) ||
              !['catalogFlag', 'catalogFlagSpellings'].includes(flagArg.expression.text)
            ) {
              violations.push(`takeFlagValue at ${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
            }
          }
          if (ts.isIdentifier(callee) && callee.text === 'firstUnknownFlag') {
            const flagArg = node.arguments[1];
            if (
              flagArg === undefined ||
              !ts.isCallExpression(flagArg) ||
              !ts.isIdentifier(flagArg.expression) ||
              flagArg.expression.text !== 'catalogCliFlagNames'
            ) {
              violations.push(`firstUnknownFlag at ${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
            }
          }
          if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'includes') {
            const flagArg = node.arguments[0];
            if (flagArg !== undefined && ts.isStringLiteral(flagArg) && flagArg.text.startsWith('--')) {
              violations.push(
                `raw includes(${flagArg.text}) at ${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`,
              );
            }
          }
        }
        ts.forEachChild(node, inspect);
      };
      inspect(source);

      expect(violations).toEqual([]);
    });
  });

  describe('(d) every command declares its default stdout contract', () => {
    it('partitions the catalog into JSON, text, and process modes', () => {
      const byMode = (mode: 'json' | 'text' | 'process'): string[] =>
        COMMAND_CATALOG.filter((descriptor) => descriptor.cli?.outputMode === mode).map(
          (descriptor) => descriptor.name,
        );

      expect(COMMAND_CATALOG.filter((descriptor) => descriptor.cli === undefined)).toEqual([]);
      expect(byMode('text').sort()).toEqual(['completion', 'help']);
      expect(byMode('process').sort()).toEqual(['dev', 'gauntlet', 'lsp', 'mcp', 'scene.dev']);
      expect(byMode('json').length + byMode('text').length + byMode('process').length).toBe(COMMAND_CATALOG.length);
    });
  });
});
