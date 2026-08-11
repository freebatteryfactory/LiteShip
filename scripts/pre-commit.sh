#!/usr/bin/env sh
set -eu

# Successor-architecture commit policy.
#
# The installed hook is a shim that execs this tracked script, so the policy
# lives with the tree it governs. This branch shares no history with the old
# repository and deliberately does not inherit its gates.
#
# The fast structural gates run here. The mutation banks do not: 315 full-tree
# compiles is a four-minute commit, which trains people to pass --no-verify. Run
# `node verification/run.mjs` before publishing a round artifact.

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

# Structural gates, when the harness has been installed. They read the working
# tree rather than the index, so a partially staged commit is checked as it will
# be seen after checkout. Skipped with a notice if `npm install` has not run --
# an absent toolchain must announce itself, never pass silently.
if [ -d verification/node_modules ]; then
  for gate in envelope direction direction.selftest lanes; do
    if ! node "verification/gates/$gate.mjs" >/dev/null 2>&1; then
      echo "pre-commit: $gate gate failed -- run \`node verification/gates/$gate.mjs\`" >&2
      status=1
    fi
  done
else
  echo "pre-commit: verification harness not installed, structural gates NOT run" >&2
  echo "            (cd verification && npm install)" >&2
fi

exit $status
