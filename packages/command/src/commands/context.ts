/**
 * context command — the ORIENTED work-list an agent asks for before undertaking a
 * task in this repo. `context --task <id>` projects a {@link ContextTask} from the
 * {@link CONTEXT_MAP}; `context --subject <symbol>` projects the curated facade's
 * owner, route, lifecycle, failure, checks, and proof references. `--json` (the
 * CLI adapter's concern) emits the same structured pointers an agent would act on.
 *
 * Pure data + lookup (no host capability, browser-safe): the CLI adapter owns
 * pretty rendering and stdout emission.
 *
 * @module
 */

import { type CapsuleCommandResult, type CommandJsonSchema, schema } from '@liteship/core';
import { defineCommand, failed, ok } from '../registry.js';
import { CONTEXT_MAP, CONTEXT_TASK_IDS, type ContextPointer } from './context-map.js';
import {
  PublicSymbolContextSchema,
  publicSurfaceForSymbol,
  type PublicSymbolContext,
} from './public-surface-context.js';

export type { ContextPointer, ContextPointerKind, ContextTask } from './context-map.js';
export { CONTEXT_MAP, CONTEXT_TASK_IDS } from './context-map.js';

/**
 * The descriptor `outputSchema` for the context command — hand-written JSON-Schema.
 * {@link ContextPayload} is its plain-TS mirror; the `pointers` element mirrors
 * {@link ContextPointer}.
 */
export const ContextPayloadSchema = {
  type: 'object',
  properties: {
    task: { type: ['string', 'null'] },
    subject: { type: ['string', 'null'] },
    title: { type: 'string' },
    summary: { type: 'string' },
    pointers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { enum: ['owner-file', 'entrypoint', 'check', 'test', 'doc'] },
          path: { type: 'string' },
          note: { type: 'string' },
          checkId: { type: ['string', 'null'] },
        },
        required: ['kind', 'path', 'note', 'checkId'],
      },
    },
    publicSurface: PublicSymbolContextSchema,
  },
  required: ['task', 'subject', 'title', 'summary', 'pointers', 'publicSurface'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by the context command. */
export type ContextPayload = {
  readonly task: string | null;
  readonly subject: string | null;
  readonly title: string;
  readonly summary: string;
  readonly pointers: readonly ContextPointer[];
  readonly publicSurface: PublicSymbolContext | null;
};

function subjectPointers(surface: PublicSymbolContext): readonly ContextPointer[] {
  const route = surface.specifier === 'liteship' ? 'index' : surface.specifier.slice('liteship/'.length);
  const pointers: ContextPointer[] = [
    {
      kind: 'owner-file',
      path: 'packages/liteship/src/export-budget.ts',
      note: `${surface.owner} owns the semantic contract projected through the facade budget.`,
      checkId: null,
    },
    {
      kind: 'entrypoint',
      path: `packages/liteship/src/${route}.ts`,
      note: `Public import route: ${surface.specifier}.`,
      checkId: null,
    },
  ];
  for (const proof of surface.proofRefs) {
    pointers.push({ kind: 'test', path: proof, note: `Proof for ${surface.symbol}.`, checkId: null });
  }
  for (const checkId of surface.checkIds) {
    pointers.push({
      kind: 'check',
      path: 'packages/command/src/checks/registry.ts',
      note: `${checkId} carries the registered verification claim.`,
      checkId,
    });
  }
  return pointers;
}

/** The context command: descriptor + handler returning a structured result. */
export const contextCommand = defineCommand({
  descriptor: {
    name: 'context',
    summary: 'Get ordered owner/check/proof context for a repo task or curated public symbol.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', enum: [...CONTEXT_TASK_IDS] },
        subject: { type: 'string' },
      },
    } as const satisfies CommandJsonSchema,
    outputSchema: ContextPayloadSchema,
    annotations: { readOnly: true, mcpExposed: true, group: 'setup' },
  },
  argsSchema: schema.struct({ task: schema.optional(schema.string), subject: schema.optional(schema.string) }),
  handler: async (invocation): Promise<CapsuleCommandResult<ContextPayload>> => {
    const { task, subject } = invocation.args;
    if ((task === undefined) === (subject === undefined)) {
      return failed(
        'context',
        { task: task ?? null, subject: subject ?? null, title: '', summary: '', pointers: [], publicSurface: null },
        1,
      );
    }
    if (task !== undefined) {
      const entry = CONTEXT_MAP[task];
      if (entry === undefined) {
        return failed('context', { task, subject: null, title: '', summary: '', pointers: [], publicSurface: null }, 1);
      }
      return ok('context', {
        task,
        subject: null,
        title: entry.title,
        summary: entry.summary,
        pointers: entry.pointers,
        publicSurface: null,
      });
    }

    const publicSurface = publicSurfaceForSymbol(subject!);
    if (publicSurface === null) {
      return failed(
        'context',
        { task: null, subject: subject!, title: '', summary: '', pointers: [], publicSurface: null },
        1,
      );
    }
    return ok('context', {
      task: null,
      subject: subject!,
      title: `${publicSurface.symbol} public context`,
      summary: publicSurface.userStory,
      pointers: subjectPointers(publicSurface),
      publicSurface,
    });
  },
});
