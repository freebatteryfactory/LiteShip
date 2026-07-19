/**
 * Bridge `@liteship/*` {@link Diagnostics} into Astro's integration logger.
 *
 * Runtime boundaries across `@liteship/core` / `@liteship/edge` emit operator
 * diagnostics through the swappable {@link Diagnostics} sink (e.g. the kv-cache
 * "invalid cache entry" warning, the host-adapter missing-`prefix` warning).
 * By default those go straight to `console`. Inside an Astro project we'd rather
 * they flow through Astro's own logger, so they carry the liteship label, respect
 * `astro dev --json` structured output, and land in the same stream CI and
 * agents already parse — one log stream, not two.
 *
 * The bridge REPLACES the sink (it does not also forward to `console`): Astro's
 * logger already writes to the terminal, so forwarding would double every line.
 *
 * @module
 */

import { Diagnostics } from '@liteship/core';
import type { DiagnosticEvent, DiagnosticsSink } from '@liteship/core';

/**
 * Structural shape of Astro's integration logger (`AstroIntegrationLogger`):
 * `warn` / `error` each take a single message string. Kept structural so this
 * module needs no value import from `astro`.
 */
export interface AstroLoggerLike {
  warn(message: string): void;
  error(message: string): void;
}

/** Render a diagnostic as one stable line: `<source>: <code> — <message>` (+ detail / cause). */
function formatDiagnosticLine(event: DiagnosticEvent): string {
  let line = `${event.source}: ${event.code} — ${event.message}`;
  if (event.detail !== undefined) {
    line += ` ${describeValue(event.detail)}`;
  }
  if (event.cause !== undefined) {
    line += ` (cause: ${describeValue(event.cause)})`;
  }
  return line;
}

/** Best-effort compact rendering of structured detail/cause for a log line. */
function describeValue(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Build a {@link DiagnosticsSink} that forwards every event to an Astro logger,
 * mapping `error` → `logger.error` and `warn` → `logger.warn`.
 */
export function bridgeDiagnosticsToAstroLogger(logger: AstroLoggerLike): DiagnosticsSink {
  return {
    emit(event: DiagnosticEvent): void {
      const line = formatDiagnosticLine(event);
      if (event.level === 'error') {
        logger.error(line);
      } else {
        logger.warn(line);
      }
    },
  };
}

/**
 * Install the Astro-logger bridge as the active {@link Diagnostics} sink and
 * return a restore function that reinstates the prior sink. Called once from the
 * integration's `astro:config:setup`; the bridge stays installed for the whole
 * dev/build session.
 */
export function installDiagnosticsBridge(logger: AstroLoggerLike): () => void {
  const prior = Diagnostics.setSink(bridgeDiagnosticsToAstroLogger(logger));
  return () => {
    Diagnostics.setSink(prior);
  };
}
