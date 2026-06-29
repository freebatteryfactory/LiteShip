[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / fileToUri

# Function: fileToUri()

> **fileToUri**(`file`): `string`

Defined in: [mcp-server/src/lsp/diagnostic.ts:214](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/diagnostic.ts#L214)

Convert a repo-relative (or absolute) POSIX file path to a `file://` URI — the
form LSP `publishDiagnostics` keys on. A path that is already a `file://` URI
(or any scheme URI) passes through unchanged.

The URI is the CANONICAL file→URI form: each path segment is percent-encoded
per the URI path grammar (a space → `%20`, a literal `%` → `%25`, a reserved
char → its octet) — byte-identical to node's `pathToFileURL` (the internal
`encodePathSegment` reconciles `encodeURIComponent` with the file-URL path
grammar). Encoding per SEGMENT (rather than handing the whole path to
`pathToFileURL`) makes the URI PLATFORM-DETERMINISTIC: `pathToFileURL`
interprets a `/`-leading path as a filesystem path and on Windows roots it at
the cwd DRIVE (`file:///C:/packages/...`), breaking the "content-addressable,
replayable" determinism this URI promises. The segment codec touches no
filesystem and injects no drive, so `packages/x/src/a.ts` maps to the SAME
`file:///packages/x/src/a.ts` on every OS.

It is NOT a slash-normalizer (the b5 cage's concern): the inputs are already
repo-relative POSIX (the runner roots at the workspace and the audit layer
normalizes paths upstream), so the split on `/` only delimits segments to
encode — it never converts a backslash.

The repo-relative path is made absolute with a leading `/`, yielding the
deterministic `file:///packages/...` form the LSP client keys on.

PURE: a deterministic transform, no filesystem read (the server keys
diagnostics by the workspace-rooted path the CLI host already rooted at).

## Parameters

### file

`string`

## Returns

`string`
