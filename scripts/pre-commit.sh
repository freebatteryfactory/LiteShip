#!/usr/bin/env bash
set -euo pipefail

# Pre-commit hook for liteship.
# Auto-installed via `prepare` script in package.json on `pnpm install`.
# Manual install: pnpm exec tsx scripts/link-pre-commit.ts
#
# Emergency escape hatch:
#   SKIP_PRECOMMIT=1 git commit -m "wip"
# Prefer fixing the failure to skipping; reserve for genuine emergencies
# (e.g. broken upstream tooling that's not your code).

if [ "${SKIP_PRECOMMIT:-0}" = "1" ]; then
  echo "[pre-commit] SKIPPED (SKIP_PRECOMMIT=1). Re-run the gates locally before pushing."
  exit 0
fi

echo "[pre-commit] Running the tracked staged preflight..."
pnpm preflight --staged
