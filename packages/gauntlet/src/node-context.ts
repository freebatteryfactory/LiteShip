/**
 * The real-filesystem {@link GateContext} — the one bridge from the pure core to
 * the actual repo.
 *
 * Everything else in `@czap/gauntlet` (finding / gate / engine / assurance /
 * authority) is deliberately filesystem-free: a gate reads ONLY through a
 * {@link GateContext}, so it runs against an in-memory fixture and against the
 * real tree unchanged. This module is the SOLE place that touches `node:fs` and
 * `fast-glob`; quarantining the I/O here keeps the core unit-testable in any
 * environment (no disk, no globber) and keeps the gates portable.
 *
 * The file list is globbed ONCE, eagerly, and sorted — deterministic ordering is
 * a hard requirement (the same repo state must yield the same findings in the
 * same order). No `Date.now()`, no `Math.random()`, no lazy re-scan that could
 * drift mid-run.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fg from 'fast-glob';
import type { GateContext } from './gate.js';
import type { RepoIR } from './repo-ir.js';
import type { SupplyChainFacts } from './supply-chain-facts.js';

/**
 * A {@link GateContext} backed by the filesystem at `repoRoot`, scoped to the
 * files matched by `globs`.
 *
 * - `files()` returns the repo-relative paths matched by `globs` (sync glob with
 *   `cwd: repoRoot`, `node_modules` + `dist` ignored, dotfiles excluded),
 *   computed once eagerly and sorted for deterministic ordering.
 * - `readFile(rel)` reads `repoRoot/rel` as UTF-8, or returns `undefined` when
 *   the file is absent (ENOENT only — any other error rethrows; no silent catch).
 * - `repoRoot` is returned verbatim.
 *
 * The optional `ir` is the INJECTED repo-IR capability (Slice B): a host (the
 * CLI, via `@czap/audit`'s `ts.Program`) builds it and threads it through so an
 * IR-fold gate can read `context.ir`. The gauntlet stays lean — it RECEIVES the
 * IR, never builds one. When omitted, `ir` is absent and regex gates run
 * unchanged (back-compat).
 *
 * The optional `supplyChain` is the INJECTED supply-chain facts capability
 * (Slice C, the avionics tier): a host (the CLI's `@czap/cli` analyzer) parses
 * the lockfile, builds the SBOM, decodes the ShipCapsule, and scans the
 * workflows, then threads the decided {@link SupplyChainFacts} through so the
 * `supplyChainGate` can fold them. Same lean-engine pattern as `ir` — the
 * gauntlet RECEIVES the facts, never computes them. Omitted ⇒ absent.
 *
 * @param repoRoot Absolute root the gate's paths resolve against.
 * @param globs Repo-relative glob patterns selecting the gate's file scope.
 * @param ir Optional pre-built repo-IR to inject onto the context.
 * @param supplyChain Optional pre-computed supply-chain facts to inject.
 */
export function nodeContext(
  repoRoot: string,
  globs: readonly string[],
  ir?: RepoIR,
  supplyChain?: SupplyChainFacts,
): GateContext {
  // Glob ONCE, eagerly, and sort — a stable, deterministic file list for the
  // whole run. `dot: false` matches the contract; node_modules + dist never
  // count as repo source.
  const matched = fg.sync([...globs], {
    cwd: repoRoot,
    ignore: ['**/node_modules/**', '**/dist/**'],
    dot: false,
  });
  const files = [...matched].sort();

  return {
    repoRoot,
    files: (): readonly string[] => files,
    readFile: (relativePath: string): string | undefined => {
      try {
        return readFileSync(resolve(repoRoot, relativePath), 'utf8');
      } catch (error) {
        // Absent file → undefined (the contract). Anything else (EACCES, EISDIR,
        // …) is a real fault and must surface — no silent swallow.
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
      }
    },
    // Thread the injected IR through; omit the key entirely when none was
    // supplied so the context shape stays minimal (an IR-free run is identical).
    ...(ir !== undefined ? { ir } : {}),
    // Thread the injected supply-chain facts through (Slice C); omit when absent.
    ...(supplyChain !== undefined ? { supplyChain } : {}),
  };
}
