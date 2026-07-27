// @vitest-environment node
/** End-to-end laws for the agent-facing public-surface context command. */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  CHECK_REGISTRY,
  contextCommand,
  type ContextPayload,
  type ContextPointer,
} from '../../packages/command/src/index.js';
import {
  FACADE_LIFECYCLE_CONTRACT,
  FACADE_SUBPATH_CONTRACT,
  ROOT_EXPORT_CONTRACT,
} from '../../packages/liteship/src/export-budget.js';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const CHECK_IDS = new Set(CHECK_REGISTRY.map((entry) => entry.id));

type ContextResult = Awaited<ReturnType<typeof contextCommand.handler>>;

async function query(subject: string): Promise<{ readonly result: ContextResult; readonly payload: ContextPayload }> {
  const result = await contextCommand.handler({ name: 'context', args: { subject } }, {});
  return { result, payload: result.payload as ContextPayload };
}

function assertPhysicalPointer(pointer: ContextPointer, subject: string): void {
  expect(existsSync(resolve(REPO_ROOT, pointer.path)), `${subject}: ${pointer.path}`).toBe(true);
  expect(pointer.note.trim().length, `${subject}: empty pointer note`).toBeGreaterThan(0);
  if (pointer.kind === 'check') {
    expect(pointer.checkId, `${subject}: check pointer without id`).not.toBeNull();
    expect(CHECK_IDS.has(pointer.checkId!), `${subject}: ${pointer.checkId}`).toBe(true);
  } else {
    expect(pointer.checkId, `${subject}: non-check pointer carrying id`).toBeNull();
  }
}

function canonicalPayload(payload: ContextPayload): string {
  return JSON.stringify(payload);
}

function lifecycleAlias(operation: string): string | null {
  return operation.endsWith('.create') ? operation.slice(0, -7) : null;
}

const ALL_QUERIES = [
  ...ROOT_EXPORT_CONTRACT.map((entry) => entry.name),
  ...FACADE_SUBPATH_CONTRACT.map((entry) => entry.specifier),
  ...FACADE_LIFECYCLE_CONTRACT.flatMap((entry) => [entry.operation, lifecycleAlias(entry.operation)]).filter(
    (entry): entry is string => entry !== null,
  ),
];

describe('context --subject public-surface laws', () => {
  it('advertises one read-only, MCP-visible, JSON-oriented command contract', () => {
    expect(contextCommand.descriptor).toMatchObject({
      name: 'context',
      cli: { outputMode: 'json' },
      annotations: { readOnly: true, mcpExposed: true, group: 'setup' },
    });
    expect(contextCommand.descriptor.inputSchema).toMatchObject({
      type: 'object',
      properties: { subject: { type: 'string' } },
    });
    expect(contextCommand.descriptor.outputSchema).toMatchObject({
      type: 'object',
      required: ['task', 'subject', 'title', 'summary', 'pointers', 'publicSurface'],
    });
  });

  it('resolves every paved-road root binding through the command handler', async () => {
    for (const authored of ROOT_EXPORT_CONTRACT) {
      const { result, payload } = await query(authored.name);
      expect(result.status, authored.name).toBe('ok');
      expect(result.exitCode ?? 0, authored.name).toBe(0);
      expect(payload).toMatchObject({
        task: null,
        subject: authored.name,
        title: `${authored.name} public context`,
        summary: authored.userStory,
        publicSurface: {
          symbol: authored.name,
          specifier: 'liteship',
          owner: authored.owner,
          audience: authored.audience,
          category: authored.role,
          surfaceClass: 'paved-road',
          producer: authored.producer,
          relatedInvariant: authored.relatedInvariant,
          replacement: authored.replacement,
        },
      });
      expect(payload.pointers.length).toBeGreaterThan(2);
      for (const pointer of payload.pointers) assertPhysicalPointer(pointer, authored.name);
    }
  });

  it('resolves every advanced route by its unambiguous public specifier', async () => {
    for (const authored of FACADE_SUBPATH_CONTRACT) {
      const { result, payload } = await query(authored.specifier);
      expect(result.status, authored.specifier).toBe('ok');
      expect(payload).toMatchObject({
        task: null,
        subject: authored.specifier,
        title: `${authored.symbol} public context`,
        summary: authored.userStory,
        publicSurface: {
          symbol: authored.symbol,
          specifier: authored.specifier,
          owner: authored.owner,
          audience: authored.audience,
          category: authored.role,
          surfaceClass: 'advanced-module',
          producer: authored.producer,
          relatedInvariant: authored.relatedInvariant,
          replacement: authored.replacement,
        },
      });
      const entrypoint = payload.pointers.find((pointer) => pointer.kind === 'entrypoint');
      expect(entrypoint?.path).toBe(`packages/liteship/src/${authored.subpath.slice(2)}.ts`);
      for (const pointer of payload.pointers) assertPhysicalPointer(pointer, authored.specifier);
    }
  });

  it('keeps a root symbol authoritative while retaining a route to a colliding advanced surface', async () => {
    const collisions = FACADE_SUBPATH_CONTRACT.filter((subpath) =>
      ROOT_EXPORT_CONTRACT.some((root) => root.name === subpath.symbol),
    );
    expect(collisions.map((entry) => entry.symbol)).toEqual(['schema']);
    for (const collision of collisions) {
      const root = await query(collision.symbol);
      const advanced = await query(collision.specifier);
      expect(root.payload.publicSurface?.specifier).toBe('liteship');
      expect(root.payload.publicSurface?.surfaceClass).toBe('paved-road');
      expect(advanced.payload.publicSurface?.specifier).toBe(collision.specifier);
      expect(advanced.payload.publicSurface?.surfaceClass).toBe('advanced-module');
      expect(advanced.payload.subject).toBe(collision.specifier);
    }
  });

  it('resolves every lifecycle operation with its exact disposal law', async () => {
    for (const authored of FACADE_LIFECYCLE_CONTRACT) {
      const { result, payload } = await query(authored.operation);
      expect(result.status, authored.operation).toBe('ok');
      expect(payload.publicSurface?.allocation, authored.operation).toEqual({
        operation: authored.operation,
        specifier: authored.specifier,
        owner: authored.owner,
        classification: authored.classification,
        disposal: authored.disposal,
        postDispose: authored.postDispose,
        siblingCleanup: authored.siblingCleanup,
        proof: authored.proof,
        rationale: authored.rationale,
      });
      expect(payload.publicSurface?.proofRefs).toContain(authored.proof);
      for (const pointer of payload.pointers) assertPhysicalPointer(pointer, authored.operation);
    }
  });

  it('merges namespace allocation aliases into their advanced surface record', async () => {
    for (const authored of FACADE_LIFECYCLE_CONTRACT) {
      const alias = lifecycleAlias(authored.operation);
      if (alias === null) continue;
      const direct = await query(authored.operation);
      const merged = await query(alias);
      expect(merged.result.status, alias).toBe('ok');
      expect(merged.payload.publicSurface?.allocation).toEqual(direct.payload.publicSurface?.allocation);
      expect(merged.payload.publicSurface).toMatchObject({
        symbol: alias,
        specifier: authored.specifier,
        allocation: { operation: authored.operation },
      });
      expect(merged.payload.pointers.some((pointer) => pointer.path === authored.proof)).toBe(true);
    }
  });

  it('emits the owner contract as the first pointer for every public query', async () => {
    for (const subject of ALL_QUERIES) {
      const { payload } = await query(subject);
      expect(payload.pointers[0], subject).toEqual({
        kind: 'owner-file',
        path: 'packages/liteship/src/export-budget.ts',
        note: expect.stringContaining(payload.publicSurface!.owner),
        checkId: null,
      });
    }
  });

  it('emits the actual facade entrypoint as the second pointer', async () => {
    for (const subject of ALL_QUERIES) {
      const { payload } = await query(subject);
      const specifier = payload.publicSurface!.specifier;
      const route = specifier === 'liteship' ? 'index' : specifier.slice('liteship/'.length);
      expect(payload.pointers[1], subject).toEqual({
        kind: 'entrypoint',
        path: `packages/liteship/src/${route}.ts`,
        note: `Public import route: ${specifier}.`,
        checkId: null,
      });
    }
  });

  it('projects every proof reference into one test pointer without duplication', async () => {
    for (const subject of ALL_QUERIES) {
      const { payload } = await query(subject);
      const proofRefs = payload.publicSurface!.proofRefs;
      const testPointers = payload.pointers.filter((pointer) => pointer.kind === 'test');
      expect(
        testPointers.map((pointer) => pointer.path),
        subject,
      ).toEqual(proofRefs);
      expect(new Set(testPointers.map((pointer) => pointer.path)).size, subject).toBe(testPointers.length);
    }
  });

  it('projects every check reference into one registered check pointer', async () => {
    for (const subject of ALL_QUERIES) {
      const { payload } = await query(subject);
      const checkIds = payload.publicSurface!.checkIds;
      const checkPointers = payload.pointers.filter((pointer) => pointer.kind === 'check');
      expect(
        checkPointers.map((pointer) => pointer.checkId),
        subject,
      ).toEqual(checkIds);
      expect(new Set(checkPointers.map((pointer) => pointer.checkId)).size, subject).toBe(checkPointers.length);
    }
  });

  it('is deterministic across repeated asynchronous handler execution', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...ALL_QUERIES), fc.integer({ min: 2, max: 8 }), async (subject, count) => {
        const first = canonicalPayload((await query(subject)).payload);
        for (let index = 1; index < count; index += 1) {
          expect(canonicalPayload((await query(subject)).payload)).toBe(first);
        }
      }),
      { numRuns: 40 },
    );
  });

  it('does not mutate the generated public-surface record while building pointers', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...ALL_QUERIES), async (subject) => {
        const first = await query(subject);
        const snapshot = canonicalPayload(first.payload);
        const second = await query(subject);
        expect(canonicalPayload(first.payload)).toBe(snapshot);
        expect(canonicalPayload(second.payload)).toBe(snapshot);
        expect(second.payload).not.toBe(first.payload);
        expect(second.payload.pointers).not.toBe(first.payload.pointers);
      }),
      { numRuns: 50 },
    );
  });

  it('fails closed for arbitrary unknown identifiers', async () => {
    const known = new Set(ALL_QUERIES);
    await fc.assert(
      fc.asyncProperty(fc.stringMatching(/^[A-Za-z][A-Za-z0-9./_-]{0,35}$/u), async (subject) => {
        fc.pre(!known.has(subject));
        const { result, payload } = await query(subject);
        expect(result.status).toBe('failed');
        expect(result.exitCode ?? 0).toBeGreaterThan(0);
        expect(payload).toEqual({
          task: null,
          subject,
          title: '',
          summary: '',
          pointers: [],
          publicSurface: null,
        });
      }),
      { numRuns: 120 },
    );
  });

  it('does not trim or case-fold an unknown subject into a public binding', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ALL_QUERIES),
        fc.constantFrom('upper', 'lower', 'leading-space', 'trailing-space'),
        async (subject, mutation) => {
          const changed =
            mutation === 'upper'
              ? subject.toUpperCase()
              : mutation === 'lower'
                ? subject.toLowerCase()
                : mutation === 'leading-space'
                  ? ` ${subject}`
                  : `${subject} `;
          fc.pre(changed !== subject && !ALL_QUERIES.includes(changed));
          const { result, payload } = await query(changed);
          expect(result.status).toBe('failed');
          expect(payload.publicSurface).toBeNull();
          expect(payload.pointers).toEqual([]);
        },
      ),
      { numRuns: 80 },
    );
  });

  it('keeps task and subject selection mutually exclusive', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...ALL_QUERIES), async (subject) => {
        const result = await contextCommand.handler({ name: 'context', args: { task: 'add-boundary', subject } }, {});
        expect(result.status).toBe('failed');
        expect(result.exitCode ?? 0).toBeGreaterThan(0);
        expect(result.payload).toMatchObject({ task: 'add-boundary', subject, pointers: [], publicSurface: null });
      }),
      { numRuns: 30 },
    );
  });

  it('never returns a successful context with no pointers or no public surface', async () => {
    for (const subject of ALL_QUERIES) {
      const { result, payload } = await query(subject);
      expect(result.status).toBe('ok');
      expect(payload.publicSurface, subject).not.toBeNull();
      expect(payload.pointers.length, subject).toBeGreaterThan(0);
      expect(payload.title.trim().length, subject).toBeGreaterThan(0);
      expect(payload.summary.trim().length, subject).toBeGreaterThan(0);
    }
  });

  it('round-trips every successful context through the JSON wire without undefined fields', async () => {
    for (const subject of ALL_QUERIES) {
      const { payload } = await query(subject);
      const encoded = JSON.stringify(payload);
      expect(encoded, subject).not.toContain('undefined');
      expect(JSON.parse(encoded)).toEqual(payload);
      expect(Object.keys(JSON.parse(encoded) as object).sort()).toEqual(
        ['pointers', 'publicSurface', 'subject', 'summary', 'task', 'title'].sort(),
      );
    }
  });

  it('orders orientation before proof and proof before checks', async () => {
    for (const subject of ALL_QUERIES) {
      const kinds = (await query(subject)).payload.pointers.map((pointer) => pointer.kind);
      expect(kinds.slice(0, 2), subject).toEqual(['owner-file', 'entrypoint']);
      const tail = kinds.slice(2);
      const firstCheck = tail.indexOf('check');
      const split = firstCheck < 0 ? tail.length : firstCheck;
      expect(
        tail.slice(0, split).every((kind) => kind === 'test'),
        subject,
      ).toBe(true);
      expect(
        tail.slice(split).every((kind) => kind === 'check'),
        subject,
      ).toBe(true);
    }
  });
});
