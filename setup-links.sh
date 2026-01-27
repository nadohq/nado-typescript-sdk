#!/bin/bash

# Check UNLINK env var as a quick way to use a "flag"
if [ "$UNLINK" ]; then BUN_CMD="bun unlink"; else BUN_CMD="bun link"; fi

# Now link monorepo packages
bunx lerna exec -- $BUN_CMD