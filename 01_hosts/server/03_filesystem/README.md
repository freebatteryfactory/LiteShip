# Server Filesystem

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/03_filesystem/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own scoped filesystem-provider authority: deployment-admitted roots, root-correlated path admission, directly disposable owned handles, finalized streams with terminal content, and honest failure.

## Owns

- `AdmittedPath<Root>`: a path is admitted against the exact root it belongs to — a raw string is never authority, and a path under root A structurally cannot open under root B.
- The deployment root binding: the exact root reference and its addressed configuration together, never a generic admitted flag.
- Root-correlated admission and opening on the provider.
- Owned file handles with atomic-write-and-replace semantics, plus the full resource families: directories, watches, locks, and bounded chunk streams — all root-correlated — and exact realization of the four core store ports.

## Does not own

- Persistence port meaning — core. Which roots exist — deployment grounding. Watch strategy — empirical.

## Laws

- A path cannot claim another root.
- Opening is root-correlated through the provider's generic operation.
- A handle is bound to its root and path, and is owned.

## Proof obligations

- Path admission resists traversal, symlink confusion, and race conditions appropriate to the implementation.

`system/01_assurance`; buffer sizes and watch strategy are empirical.
