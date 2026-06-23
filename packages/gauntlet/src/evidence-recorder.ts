/**
 * The INSTRUMENTED GateContext recorder — the structural enforcement of the
 * verdict-cache evidence-declaration LAW (Slice B, B2 — the drill sergeant).
 *
 * `Gate.evidenceDigest` is the cache's out-of-IR soundness keystone: a gate that
 * reads evidence the COVERAGE DIGEST cannot see (the confirmer corpus via
 * `allFiles()`, a `benchmarks/*.json` via `readFile`, an injected fact, or the
 * `ir.facts`/`ir.refs` whose VALUES a host oracle computed) MUST fold that evidence
 * into its key, or a warm cache serves a STALE verdict. Before this module that
 * "MUST" was unenforced CONVENTION (`defineGate` only checks fixtures), so a future
 * gate could silently read undeclared evidence and cache under the no-evidence
 * marker — the second P1 finding.
 *
 * This module makes the convention a CHECKED property. {@link recordingContext}
 * wraps a {@link GateContext} so EVERY evidence read a gate performs during its
 * `run` is RECORDED: an `allFiles()` call, a `readFile(path)` for a path OUTSIDE the
 * IR, an access of `ir.facts` / `ir.refs`, and an access of each injected fact
 * channel (`supplyChain` / `mutation` / `mcdc` / `simulation` / `traceability` /
 * `standards` / `declaredFix` / `taint` / `fuzzCorpus` / `proof` / `composition`).
 * The meta-test (`evidence-declaration-law.test.ts`) runs every built-in gate under
 * this recorder, captures the read-set, and asserts every out-of-IR / fact read is
 * COVERED by what the gate's `evidenceDigest` folds (proven by PERTURBATION — a read
 * the gate did not declare flips no digest segment → the law fails it), with
 * `ir.facts` / `ir.refs` covered by the now-extended toolchain digest (the
 * cli/audit oracle dist).
 *
 * PURE + lean: no crypto, no fs, no clock — it only observes the reads the wrapped
 * context's own accessors perform. The engine never uses it on the live path; it is
 * an instrument the law drives.
 *
 * @module
 */

import type { GateContext } from './gate.js';
import type { FileId } from './repo-ir.js';

/**
 * The closed set of EVIDENCE CHANNELS the recorder tracks — every read surface a
 * gate's verdict can depend on BEYOND the in-IR coverage digest. `ir.facts` /
 * `ir.refs` are tracked because their VALUES are host-oracle-computed (covered by
 * the toolchain digest, not the coverage digest); the fact channels are the
 * injected-fact families; `allFiles` + an out-of-IR `readFile` are the file
 * confirmer corpora. An in-IR `readFile` is NOT a channel — those bytes ARE the
 * coverage digest, so reading them needs no `evidenceDigest`.
 */
export type EvidenceChannel =
  | 'allFiles'
  | 'ir.facts'
  | 'ir.refs'
  | 'supplyChain'
  | 'mutation'
  | 'mcdc'
  | 'simulation'
  | 'traceability'
  | 'standards'
  | 'declaredFix'
  | 'taint'
  | 'fuzzCorpus'
  | 'proof'
  | 'composition';

/** The injected-fact channels (every key the recorder proxies on the context). */
const FACT_CHANNELS = [
  'supplyChain',
  'mutation',
  'mcdc',
  'simulation',
  'traceability',
  'standards',
  'declaredFix',
  'taint',
  'fuzzCorpus',
  'proof',
  'composition',
] as const satisfies readonly EvidenceChannel[];

/** A recorder + the wrapped context whose reads it captures. */
export interface EvidenceRecorder {
  /** The instrumented context to hand to `gate.run` / `gate.evidenceDigest`. */
  readonly context: GateContext;
  /** The set of channels read so far (an `out-of-IR readFile` records as `readFile:<path>`). */
  reads(): ReadonlySet<string>;
  /** Reset the recorded read-set (so `run` and `evidenceDigest` can be observed separately). */
  reset(): void;
}

/**
 * Wrap `base` in an instrumented {@link GateContext} that records every out-of-IR /
 * fact-channel read into a live set. The wrapper is FAITHFUL: each accessor returns
 * exactly what `base`'s does (the gate sees an identical world), it only ALSO records
 * the read. The in-IR file set (`base.ir?.files`) is captured up front so a
 * `readFile` can be classified in-IR (the coverage digest covers it → not recorded)
 * vs out-of-IR (recorded as `readFile:<path>`).
 *
 * `ir.facts` / `ir.refs` are recorded via a Proxy over the IR that traps `get` on
 * those two keys (and passes every other property through unchanged), so a gate that
 * folds `ir.facts` records `ir.facts` without the recorder needing to know the gate's
 * internals.
 */
export function recordingContext(base: GateContext): EvidenceRecorder {
  const reads = new Set<string>();
  const inIr = new Set<FileId>(base.ir !== undefined ? [...base.ir.files.keys()] : []);

  // Proxy the IR so a read of `.facts` / `.refs` is recorded. Every other property
  // (files / symbols / imports / packages) passes through unchanged — those are the
  // STRUCTURAL IR the coverage digest already addresses (the file content digests),
  // not host-oracle-computed values, so they are not evidence channels.
  const irProxy =
    base.ir !== undefined
      ? new Proxy(base.ir, {
          get(target, prop, receiver): unknown {
            if (prop === 'facts') reads.add('ir.facts');
            else if (prop === 'refs') reads.add('ir.refs');
            return Reflect.get(target, prop, receiver);
          },
        })
      : undefined;

  const context: GateContext = {
    repoRoot: base.repoRoot,
    readFile: (relativePath: string): string | undefined => {
      // An out-of-IR readFile is evidence the coverage digest cannot see (a
      // benchmarks/*.json, a tests/ confirmer body); an in-IR readFile reads bytes
      // the coverage digest already folds, so it is NOT a separate channel.
      if (!inIr.has(relativePath)) reads.add(`readFile:${relativePath}`);
      return base.readFile(relativePath);
    },
    files: (): readonly string[] => base.files(),
    allFiles: (): readonly string[] => {
      reads.add('allFiles');
      return base.allFiles !== undefined ? base.allFiles() : base.files();
    },
    ...(irProxy !== undefined ? { ir: irProxy } : {}),
  };

  // Install a recording getter for each PRESENT fact channel. A channel that `base`
  // does not carry is left absent (an `undefined` access is not a dependency). The
  // getter records on first access and returns the underlying fact verbatim.
  for (const channel of FACT_CHANNELS) {
    const value = base[channel];
    if (value === undefined) continue;
    Object.defineProperty(context, channel, {
      enumerable: true,
      configurable: true,
      get(): unknown {
        reads.add(channel);
        return value;
      },
    });
  }

  return {
    context,
    reads: (): ReadonlySet<string> => reads,
    reset: (): void => reads.clear(),
  };
}
