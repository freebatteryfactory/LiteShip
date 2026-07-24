#!/usr/bin/env bash
set -euo pipefail

# Pre-commit hook for liteship.
# Auto-installed via `prepare` script in package.json on `pnpm install`.
# Manual install: ln -sf ../../scripts/pre-commit.sh .git/hooks/pre-commit
#
# Emergency escape hatch:
#   SKIP_PRECOMMIT=1 git commit -m "wip"
# Prefer fixing the failure to skipping; reserve for genuine emergencies
# (e.g. broken upstream tooling that's not your code).

if [ "${SKIP_PRECOMMIT:-0}" = "1" ]; then
  echo "[pre-commit] SKIPPED (SKIP_PRECOMMIT=1). Re-run the gates locally before pushing."
  exit 0
fi

echo "[pre-commit] Running quick verification..."
pnpm run build
pnpm run typecheck
pnpm run lint
# format:check closes the gap that let 75 prettier-dirty files reach CI: the local
# hook ran eslint but never prettier, so formatting drift was invisible until the CI
# `prettier --check` lane. Same fail-closed contract as the other gates.
pnpm run format:check
pnpm exec tsx packages/cli/src/bin.ts check-invariants

if git diff --cached --name-only --diff-filter=ACMRD | grep -Eq '^(packages/[^/]+/src/.*\.ts|packages/_spine/.*\.d\.ts|packages/_spine/typedoc-entry\.ts|typedoc\.json|docs/api/)'; then
  echo "[pre-commit] API docs inputs changed; checking the cheap committed input fingerprint..."
  pnpm run docs:check:fast
fi

echo "[pre-commit] All checks passed."
