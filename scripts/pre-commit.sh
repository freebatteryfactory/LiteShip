#!/usr/bin/env sh
set -eu

# Successor-architecture commit policy.
#
# The installed hook is a shim that execs this tracked script, so the policy
# lives with the tree it governs. This branch shares no history with the old
# repository and deliberately does not inherit its gates.
#
# What is enforced here is only what can be checked with no toolchain present.
# The real architecture gates -- import direction, sibling exclusion, envelope
# census, mutation banks -- run from the verification harness and are wired in
# when that harness lands. Until then this script must not imply they ran.

if git rev-parse --verify HEAD >/dev/null 2>&1; then
  against=HEAD
else
  against=$(git hash-object -t tree /dev/null)
fi

staged=$(git diff --cached --name-only --diff-filter=ACM "$against")
[ -n "$staged" ] || exit 0

status=0

# Byte discipline. `.gitattributes` pins `* -text` so nothing is rewritten on
# checkout or `git archive`; a CRLF committed by hand would survive and shift
# the per-member SHA-256 that the independent verification lane checks.
for f in $staged; do
  [ -f "$f" ] || continue
  case "$f" in
    *.png|*.jpg|*.jpeg|*.gif|*.webp|*.ico|*.zip|*.wasm|*.mp4|*.webm) continue ;;
  esac
  if grep -qU "$(printf '\r')" "$f" 2>/dev/null; then
    echo "pre-commit: CRLF in $f -- storage must stay byte-exact" >&2
    status=1
  fi
done

# Zero runtime output in the governed architecture roots. The repository is a
# compiler-checked specification: READMEs, declaration surfaces, and
# compile-time assurance fixtures only.
for f in $staged; do
  case "$f" in
    00_core/*|01_hosts/*|02_targets/*|02_wires/*|system/*)
      case "$f" in
        *.js|*.mjs|*.cjs|*.jsx)
          echo "pre-commit: executable source at $f -- governed roots carry no runtime" >&2
          status=1
          ;;
      esac
      ;;
  esac
done

exit $status
