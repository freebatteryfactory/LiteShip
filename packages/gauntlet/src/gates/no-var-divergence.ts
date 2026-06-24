/**
 * The `no-var` oracle-divergence gate (Slice B, B3.2) — an instance of the
 * parametric {@link makeOracleDivergenceGate} factory.
 *
 * Two oracles observe the `var-declaration` property over the repo-IR: the
 * AST-precise `ts-ast` (`file-proxy-only`, a real `ts.VariableStatement` carrying
 * the legacy-binding NodeFlag) and the comment-blind `invariant-regex`
 * (`text-only`, running the canonical NO_VAR rule over raw text). Where they
 * disagree at a `(file, line)` — UNLESS the regex's silence is a sanctioned policy
 * exclude (read from a live `var-check-excluded` marker fact) — the gate reports a
 * self-explaining, traceable divergence per the ratified REPORT-not-DECIDE model.
 *
 * The likely real divergence on this repo is the comment/string occurrence: the
 * keyword appears textually inside a doc comment or a string literal that mentions
 * the legacy binding form by name, the regex fires (it is comment-blind), and the
 * AST oracle correctly stays silent (no real legacy declaration). That advisory
 * cross-class finding is the live proof the text-only oracle should be retired in
 * favour of the AST oracle — exactly the same dogfood shape as the headline
 * default-export gate, now triangulating a second property.
 *
 * It REQUIRES the injected IR, so it runs only on the host path; the lean
 * MCP/command path does not run it.
 *
 * @module
 */

import type { Gate } from '../gate.js';
import { makeOracleDivergenceGate } from './make-oracle-divergence-gate.js';

/**
 * The oracle-divergence gate for the `var-declaration` property — triangulates the
 * AST oracle (a real legacy variable statement) against the NO_VAR
 * invariant-regex. Self-proves through the shared factory fixtures; earns blocking
 * authority via the existing ratchet.
 */
export const noVarDivergenceGate: Gate = makeOracleDivergenceGate({
  gateId: 'gauntlet/no-var-divergence',
  property: 'var-declaration',
  excludedMarkerProperty: 'var-check-excluded',
  level: 'L1',
  subject: 'legacy variable declaration',
  describe:
    'Reports a divergence when the AST (file-proxy) and invariant-regex (text-only) oracles disagree on var-declaration at a (file, line) — the regex fired on a comment/string the AST ignores. Reports, never decides.',
  astSawWhy:
    'the AST oracle saw a real legacy variable statement the text-only regex missed (the keyword regex matches raw text, so a real declaration the AST resolves but the regex does not match — e.g. wrapped or formatted unusually — surfaces here)',
  astSawStep:
    'If the AST oracle caught a real legacy variable statement the text scan missed, prefer the AST oracle for this property — the text-only regex is blind to it.',
});
