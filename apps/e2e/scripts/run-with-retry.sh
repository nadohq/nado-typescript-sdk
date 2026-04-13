#!/bin/bash
# Runs E2E tests with a single automatic retry of failed files.
# On failure, parses output for failing file paths and reruns only those.
set -uo pipefail

COMMON_ARGS="--test-reporter=spec --test-concurrency=1"
OUTPUT_FILE="${TMPDIR:-/tmp}/nado-e2e-output.txt"

tsx --test $COMMON_ARGS "$@" 2>&1 | tee "$OUTPUT_FILE"
EXIT=${PIPESTATUS[0]}

if [ $EXIT -ne 0 ]; then
  FAILED_FILES=$(sed -n 's/.*test at \([^:]*\).*/\1/p' "$OUTPUT_FILE" | sort -u)

  if [ -n "$FAILED_FILES" ]; then
    echo ""
    echo "--- Retrying failed test files: $FAILED_FILES ---"
    echo ""
    tsx --test $COMMON_ARGS $FAILED_FILES
    EXIT=$?
  fi
fi

rm -f "$OUTPUT_FILE"
exit $EXIT
