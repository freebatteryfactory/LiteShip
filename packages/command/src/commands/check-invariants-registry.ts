/**
 * The banned-pattern invariant ledger (relocated from `scripts/check-invariants.ts`
 * when the gate became the `check-invariants` command). Pure data — no Node
 * coupling — so the CLI-only scan capability (`runCheckInvariants`, provisioned
 * by `@liteship/cli`) can import it without pulling fs into the pure registry entry,
 * and so `scripts/audit/report.ts` can import the rule set directly.
 *
 * `INVARIANTS` is the fast-lane rule set: each entry is a banned source pattern
 * (require / module.exports / `var` / a default export outside the sanctioned
 * Astro contract files / a hand-parsed signal axis) scoped to a set of `dirs`,
 * with per-rule structured exemptions carrying the owner, reason, and exact scope
 * of every sanctioned exception.
 *
 * @module
 */

/** A deliberately narrow exception to one source invariant. */
export interface CheckInvariantExemption {
  readonly path: string;
  readonly scope: 'file' | 'subtree';
  readonly owner: string;
  readonly reason: string;
}

/** One banned-pattern rule: a regex scoped to `dirs`, minus explicit exemptions. */
export interface CheckInvariantEntry {
  readonly name: string;
  readonly pattern: RegExp;
  readonly dirs: readonly string[];
  readonly exemptions?: readonly CheckInvariantExemption[];
  readonly message: string;
}

/** Match one exemption without substring or ambiguous-prefix broadening. */
export function matchesInvariantExemption(relativePath: string, exemption: CheckInvariantExemption): boolean {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  const exemptionPath = exemption.path.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  return exemption.scope === 'file'
    ? normalized === exemptionPath
    : normalized === exemptionPath || normalized.startsWith(`${exemptionPath}/`);
}

function file(path: string, owner: string, reason: string): CheckInvariantExemption {
  return { path, scope: 'file', owner, reason };
}

function subtree(path: string, owner: string, reason: string): CheckInvariantExemption {
  return { path, scope: 'subtree', owner, reason };
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
const INVARIANT_GATE_FILES: readonly CheckInvariantExemption[] = [
  file(
    'packages/command/src/commands/check-invariants-registry.ts',
    '@liteship/command',
    'The invariant ledger contains the banned tokens as rule data and documentation.',
  ),
  file(
    'packages/command/src/commands/check-invariants.ts',
    '@liteship/command',
    'The invariant command describes the banned tokens in its public diagnostic contract.',
  ),
  file(
    'packages/cli/src/commands/check-invariants.ts',
    '@liteship/cli',
    'The scanner adapter handles and reports the banned tokens as policy data.',
  ),
  file(
    'packages/command/src/registry.ts',
    '@liteship/command',
    'The command registry describes the invariant command and its diagnostic contract.',
  ),
];

/**
 * Published template assets are consumer source rather than executable source
 * owned by the package that carries them. The separately projected CLI fragment
 * tree is governed directly by W1.11 and therefore has no subtree exemption.
 */
const PACKAGED_TEMPLATE_TREE: readonly CheckInvariantExemption[] = [
  subtree(
    'packages/create-liteship/templates',
    'create-liteship',
    'Published scaffold templates are consumer source assets, not executable package source.',
  ),
];

const W111_DEFAULT_EXPORT_CONFIGS: readonly CheckInvariantExemption[] = [
  file('eslint.config.js', 'repository/tooling', 'ESLint flat configuration requires a default-exported config array.'),
  file(
    'liteship.config.ts',
    'repository/tooling',
    'LiteShip host configuration requires a default-exported config value.',
  ),
  file('vite.config.ts', 'repository/tooling', 'Vite host configuration requires a default-exported config value.'),
  file(
    'vitest.browser.config.ts',
    'repository/tooling',
    'Vitest browser configuration requires a default-exported config value.',
  ),
  file(
    'vitest.config.ts',
    'repository/tooling',
    'Vitest repository configuration requires a default-exported config value.',
  ),
  file(
    'packages/cli/fragments/example/03-cast-aria/astro.config.ts',
    '@liteship/cli',
    'The Astro example configuration contract requires a default-exported config value at this fragment path.',
  ),
  file(
    'packages/cli/fragments/example/05-ai-patch-refused/astro.config.ts',
    '@liteship/cli',
    'The Astro example configuration contract requires a default-exported config value at this fragment path.',
  ),
  file(
    'packages/cli/fragments/example/06-mutation-roundtrip/astro.config.ts',
    '@liteship/cli',
    'The Astro example configuration contract requires a default-exported config value at this fragment path.',
  ),
  file(
    'packages/cli/fragments/example/cloudflare-astro/astro.config.mjs',
    '@liteship/cli',
    'The Cloudflare Astro example configuration contract requires a default-exported config value at this fragment path.',
  ),
  file(
    'packages/cli/fragments/example/default/astro.config.ts',
    '@liteship/cli',
    'The default Astro example configuration contract requires a default-exported config value at this fragment path.',
  ),
  file(
    'packages/cli/fragments/example/default/liteship.config.ts',
    '@liteship/cli',
    'The default LiteShip example configuration contract requires a default-exported config value at this fragment path.',
  ),
  file(
    'packages/cli/fragments/example/showcase/astro.config.ts',
    '@liteship/cli',
    'The showcase Astro configuration contract requires a default-exported config value at this fragment path.',
  ),
  file(
    'packages/cli/fragments/example/tutorial/astro.config.ts',
    '@liteship/cli',
    'The tutorial Astro configuration contract requires a default-exported config value at this fragment path.',
  ),
  file(
    'packages/cli/fragments/template/default/astro.config.ts',
    '@liteship/cli',
    'The shipped Astro template configuration contract requires a default-exported config value at this fragment path.',
  ),
  file(
    'packages/cli/fragments/template/default/liteship.config.ts',
    '@liteship/cli',
    'The shipped LiteShip template configuration contract requires a default-exported config value at this fragment path.',
  ),
];

/** The fast-lane invariant rule set (repo-local; imported by the CLI scan + audit report). */
export const INVARIANTS: readonly CheckInvariantEntry[] = [
  {
    name: 'NO_REQUIRE',
    pattern: /\brequire\s*\(/,
    dirs: ['packages'],
    exemptions: [...PACKAGED_TEMPLATE_TREE, ...INVARIANT_GATE_FILES],
    message: 'Use ESM imports, not require().',
  },
  {
    name: 'NO_MODULE_EXPORTS',
    pattern: /module\.exports/,
    dirs: ['packages'],
    exemptions: [...PACKAGED_TEMPLATE_TREE, ...INVARIANT_GATE_FILES],
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
    exemptions: [
      ...W111_DEFAULT_EXPORT_CONFIGS,
      subtree(
        'packages/astro/src/client-directives',
        '@liteship/astro',
        'Astro client directive entrypoints require a default export.',
      ),
      file(
        'packages/astro/src/runtime/inspector-toolbar-app.ts',
        '@liteship/astro',
        'Astro dev-toolbar application entrypoints require a default export.',
      ),
      ...PACKAGED_TEMPLATE_TREE,
      ...INVARIANT_GATE_FILES,
    ],
    message: 'Named exports only, except Astro client directives.',
  },
  {
    name: 'NO_VAR',
    pattern: /\bvar\s+\w/,
    dirs: ['packages'],
    exemptions: [
      ...PACKAGED_TEMPLATE_TREE,
      file(
        'packages/astro/src/integration.ts',
        '@liteship/astro',
        'Generated browser bootstrap source requires a legacy function-scoped binding for host compatibility.',
      ),
      file(
        'packages/remotion/src/hooks.ts',
        '@liteship/remotion',
        'Generated hook source requires a legacy function-scoped binding for host compatibility.',
      ),
      file(
        'packages/astro/src/client-directives/worker.ts',
        '@liteship/astro',
        'Generated worker bootstrap source requires a legacy function-scoped binding for host compatibility.',
      ),
    ],
    message: 'Use const/let, not var.',
  },
  {
    // 0.3.0 signal source-of-truth: the runtime hot path must derive its signal
    // axis from `inputToSource` (@liteship/core, the SignalSource source of truth),
    // never re-parse the dot-string with `startsWith('scroll.'/'viewport.')`.
    // The two diagnostic sites below legitimately namespace-check the input to
    // pick a teaching message (not to read a value), so they are excluded.
    name: 'NO_SIGNAL_INPUT_REPARSE',
    pattern: /\.startsWith\(\s*['"](?:scroll|viewport)\./,
    dirs: ['packages/astro/src/runtime', 'packages/vite/src'],
    exemptions: [
      // Diagnostic namespace checks (which container message to emit), not axis reads.
      file(
        'packages/vite/src/css-quantize.ts',
        '@liteship/vite',
        'This diagnostic namespace check selects teaching text and does not derive a signal axis.',
      ),
      // The inspector dev-tool's diagnostic teaching messages — the god-file split
      // relocated them from inspector.ts into the inspector/ modules (dom-probes.ts).
      subtree(
        'packages/astro/src/runtime/inspector',
        '@liteship/astro',
        'Inspector diagnostics namespace-check inputs only to select teaching messages.',
      ),
    ],
    message:
      'Derive the signal axis from inputToSource(@liteship/core), not a startsWith re-parse. ' +
      'If this is a diagnostic namespace check, add the file to the NO_SIGNAL_INPUT_REPARSE exclude.',
  },
] as const;
