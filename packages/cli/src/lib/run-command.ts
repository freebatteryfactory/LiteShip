/**
 * runCliCommand — the ONE projection helper every finite CLI command routes
 * through (ceremony wave). It builds the shared Node host context
 * (`createNodeCommandContext`, with the adapter's capability overrides merged
 * over the shared defaults), dispatches the invocation against the canonical
 * registry, and owns the two projection arms:
 *
 *   - a structured FAILURE becomes an `emitError(name, message, hint?)` to
 *     stderr and returns the result's `exitCode` (default 1);
 *   - a SUCCESS is handed to the caller's `projectOk`, which renders the command's
 *     stdout receipt and returns an exit code (default 0 when it returns void).
 *
 * `name` is a `keyof CommandMap`, so `dispatch` returns
 * `CapsuleCommandResult<CommandMap[name]>` — `projectOk` receives the command's
 * TYPED payload with no cast at the call site. This replaces the per-command
 * hand-written `CommandContext` factories (with their verbatim `manifestSource`
 * copies) and the `result.payload as {…}` casts each adapter used to carry.
 *
 * @module
 */
import type { CapsuleCommandResult, CommandMap } from '@liteship/command';
import { CommandDispatcher, commandRegistry } from '@liteship/command';
import { createNodeCommandContext } from '@liteship/command/host';
import { emitError } from '../receipts.js';

/** The single dispatcher over the canonical registry (the CLI's projection edge). */
const dispatcher = CommandDispatcher.make(commandRegistry);

/**
 * The payload `dispatch` resolves for a command name — the SAME conditional the
 * dispatcher's return type uses (`keyof CommandMap` name → its typed payload; a
 * bare `string` → `unknown`). Declared here so `projectCliResult`/`runCliCommand`
 * line up structurally with `dispatch` for a generic `N`; at a concrete call site
 * (a literal name) it resolves to that command's payload type.
 */
type DispatchPayload<N extends string> = N extends keyof CommandMap ? CommandMap[N] : unknown;

/**
 * The structural failure envelope every dispatcher/handler failure carries
 * (`unknown_command` / `no_registry_handler` / `invalid_args` /
 * `capability_unavailable` and every handler's domain failure). Read defensively
 * — `error`/`hint` are the two fields the CLI surfaces.
 */
interface CommandFailurePayload {
  readonly error?: unknown;
  readonly hint?: unknown;
}

/**
 * Route a resolved {@link CapsuleCommandResult} to its CLI projection. Pure over
 * the result (the only I/O is the caller's `projectOk` emit + `emitError`), so it
 * is the unit-testable core of {@link runCliCommand}. A `failed` result becomes a
 * structured `emitError` (message + optional hint) returning `exitCode ?? 1`; an
 * `ok` result is handed to `projectOk`, whose return (or 0 when it returns void)
 * is the process exit code.
 */
export function projectCliResult<N extends string>(
  name: N,
  result: CapsuleCommandResult<DispatchPayload<N>>,
  projectOk: (payload: DispatchPayload<N>, result: CapsuleCommandResult<DispatchPayload<N>>) => number | void,
): number {
  if (result.status === 'failed') {
    const payload = result.payload as CommandFailurePayload;
    const message = typeof payload.error === 'string' ? payload.error : `${name} failed`;
    const hint = typeof payload.hint === 'string' ? payload.hint : undefined;
    emitError(name, message, hint);
    return result.exitCode ?? 1;
  }
  // `payload` is structurally optional on the result type (only some commands set
  // it); an `ok` result with none is a handler-contract violation, so surface it
  // structurally rather than projecting a hole. Past the guard the projection
  // receives the command's typed, present payload with no cast.
  const { payload } = result;
  if (payload === undefined) {
    emitError(name, `${name} returned no payload`);
    return 1;
  }
  const code = projectOk(payload, result);
  return typeof code === 'number' ? code : 0;
}

/**
 * Build the host context, dispatch `name(args)`, and project the result. `opts`
 * are the {@link createNodeCommandContext} options (`cwd` + capability `overrides`
 * merged over the shared host defaults), so a CLI adapter is
 * `runCliCommand(name, args, { cwd, overrides }, projectOk)` — no hand-written
 * `CommandContext` literal, no `payload as …` cast.
 */
export async function runCliCommand<N extends keyof CommandMap>(
  name: N,
  args: Readonly<Record<string, unknown>>,
  opts: Parameters<typeof createNodeCommandContext>[0],
  projectOk: (payload: DispatchPayload<N>, result: CapsuleCommandResult<DispatchPayload<N>>) => number | void,
): Promise<number> {
  const result = await dispatcher.dispatch({ name, args }, createNodeCommandContext(opts));
  return projectCliResult(name, result, projectOk);
}
