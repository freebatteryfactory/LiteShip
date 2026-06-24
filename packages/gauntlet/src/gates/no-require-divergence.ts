/**
 * The `no-require` oracle-divergence gate (Slice B, B3.2) — an instance of the
 * parametric {@link makeOracleDivergenceGate} factory.
 *
 * Two oracles observe the `require-call` property over the repo-IR: the
 * AST-precise `ts-ast` (`file-proxy-only`, a real `ts.CallExpression` whose callee
 * is the `require` identifier) and the comment-blind `invariant-regex`
 * (`text-only`, running the canonical NO_REQUIRE rule over raw text). Where they
 * disagree at a `(file, line)` — UNLESS the regex's silence is a sanctioned policy
 * exclude (read from a live `require-check-excluded` marker fact) — the gate
 * reports a self-explaining, traceable divergence per the ratified
 * REPORT-not-DECIDE model.
 *
 * The likely real divergence on this repo is the comment/string occurrence: the
 * CommonJS loader name appears textually inside a doc comment or a string literal
 * that mentions the legacy module form by name, the regex fires (it is
 * comment-blind), and the AST oracle correctly stays silent (no real call). That
 * advisory cross-class finding is the live proof the text-only oracle should be
 * retired in favour of the AST oracle — the same dogfood shape as the headline
 * default-export gate, now triangulating a third property.
 *
 * It REQUIRES the injected IR, so it runs only on the host path; the lean
 * MCP/command path does not run it.
 *
 * @module
 */

import type { Gate } from '../gate.js';
import { makeOracleDivergenceGate } from './make-oracle-divergence-gate.js';

/**
 * The oracle-divergence gate for the `require-call` property — triangulates the
 * AST oracle (a real CommonJS-loader call expression) against the NO_REQUIRE
 * invariant-regex. Self-proves through the shared factory fixtures; earns blocking
 * authority via the existing ratchet.
 */
export const noRequireDivergenceGate: Gate = makeOracleDivergenceGate({
  gateId: 'gauntlet/no-require-divergence',
  property: 'require-call',
  excludedMarkerProperty: 'require-check-excluded',
  level: 'L1',
  subject: 'CommonJS-loader call',
  describe:
    'Reports a divergence when the AST (file-proxy) and invariant-regex (text-only) oracles disagree on require-call at a (file, line) — the regex fired on a comment/string the AST ignores. Reports, never decides.',
  astSawWhy:
    'the AST oracle saw a real CommonJS-loader call the text-only regex missed (the regex matches raw text, so a real call the AST resolves but the regex does not match surfaces here)',
  astSawStep:
    'If the AST oracle caught a real CommonJS-loader call the text scan missed, prefer the AST oracle for this property — the text-only regex is blind to it.',
});
