#!/usr/bin/env bash
# Mirrors CI truth-linux system deps: Node 22, pnpm 10.32.1, ffmpeg (libx264), Playwright chromium.
set -euo pipefail

corepack enable
corepack prepare pnpm@10.32.1 --activate

pnpm install
pnpm run build
pnpm exec playwright install --with-deps chromium chromium-headless-shell

echo "LiteShip dev container ready — run: pnpm run doctor && pnpm test"
