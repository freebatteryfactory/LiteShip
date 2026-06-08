## [0.1.4] — 2026-06-08

Cloudflare Workers first-class support. All **18** `@czap/*` packages ship at `0.1.4`
(including first npm publish of `@czap/cloudflare`, `@czap/audit`, and `@czap/command`).

### Added
- `@czap/cloudflare` — Workers siteAdapter, KV edge cache, and Astro middleware glue.
- `czap doctor --target cloudflare` — probes Astro, Wrangler, adapter output, and config bindings.
- `examples/cloudflare-astro/` — end-to-end Astro + Cloudflare adapter example.
- `pnpm run test:cloudflare` gauntlet phase; Windows and macOS CI smoke run it.
- Hosting guide: `docs/hosting/cloudflare.md`.

### Fixed
- `prepare` hook (`link-pre-commit.ts`) no longer imports built `@czap/command` before `tsc --build`.
- CI: build workspace before `gauntlet:full`; git identity for `doctor --ci` on GHA runners.
- Windows `package:smoke`: copy hoisted deps beside tar-extracted `@czap/*` (junction ENOENT on GHA).
- TypeDoc link mappings for `@czap/edge` / `@czap/mcp-server`; browser coverage excludes Workers-only sources.
- Prettier drift in `doctor.ts` and `cloudflare-adapter.ts`; `.wrangler/` gitignored.
