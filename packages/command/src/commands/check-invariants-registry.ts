/**
 * The banned-pattern invariant ledger (relocated from `scripts/check-invariants.ts`
 * when the gate became the `check-invariants` command). Pure data — no Node
 * coupling — so the CLI-only scan capability (`runCheckInvariants`, provisioned
 * by `@czap/cli`) can import it without pulling fs into the pure registry entry,
 * and so `scripts/audit/report.ts` can import the rule set directly.
 *
 * `INVARIANTS` is the fast-lane rule set: each entry is a banned source pattern
 * (require / module.exports / `var` / a default export outside the sanctioned
 * Astro contract files / a hand-parsed signal axis) scoped to a set of `dirs`,
 * with per-rule `exclude` prefixes carrying the WHY of every sanctioned exception.
 *
 * @module
 */

/** One banned-pattern rule: a regex scoped to `dirs`, minus `exclude` prefixes. */
export interface Invariant {
  readonly name: string;
  readonly pattern: RegExp;
  readonly dirs: readonly string[];
  readonly exclude?: readonly string[];
  readonly message: string;
}

/**
 * The invariant gate's OWN source files. Now that the rule set lives under
 * `packages/` (CUT A3 — migrated off `scripts/check-invariants.ts`, which the
 * `packages`-scoped scan never reached), these files necessarily carry the banned
 * token literals — `require(`, `module.exports`, `export default` — as regex
 * patterns, descriptor copy, and doc prose. They are the definition of the rules,
 * not a violation of them, so every literal-token rule excludes them. (This is the
 * same "the rule's own home is data, not code" carve-out the old script got for
 * free by living outside `packages/`.)
 */
const INVARIANT_GATE_FILES: readonly string[] = [
  'packages/command/src/commands/check-invariants-registry.ts',
  'packages/command/src/commands/check-invariants.ts',
  'packages/cli/src/commands/check-invariants.ts',
  'packages/command/src/registry.ts',
];

/** The fast-lane invariant rule set (repo-local; imported by the CLI scan + audit report). */
export const INVARIANTS: readonly Invariant[] = [
  {
    name: 'NO_REQUIRE',
    pattern: /\brequire\s*\(/,
    dirs: ['packages'],
    exclude: INVARIANT_GATE_FILES,
    message: 'Use ESM imports, not require().',
  },
  {
    name: 'NO_MODULE_EXPORTS',
    pattern: /module\.exports/,
    dirs: ['packages'],
    exclude: INVARIANT_GATE_FILES,
    message: 'Use ESM exports, not module.exports.',
  },
  {
    name: 'NO_DEFAULT_EXPORT',
    pattern: /export default/,
    dirs: ['packages'],
    // client-directives: Astro's addClientDirective contract requires a
    // default export. inspector-toolbar-app: Astro's addDevToolbarApp
    // entrypoint contract likewise requires a default-exported DevToolbarApp.
    // create-liteship templates: scaffolder *data*, not production code —
    // astro.config.ts must default-export defineConfig. INVARIANT_GATE_FILES:
    // the rule's own `pattern: /export default/` literal is data, not code.
    exclude: [
      'packages/astro/src/client-directives/',
      'packages/astro/src/runtime/inspector-toolbar-app.ts',
      'packages/create-liteship/templates/',
      ...INVARIANT_GATE_FILES,
    ],
    message: 'Named exports only, except Astro client directives.',
  },
  {
    name: 'NO_VAR',
    pattern: /\bvar\s+\w/,
    dirs: ['packages'],
    exclude: [
      'packages/astro/src/integration.ts',
      'packages/remotion/src/hooks.ts',
      'packages/astro/src/detect-upgrade.ts',
      'packages/astro/src/client-directives/worker.ts',
    ],
    message: 'Use const/let, not var.',
  },
  {
    // 0.3.0 signal source-of-truth: the runtime hot path must derive its signal
    // axis from `inputToSource` (@czap/core, the SignalSource source of truth),
    // never re-parse the dot-string with `startsWith('scroll.'/'viewport.')`.
    // The two diagnostic sites below legitimately namespace-check the input to
    // pick a teaching message (not to read a value), so they are excluded.
    name: 'NO_SIGNAL_INPUT_REPARSE',
    pattern: /\.startsWith\(\s*['"](?:scroll|viewport)\./,
    dirs: ['packages/astro/src/runtime', 'packages/vite/src'],
    exclude: [
      // Diagnostic namespace checks (which container message to emit), not axis reads.
      'packages/vite/src/css-quantize.ts',
      'packages/astro/src/runtime/inspector.ts',
    ],
    message:
      'Derive the signal axis from inputToSource(@czap/core), not a startsWith re-parse. ' +
      'If this is a diagnostic namespace check, add the file to the NO_SIGNAL_INPUT_REPARSE exclude.',
  },
] as const;
