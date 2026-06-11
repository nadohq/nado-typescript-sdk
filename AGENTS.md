# Agent Instructions for Nado SDK

This file provides guidance to LLMs when working with code in this repository.

## Repository Overview

The Nado TypeScript SDK is a monorepo containing utilities for interacting with the Nado Protocol API and contracts. The
project uses Lerna for workspace management and provides a comprehensive SDK for trading on Nado.

## Key Commands

### Development

- `bun run build` - Build all packages in the monorepo using Lerna
- `bun run clean` - Clean all packages
- `bun run dev` - Run development mode for all packages
- `bun run test:unit` - Run Jest unit tests (packages only)
- `bun run test:e2e` - Build and run all E2E tests (node:test in apps/e2e)
- `bun run lint` - Run ESLint with auto-fix and Prettier formatting
- `bun run typecheck` - Run TypeScript type checking for all packages
- `bun run gen-typedoc` - Generate TypeDoc documentation for all packages

### Testing

- **Unit tests (Jest)**: `bun run test:unit`
- **E2E tests (node:test in apps/e2e)** — each command runs `bun run build` first:
  - `bun run test:e2e` - Run all E2E tests
  - `bun run test:e2e:client` - Client E2E tests
  - `bun run test:e2e:engine` - Engine-client E2E tests
  - `bun run test:e2e:indexer` - Indexer-client E2E tests
  - `bun run test:e2e:trigger` - Trigger-client E2E tests
- Without building first (if already built): `bun --cwd apps/e2e e2e` and `e2e:client`, `e2e:engine`, `e2e:indexer`, `e2e:trigger`

### Package Management

- `bun run publish-all` - Clean, build, and publish all packages via Lerna
- `bun run depcruise:all` - Analyze package dependencies and detect circular dependencies

### Individual Package Scripts

Each package in `packages/` has these common scripts:

- `bun run build` - Build the specific package
- `bun run clean` - Clean build artifacts
- `bun run dev` - Watch mode for development
- `bun run lint` - Check linting rules only
- `bun run lint:fix` - Fix linting issues automatically
- `bun run typecheck` - Type check without emitting files

## Architecture

### Monorepo Structure

The project follows a monorepo pattern with these core packages:

1. **`@nadohq/client`** - Main entry point that composes all other packages into a unified `NadoClient`
2. **`@nadohq/engine-client`** - Handles off-chain matching engine communication
3. **`@nadohq/indexer-client`** - Provides indexer queries for historical data
4. **`@nadohq/trigger-client`** - Manages trigger service for stop orders
5. **`@nadohq/shared`** - Contract utilities, ABIs, and on-chain interactions. Also includes common utilities, such as
   bignumber.js for mathematical operations.

### Client Architecture

- `NadoClient` is the main class that orchestrates all API interactions
- Uses `viem` for Ethereum wallet/provider functionality
- Supports both chain signers and linked signers for trading
- Modular API design with separate classes for Market, Spot, Perp, Subaccount, and WebSocket operations

### Key Patterns

- All packages use TypeScript with strict type checking
- Use bignumber.js (renamed to BigDecimal) for precise decimal calculations
- EIP-712 signing for off-chain order execution
- Comprehensive type definitions for all API responses
- Consistent error handling with custom error classes
- Viem as the primary Ethereum library dependency

## Test and Verification Sequence

After making edits, **ALWAYS** run the following verification sequence:

1. **Type Check**
    - Run `bun run typecheck` to verify all TypeScript types are correct across all packages
2. **Lint Check**
    - Run `bun run lint` to run ESLint with auto-fix and Prettier formatting
3. **Build**
    - Run `bun run build` to build all packages before running any tests
4. **Tests**
    - Run `bun run test:unit` for Jest unit tests; run `bun run test:e2e` for E2E tests (builds first)

### Requirements

- **All commands must pass** before considering a task complete
- **Fix errors immediately** - If any command fails, address issues and re-run the full sequence
- **Build before adding E2E tests** - Always run `bun run build` before E2E testing to ensure packages are properly built
- **Add basic sanity E2E tests** - Never skip writing E2E tests for new features, client APIs, or user flows
- **Do NOT write unit tests** - any unit tests should be written manually

## TypeScript SDK Style Guide

For detailed coding standards and conventions, see [Style Guide](./docs/STYLEGUIDE.md).

### Key areas covered in the style guide:

- JSDoc documentation standards
- TypeScript conventions and type safety
- Client class patterns and architecture
- Error handling and custom exceptions
- Naming conventions and file structure
- Constants and configuration management
- Utility function patterns and validation

