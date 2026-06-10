# @czap/audit

Profile-driven structure / integrity / surface audit engine for czap —
packageable and downstream-installable.

## Modes

### Monorepo (default)

`runAuditPasses()` with the default `liteshipDevopsProfile` audits the
workspace rooted at `process.cwd()`, discovering packages by globbing
`packages/*`. This is what `pnpm run audit` and `czap audit` do inside the
LiteShip repo.

### Consumer mode

A downstream repo has no `packages/` directory — the `@czap/*` packages live
in `node_modules`. Consumer mode audits the packages that are actually
INSTALLED, which makes it a publish-integrity gate: it verifies the artifacts
that shipped to npm (every czap package publishes `src/` alongside `dist/`,
so the source-level passes run unmodified).

```bash
czap audit --consumer            # explicit; mutually exclusive with --profile
```

```ts
import { consumerDevopsProfile, runAuditPasses } from '@czap/audit';

const result = runAuditPasses(consumerDevopsProfile(process.cwd()));
```

`consumerDevopsProfile(cwd)` discovers installed package roots with a
directory walk (`discoverInstalledPackageRoots`), not module resolution:
no `@czap/*` package exports `./package.json`, and `@czap/_spine` carries a
types-only export map, so `require.resolve` / `import.meta.resolve` throw
`ERR_PACKAGE_PATH_NOT_EXPORTED` before ever finding a package root. The walk
seeds from `cwd` and re-seeds from every found package's realpath, which
resolves pnpm's hidden virtual-store layout
(`node_modules/.pnpm/<pkg>@<v>/node_modules/...`) the same way Node's own
upward `node_modules` lookup would. Topology packages that aren't installed
are reported as `missing` — informational, not an error: a consumer audits
what it ships.

The previous workaround — symlinking installed packages into a synthetic
`packages/` directory and re-rooting the default profile — is obsolete.

## Profile semantics

- `DevopsProfile.packageRoots` (optional): explicit package name → absolute
  package dir map. When present, the passes enumerate these roots instead of
  globbing `repoRoot/packages/*`. Absent → legacy monorepo behavior,
  byte-identical.
- `surfacePolicy.astroRuntimeFiles` entries are **astro-package-relative**
  (e.g. `'src/runtime/boundary.ts'`), resolved against wherever the astro
  package actually lives. Entries starting with `packages/` are treated as
  repo-root-relative for back-compat with pre-consumer-mode profiles.
- `surfacePolicy.vitePackage` + `surfacePolicy.viteVirtualModulesFile`
  (optional): the package owning the virtual-module inventory and the
  package-relative inventory file. When absent, the legacy
  `packages/vite/src/virtual-modules.ts` repo-root-relative location is used.

## CLI

```bash
czap audit                       # default profile rooted at cwd (monorepo)
czap audit --profile ./p.json    # explicit profile file (.json/.js/.mjs)
czap audit --consumer            # installed-package discovery from cwd
czap audit --findings            # include the findings array in the receipt
```

The receipt is a single JSON line on stdout; `--pretty` adds a human summary
(and per-finding lines with `--findings`) on stderr.
