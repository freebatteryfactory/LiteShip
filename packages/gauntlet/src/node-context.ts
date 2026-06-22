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
import type { MutationFacts } from './mutation-facts.js';
import type { SimulationFacts } from './simulation-facts.js';
import type { TraceabilityFacts } from './traceability-facts.js';

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
 * The optional `mutation` is the INJECTED mutation-facts capability (Slice C, the
 * avionics tier — mutation-as-divergence): a host (`@czap/audit`'s mutation engine +
 * the CLI's per-mutant vitest runner) generates the mutants, evaluates each, and
 * folds the verdicts into {@link MutationFacts}, then threads them through so the
 * `mutationDivergenceGate` can fold them. Same lean-engine pattern as `ir` /
 * `supplyChain` — the gauntlet RECEIVES the facts, never computes them. Omitted ⇒
 * absent (the default `--ir` run, where mutation is opt-in via `--mutate`).
 *
 * The optional `simulation` is the INJECTED DST (deterministic-simulation) facts
 * capability (the avionics tier — the determinism spine): a host (the CLI's
 * `czap check --ir --simulate` path) drives the scenario corpus through the
 * `@czap/core/simulation` harness (replaying each seed twice, content-addressing the
 * two byte-exact traces) and folds the verdicts into {@link SimulationFacts}, then
 * threads them through so the `simulationDeterminismGate` can fold them. Same
 * lean-engine pattern as `ir` / `supplyChain` / `mutation` — the gauntlet RECEIVES
 * the facts, never mints a world or runs a scenario. Omitted ⇒ absent (the default
 * `--ir` run, where simulation is opt-in via `--simulate`).
 *
 * @param ir Optional pre-built repo-IR to inject onto the context.
 * @param supplyChain Optional pre-computed supply-chain facts to inject.
 * @param mutation Optional pre-computed mutation facts to inject.
 * @param simulation Optional pre-computed DST (simulation) facts to inject.
 *
 * The optional `traceability` is the INJECTED requirements-traceability facts
 * capability (the avionics-tier ledger): a host (the CLI's
 * `packages/cli/src/lib/traceability.ts` state machine) parses `traceability/*.yaml`,
 * scans the corpus for `// PROVES:` headers, runs the lifecycle fold against the
 * injected wall-clock date, and folds the verdicts into {@link TraceabilityFacts},
 * then threads them through so the `traceabilityBridgeGate` can fold them. Same
 * lean-engine pattern as `ir` / `supplyChain` / `mutation` / `simulation` — the
 * gauntlet RECEIVES the facts, never parses YAML or reads a clock. Omitted ⇒ absent.
 *
 * @param traceability Optional pre-computed requirements-traceability facts to inject.
 */
export function nodeContext(
  repoRoot: string,
  globs: readonly string[],
  ir?: RepoIR,
  supplyChain?: SupplyChainFacts,
  mutation?: MutationFacts,
  simulation?: SimulationFacts,
  traceability?: TraceabilityFacts,
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
    // Thread the injected mutation facts through (Slice C); omit when absent.
    ...(mutation !== undefined ? { mutation } : {}),
    // Thread the injected DST (simulation) facts through (the determinism spine);
    // omit when absent (the default `--ir` run — simulation is opt-in via `--simulate`).
    ...(simulation !== undefined ? { simulation } : {}),
    // Thread the injected requirements-traceability facts through (the avionics-tier
    // ledger); omit when absent (the lean path, where the host computes no facts).
    ...(traceability !== undefined ? { traceability } : {}),
  };
}
