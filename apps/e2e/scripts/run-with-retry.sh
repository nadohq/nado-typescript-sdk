#!/bin/bash
# Runs E2E tests with a single automatic retry of failed tests using
# Node's --test-rerun-failures flag.  On the second invocation only
# tests that failed in the first run are re-executed (hooks still run).
set -uo pipefail

STATE_FILE="${TMPDIR:-/tmp}/nado-e2e-rerun-state.json"
rm -f "$STATE_FILE"

COMMON_ARGS="--test-reporter=spec --test-concurrency=1 --test-rerun-failures=$STATE_FILE"

tsx --test $COMMON_ARGS "$@"
EXIT=$?

if [ $EXIT -ne 0 ]; then
  echo ""
  echo "--- Retrying failed tests ---"
  echo ""
  tsx --test $COMMON_ARGS "$@"
  EXIT=$?
fi

exit $EXIT
