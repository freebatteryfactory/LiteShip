/**
 * The FIRST oracle-divergence gate (Slice B, B1 — the headline), NOW an instance
 * of the parametric {@link makeOracleDivergenceGate} factory (Slice B, B3.2).
 *
 * Two oracles observe the `is-default-export` property over the repo-IR: the
 * AST-precise `ts-ast` (`file-proxy-only`) and the comment-blind `invariant-regex`
 * (`text-only`, running the canonical NO_DEFAULT_EXPORT rule over raw text). The
 * gate folds `ctx.ir.facts`, groups by `(file, line)`, and reports each site where
 * the two oracles DISAGREE — UNLESS the regex's silence is a sanctioned policy
 * exclude (read from a live `default-export-check-excluded` marker fact). The
 * shared fold, the exclude-vs-miss refinement, the head-probe LAW, and the
 * self-proving red/green/mutation fixtures now live in the factory; THIS module
 * supplies only the descriptor.
 *
 * The classic disagreement, and the live dogfood: the `invariant-regex` oracle
 * fires on a line where the keyword pair appears INSIDE A COMMENT, while the
 * `ts-ast` oracle correctly stays silent. That false-positive bit THIS slice's own
 * development repeatedly — the gate reports it as an advisory cross-class
 * divergence, the live proof the text-only oracle is imprecise and should be
 * retired in favour of the AST oracle.
 *
 * THE LAW (the 0.2.3 head-probe scar, as an engine invariant): the comparison is
 * computed from the LIVE oracle facts in the IR — never a hardcoded constant. The
 * engine picks NO winner; it names both oracles, both values, both coverage
 * classes, and the location, and the reader decides.
 *
 * It REQUIRES the injected IR, so it runs only on the host path (the CLI builds +
 * injects the IR); the lean MCP/command path does not run it.
 *
 * @module
 */

import type { Gate } from '../gate.js';
import { makeOracleDivergenceGate } from './make-oracle-divergence-gate.js';

/**
 * The oracle-divergence gate for `is-default-export` — the meta-gauntlet
 * self-proof, expressed through the shared factory. Its red/green/mutation
 * fixtures are the factory's in-memory {@link RepoIR}s where the two oracles agree
 * or disagree, and they ARE the proof the gate catches an injected divergence.
 * Earns blocking authority via the existing ratchet — no engine change.
 */
export const noDefaultExportDivergenceGate: Gate = makeOracleDivergenceGate({
  gateId: 'gauntlet/no-default-export-divergence',
  property: 'is-default-export',
  excludedMarkerProperty: 'default-export-check-excluded',
  level: 'L1',
  subject: 'default export',
  describe:
    'Reports a divergence when the AST (file-proxy) and invariant-regex (text-only) oracles disagree on is-default-export at a (file, line) — the regex fired on a comment the AST ignores. Reports, never decides.',
  astSawWhy:
    'the AST oracle saw a real default-export form the text-only regex missed (e.g. `export =` or a `{ x as default }` re-export the keyword-pair regex cannot match)',
  astSawStep:
    'If the AST oracle caught a real `export =` / `{ x as default }` form, the text-only regex is blind to it — prefer the AST oracle for this property.',
});
