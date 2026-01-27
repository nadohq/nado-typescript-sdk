#!/bin/bash

# These libraries require a singular source of truth for library code, so having multiple instances
# will break local development when linked with web
DIRECTORIES=(
  "node_modules/viem"
)

# Check UNLINK env var as a quick way to use a "flag"
if [ "$UNLINK" ]; then YARN_CMD="yarn unlink"; else YARN_CMD="yarn link"; fi

for DIR in "${DIRECTORIES[@]}"; do
  # Change to the directory
  cd "$DIR"
  # Run yarn link/unlink
  $YARN_CMD
  # Go back to the original directory
  cd -
done

# Now link monorepo packages
bunx lerna exec -- $YARN_CMD