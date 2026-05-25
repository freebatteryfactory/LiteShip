/**
 * MCP prompt projection (CUT D3) — exactly two registry-backed prompts. Each
 * renders deterministic messages from the canonical command catalog; neither
 * invents prose or assumes a UI/widget surface.
 *
 *   - `liteship.command.inspect` (arg `command`): explains any catalog command
 *     from its descriptor (name, summary, executionKind, mcpExposed, schemas).
 *   - `liteship.tool.use` (arg `tool`): explains how to call an MCP-EXPOSED tool,
 *     referencing the D1 result envelope + the D2 outputSchema. Rejects a
 *     CLI-owned (non-exposed) command.
 *
 * No `liteship.schema.explain` (no stored plain-English schema prose to back it —
 * it would be authored theater, not a projection). No one-prompt-per-tool (that
 * just restates `tools/list`).
 *
 * @module
 */
import { COMMAND_CATALOG, mcpExposedDescriptors } from '@czap/command';
import type { CapsuleCommandDescriptor } from '@czap/core';
import { InvalidParamsError } from './errors.js';

/** An MCP prompt argument descriptor. */
export interface McpPromptArgument {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
}

/** An MCP prompt descriptor as emitted by `prompts/list`. */
export interface McpPrompt {
  readonly name: string;
  readonly description: string;
  readonly arguments: readonly McpPromptArgument[];
}

/** The `prompts/get` result: a description + a deterministic message sequence (text content only). */
export interface GetPromptResult {
  readonly description: string;
  readonly messages: ReadonlyArray<{ readonly role: 'user'; readonly content: { readonly type: 'text'; readonly text: string } }>;
}

const PROMPTS: readonly McpPrompt[] = [
  {
    name: 'liteship.command.inspect',
    description: 'Explain a LiteShip command from its canonical registry descriptor.',
    arguments: [{ name: 'command', description: 'Canonical command id to inspect (e.g. scene.render).', required: true }],
  },
  {
    name: 'liteship.tool.use',
    description: 'Explain how to call an MCP-exposed LiteShip tool, including its result envelope.',
    arguments: [{ name: 'tool', description: 'MCP-exposed tool name (e.g. asset.analyze).', required: true }],
  },
];

/** The two registry-backed prompts, in stable order. */
export function listPrompts(): readonly McpPrompt[] {
  return PROMPTS;
}

/** Resolve a prompt by name. Unknown prompt / missing / invalid argument → {@link InvalidParamsError} (-32602). */
export function getPrompt(name: string, args: Readonly<Record<string, unknown>>): GetPromptResult {
  switch (name) {
    case 'liteship.command.inspect':
      return inspectCommand(args);
    case 'liteship.tool.use':
      return useTool(args);
    default:
      throw new InvalidParamsError(`unknown prompt: ${name}`, { name });
  }
}

function userMessage(text: string): GetPromptResult['messages'][number] {
  return { role: 'user', content: { type: 'text', text } };
}

function inspectCommand(args: Readonly<Record<string, unknown>>): GetPromptResult {
  const command = typeof args.command === 'string' ? args.command : undefined;
  if (command === undefined) {
    throw new InvalidParamsError('liteship.command.inspect requires { command: string }', { received: args });
  }
  const descriptor = COMMAND_CATALOG.find((d) => d.name === command);
  if (!descriptor) throw new InvalidParamsError(`unknown command: ${command}`, { command });
  return { description: `Inspect the LiteShip command ${command}.`, messages: [userMessage(renderCommand(descriptor))] };
}

function useTool(args: Readonly<Record<string, unknown>>): GetPromptResult {
  const tool = typeof args.tool === 'string' ? args.tool : undefined;
  if (tool === undefined) {
    throw new InvalidParamsError('liteship.tool.use requires { tool: string }', { received: args });
  }
  // Only MCP-exposed tools are callable over MCP — an unknown name OR a CLI-owned
  // (non-exposed) command both fail here as invalid params.
  const descriptor = mcpExposedDescriptors().find((d) => d.name === tool);
  if (!descriptor) throw new InvalidParamsError(`not an MCP-exposed tool: ${tool}`, { tool });
  return { description: `How to call the MCP tool ${tool}.`, messages: [userMessage(renderTool(descriptor))] };
}

function renderCommand(d: CapsuleCommandDescriptor): string {
  const execution =
    d.executionKind === 'handler' ? 'handler (structured, handler-backed)' : 'cli-orchestration (CLI-owned)';
  return [
    `Command: ${d.name}`,
    `Description: ${d.summary}`,
    `Execution: ${execution}`,
    `MCP-exposed: ${d.annotations?.mcpExposed === true ? 'yes' : 'no'}`,
    `Input schema: ${JSON.stringify(d.inputSchema)}`,
    `Output schema: ${d.outputSchema ? JSON.stringify(d.outputSchema) : '(none — not handler-backed)'}`,
    '',
    'Explain what this command does and how to invoke it. Use only this contract; do not invent behavior or external documentation.',
  ].join('\n');
}

function renderTool(d: CapsuleCommandDescriptor): string {
  return [
    `MCP tool: ${d.name}`,
    `Description: ${d.summary}`,
    `Input schema: ${JSON.stringify(d.inputSchema)}`,
    `Output schema: ${d.outputSchema ? JSON.stringify(d.outputSchema) : '(none)'}`,
    '',
    'Call this tool via MCP tools/call. Result envelope: the tool payload is returned in `structuredContent` ' +
      '(described by the output schema above); a LiteShip receipt rides in `_meta["liteship/result"]`; ' +
      '`content[0].text` is a JSON mirror of the payload. Explain how to call this tool with valid arguments. ' +
      'Assume no UI or widget surface.',
  ].join('\n');
}
