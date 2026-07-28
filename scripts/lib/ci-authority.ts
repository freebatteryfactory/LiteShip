/** Event-specific GitHub authority job requirements folded by delivery evidence admission. @module */

import type { DeliveryCiEvent } from './ci-evidence-selection.js';

const EXHAUSTIVE = [
  'exhaustive-analysis',
  'exhaustive-mutation',
  'exhaustive-mcdc',
  'semantic-assurance-admission',
] as const;

/** Release claims that must be proven before merge and reproduced after merge. */
const RELEASE_CANDIDATE = [
  'format',
  'truth-linux-parallel',
  'browser-e2e',
  'windows-smoke',
  'macos-smoke',
  'macos-browser',
  'rust-wasm-parity',
  'security-audit',
] as const;

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

/** Exact workflow job ids whose successful conclusions establish the event's CI authority. */
export function requiredAuthorityJobs(input: {
  readonly event: DeliveryCiEvent;
  readonly ref: string;
  readonly browserAffected: boolean;
  readonly rustWasmAffected: boolean;
}): readonly string[] {
  if (input.event === 'pull_request') {
    return uniqueSorted([
      ...RELEASE_CANDIDATE,
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
      'macos-smoke',
      'macos-browser',
      'rust-wasm-parity',
      'security-audit',
      ...(exhaustive ? EXHAUSTIVE : []),
    ]);
  }
  return uniqueSorted([...RELEASE_CANDIDATE, ...(exhaustive ? EXHAUSTIVE : [])]);
}
