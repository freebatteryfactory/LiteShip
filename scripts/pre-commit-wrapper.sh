#!/usr/bin/env sh
set -eu

# Stable installed hook. The executable policy stays in the tracked repository
# script, so an old copied hook cannot silently preserve retired verification.
repo_root="$(git rev-parse --show-toplevel)"
exec sh "$repo_root/scripts/pre-commit.sh"
