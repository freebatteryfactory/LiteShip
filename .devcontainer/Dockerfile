# Pinned LiteShip dev-container base — the pins here are asserted against the repo
# source-of-truth by tests/unit/meta/devcontainer-pins.test.ts (the check/devcontainer-pins gate).
#
# node 22.13.0 is fully pinned (not a floating devcontainers `:1-22` tag): its major (22)
# equals .nvmrc and it satisfies package.json engines.node (>=22.13.0).
FROM node:22.13.0-bookworm

# pnpm pinned to package.json `packageManager` (pnpm@10.32.1).
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# System deps mirroring CI truth-linux: ffmpeg (with libx264) for the AV pipeline.
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

USER node
