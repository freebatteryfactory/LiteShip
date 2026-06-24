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
 * `standards` / `declaredFix` / `taint` / `fuzzCorpus` / `proof` / `composition`) —
 * PRESENT or ABSENT. An access that finds a channel ABSENT (`undefined`) is recorded
 * as a distinct `<channel>:absent` marker, so a gate whose verdict DEPENDS on a
 * channel's ABSENCE (the supply-chain not-evidenced branch) folds that dependency
 * into its key, and flipping the channel absent↔present flips the verdict key. The
 * full channel list is the single-source {@link FACT_CHANNELS} (pinned to
 * {@link GateContext} by a compile-time conformance assertion), never a hand-copy.
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
 * The SINGLE SOURCE OF TRUTH for the injected-fact channels — every optional fact key
 * a {@link GateContext} can carry, as a runtime tuple. The {@link EvidenceChannel}
 * type, the recorder's per-channel getter installation, AND the meta-test's
 * perturbation loop ALL derive from this one list (the test imports it, the type is
 * `typeof FACT_CHANNELS[number]`), so a new fact channel is added in ONE place.
 *
 * A TypeScript type cannot be reflected into a runtime array, so this tuple is the
 * canonical runtime list; it is PINNED to {@link GateContext} by the compile-time
 * {@link _factChannelsExhaustive} conformance assertion below — adding a fact key to
 * `GateContext` WITHOUT adding it here (or vice versa) is a BUILD ERROR, so the list
 * cannot silently drift from the context shape. This closes the residual where the
 * recorder hand-maintained a copy that could fall behind the context.
 */
export const FACT_CHANNELS = [
  'supplyChain',
  'mutation',
  'mcdc',
  'simulation',
  'traceability',
  'standards',
  'declaredFix',
  'taint',
  'capabilityLink',
  'fuzzCorpus',
  'proof',
  'composition',
] as const;

/** One injected-fact channel name — derived from {@link FACT_CHANNELS}, never re-typed. */
export type FactChannel = (typeof FACT_CHANNELS)[number];

/**
 * The closed set of EVIDENCE CHANNELS the recorder tracks — every read surface a
 * gate's verdict can depend on BEYOND the in-IR coverage digest. `ir.facts` /
 * `ir.refs` are tracked because their VALUES are host-oracle-computed (covered by
 * the toolchain digest, not the coverage digest); the {@link FactChannel}s are the
 * injected-fact families (derived from {@link FACT_CHANNELS}, never re-typed);
 * `allFiles` + an out-of-IR `readFile` are the file confirmer corpora. An in-IR
 * `readFile` is NOT a channel — those bytes ARE the coverage digest, so reading them
 * needs no `evidenceDigest`.
 */
export type EvidenceChannel = 'allFiles' | 'ir.facts' | 'ir.refs' | FactChannel;

/**
 * The marker suffix the recorder appends when a gate ACCESSES a fact channel and
 * finds it ABSENT (`undefined`) — a read that DEPENDS on the channel's ABSENCE. It is
 * DISTINCT from the bare channel name (a present read) AND from "never accessed" (the
 * channel not in the read-set at all), so the verdict key can fold absence-dependence:
 * a gate that branches on `supplyChain === undefined` keys apart from one that never
 * touches `supplyChain`, even though BOTH ran with `supplyChain` absent. Closes the
 * structural hole where reading-an-absent-channel recorded NOTHING.
 */
export const ABSENT_SUFFIX = ':absent' as const;

/** The recorded read marker for an ABSENT fact-channel access. */
export type AbsentRead = `${FactChannel}${typeof ABSENT_SUFFIX}`;

/**
 * COMPILE-TIME conformance: the runtime {@link FACT_CHANNELS} tuple MUST list EXACTLY
 * the optional FACT keys of {@link GateContext} — the injected-fact families, i.e.
 * every optional key EXCEPT `ir` (the structural IR, tracked via the `ir.facts` /
 * `ir.refs` sub-channels) and `allFiles` (the file-list channel). If a fact key is
 * added to `GateContext` but not to `FACT_CHANNELS` (or vice versa), one of these two
 * assignments fails to typecheck — the list cannot drift from the context shape. This
 * is the single-source pin: the gauntlet typecheck IS the drift guard.
 */
type OptionalFactKeys = Exclude<
  {
    [K in keyof GateContext]-?: undefined extends GateContext[K] ? K : never;
  }[keyof GateContext],
  // `ir` (structural, tracked via ir.facts/ir.refs), `allFiles` (the file-list channel), and
  // `skipDetector` (a CAPABILITY function, not evidence — the AST-vs-token choice is part of the
  // toolchain digest the host folds, not a per-run fact channel) are NOT fact channels.
  'ir' | 'allFiles' | 'skipDetector'
>;
type _factChannelsCoverContext = FactChannel extends OptionalFactKeys ? true : never;
type _contextFactsAreChannels = OptionalFactKeys extends FactChannel ? true : never;
// Both must be `true`; an `as never` on either side surfaces a drift as a build error.
const _factChannelsExhaustive: _factChannelsCoverContext & _contextFactsAreChannels = true;
void _factChannelsExhaustive;

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
 * fact-channel read into a live set — including an access of a channel that turns out
 * ABSENT (recorded as `<channel>:absent`, distinct from a present read and from
 * never-accessed). The wrapper is FAITHFUL: each accessor returns exactly what
 * `base`'s does (the gate sees an identical world — a present fact verbatim, an absent
 * one `undefined`), it only ALSO records the read. The in-IR file set (`base.ir?.files`)
 * is captured up front so a `readFile` can be classified in-IR (the coverage digest
 * covers it → not recorded) vs out-of-IR (recorded as `readFile:<path>`).
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

  // Install a recording getter for EVERY known fact channel — PRESENT and ABSENT.
  // Accessing a channel is itself the evidence: a present access records the bare
  // channel name (`supplyChain`) and returns the fact verbatim; an ABSENT access
  // records the distinct `<channel>:absent` marker and returns `undefined` verbatim,
  // so a gate that BRANCHES on a channel being absent (the supply-chain
  // not-evidenced path, supply-chain.ts:81) records a DEPENDENCY on that absence —
  // closing the hole where reading an absent channel recorded nothing and the
  // evidenceDigest could not reflect that the verdict DEPENDS on the absence.
  //
  // `enumerable: false` for the absent getter so the wrapped context's own-key shape
  // is UNCHANGED for absent channels (a `for…in` / spread over the context still sees
  // only the channels `base` actually carries — the gate sees an identical world); the
  // recording fires only on an explicit property ACCESS, which is the read we track.
  for (const channel of FACT_CHANNELS) {
    const value = base[channel];
    const present = value !== undefined;
    Object.defineProperty(context, channel, {
      enumerable: present, // present channels stay enumerable (verbatim shape); absent ones are access-only
      configurable: true,
      get(): unknown {
        reads.add(present ? channel : `${channel}${ABSENT_SUFFIX}`);
        return value; // verbatim — the fact, or `undefined` for an absent channel
      },
    });
  }

  return {
    context,
    reads: (): ReadonlySet<string> => reads,
    reset: (): void => reads.clear(),
  };
}
