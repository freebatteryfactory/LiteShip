/** Event-specific GitHub authority job requirements folded by delivery evidence admission. @module */

import type { DeliveryCiEvent } from './ci-evidence-selection.js';

const EXHAUSTIVE = ['exhaustive-analysis', 'exhaustive-mutation', 'exhaustive-mcdc'] as const;

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

/** Exact workflow job ids whose successful conclusions establish the event's CI authority. */
export function requiredAuthorityJobs(input: {
  readonly event: DeliveryCiEvent;
  readonly ref: string;
  readonly browserAffected: boolean;
}): readonly string[] {
  if (input.event === 'pull_request') {
    return uniqueSorted([
      'format',
      'pr-affected',
      'pr-windows-affected',
      ...(input.browserAffected ? ['pr-browser-affected'] : []),
    ]);
  }
  const exhaustive =
    input.event === 'schedule' || input.event === 'workflow_dispatch' || input.ref.startsWith('refs/tags/v');
  if (input.event === 'schedule' || input.event === 'workflow_dispatch') {
    return uniqueSorted([
      'format',
      'truth-linux',
      'browser-e2e',
      'windows-smoke',
      'rust-wasm-parity',
      ...(exhaustive ? EXHAUSTIVE : []),
    ]);
  }
  return uniqueSorted([
    'format',
    'truth-linux-parallel',
    'browser-e2e',
    'windows-smoke',
    'rust-wasm-parity',
    ...(exhaustive ? EXHAUSTIVE : []),
  ]);
}
