#!/bin/bash

# These libraries require a singular source of truth for library code, so having multiple instances
# will break local development when linked with web
DIRECTORIES=(
  "node_modules/viem"
)

# Check UNLINK env var as a quick way to use a "flag"
if [ "$UNLINK" ]; then BUN_CMD="bun unlink"; else BUN_CMD="bun link"; fi

for DIR in "${DIRECTORIES[@]}"; do
  # Change to the directory
  cd "$DIR"
  # Run bun link/unlink
  $BUN_CMD
  # Go back to the original directory
  cd -
done

# Now link monorepo packages
bunx lerna exec -- $BUN_CMD