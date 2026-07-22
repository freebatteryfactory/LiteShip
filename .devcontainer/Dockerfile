# Pinned LiteShip dev-container base — the pins here are asserted against the repo
# source-of-truth by tests/unit/meta/devcontainer-pins.test.ts (the check/devcontainer-pins gate).
#
# node 22.13.0 is fully pinned (not a floating devcontainers `:1-22` tag): its major (22)
# equals .nvmrc and it satisfies package.json engines.node (>=22.13.0).
FROM node:22.13.0-bookworm

# pnpm pinned to package.json `packageManager` (pnpm@10.32.1).
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# System deps mirroring CI truth-linux: ffmpeg (with libx264) for the AV pipeline;
# curl + ca-certificates so rustup can bootstrap below.
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ffmpeg curl ca-certificates sudo \
 && echo "node ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/node \
 && chmod 0440 /etc/sudoers.d/node \
 && rm -rf /var/lib/apt/lists/*

# Rust is selected by the repository's actual toolchain source, not by a comment
# or the floating `stable` channel. The static pin authority parses the same TOML
# and proves Docker + CI + release use its exact channel and wasm target.
COPY rust-toolchain.toml /opt/liteship/rust-toolchain.toml
ENV RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo PATH=/usr/local/cargo/bin:$PATH
RUN RUST_TOOLCHAIN="$(sed -n 's/^channel = "\([^"]*\)"/\1/p' /opt/liteship/rust-toolchain.toml)" \
 && test -n "$RUST_TOOLCHAIN" \
 && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
 | sh -s -- -y --profile minimal --default-toolchain "$RUST_TOOLCHAIN" --target wasm32-unknown-unknown \
 && chmod -R a+w "$RUSTUP_HOME" "$CARGO_HOME"

# Playwright browsers + system deps are installed by .devcontainer/post-create.sh
# (`playwright install --with-deps chromium chromium-headless-shell`).
USER node
