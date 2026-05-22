## [0.1.3] — 2026-05-21

CI greening release — no intentional public API changes beyond what shipped in 0.1.2.

### Fixed
- `package:smoke` audits `workspace:` leakage from packed tarballs (`tar -xOf`) instead of
  `node_modules` layout, so Windows CI no longer depends on pnpm hoisting shape.
- Windows `package:smoke`: `--ignore-workspace` consumer install, hoisted linker, junction links
  beside tar-extracted `@czap/*` so `mediabunny`/`cborg` resolve for import-smoke.
- `czap` bin shim (`packages/cli/bin/czap.mjs`): load `dist/` via `file://` URL on Windows ESM.
- `animation.test.ts` waits for scheduler callback registration before driving frames,
  eliminating 10s Vitest timeouts on loaded Linux runners.
