/**
 * context command — the ORIENTED work-list an agent asks for before undertaking a
 * task in this repo. `context --task <id>` projects a {@link ContextTask} from the
 * {@link CONTEXT_MAP}: the ordered owner files, public entrypoint, relevant checks,
 * and proving tests for that task. `--json` (the CLI adapter's concern) emits the
 * same structured pointers an agent would act on.
 *
 * Pure data + lookup (no host capability, browser-safe): the CLI adapter owns
 * pretty rendering and stdout emission.
 *
 * @module
 */

import { type CapsuleCommandResult, type CommandJsonSchema, schema } from '@liteship/core';
import { defineCommand, failed, ok } from '../registry.js';
import { CONTEXT_MAP, CONTEXT_TASK_IDS, type ContextPointer } from './context-map.js';

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
    task: { type: 'string' },
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
  },
  required: ['task', 'title', 'summary', 'pointers'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by the context command. */
export type ContextPayload = {
  readonly task: string;
  readonly title: string;
  readonly summary: string;
  readonly pointers: readonly ContextPointer[];
};

/** The context command: descriptor + handler returning a structured result. */
export const contextCommand = defineCommand({
  descriptor: {
    name: 'context',
    summary: 'Get the ordered file/check/test pointers for a repo task (add-boundary, release, extend-cli, …).',
    inputSchema: {
      type: 'object',
      required: ['task'],
      properties: { task: { type: 'string', enum: [...CONTEXT_TASK_IDS] } },
    } as const satisfies CommandJsonSchema,
    outputSchema: ContextPayloadSchema,
    annotations: { readOnly: true, mcpExposed: true, group: 'setup' },
  },
  argsSchema: schema.struct({ task: schema.string }),
  handler: async (invocation): Promise<CapsuleCommandResult<ContextPayload>> => {
    const { task } = invocation.args;
    const entry = CONTEXT_MAP[task];
    if (entry === undefined) {
      return failed('context', { task, title: '', summary: '', pointers: [] }, 1);
    }
    return ok('context', { task, title: entry.title, summary: entry.summary, pointers: entry.pointers });
  },
});
