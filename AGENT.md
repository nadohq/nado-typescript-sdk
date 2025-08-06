# Agent Instructions for Nado SDK

This file provides guidance to LLMs when working with code in this repository.

## Repository Overview

The Nado TypeScript SDK is a monorepo containing utilities for interacting with the Nado Protocol API and contracts. The
project uses Lerna for workspace management and provides a comprehensive SDK for trading on Nado.

## Key Commands

### Development

- `yarn build` - Build all packages in the monorepo using Lerna
- `yarn clean` - Clean all packages
- `yarn dev` - Run development mode for all packages
- `yarn test` - Run Jest tests across the entire codebase
- `yarn lint` - Run ESLint with auto-fix and Prettier formatting
- `yarn typecheck` - Run TypeScript type checking for all packages
- `yarn gen-typedoc` - Generate TypeDoc documentation for all packages

### Testing

- **IMPORTANT**: Run `yarn build` before running any E2E tests to ensure all packages are built
- `yarn --cwd apps/e2e e2e` - Run all E2E tests
- `yarn --cwd apps/e2e e2e:client` - Run client-specific E2E tests
- `yarn --cwd apps/e2e e2e:engine` - Run engine-client E2E tests
- `yarn --cwd apps/e2e e2e:indexer` - Run indexer-client E2E tests
- `yarn --cwd apps/e2e e2e:trigger` - Run trigger-client E2E tests

### Package Management

- `yarn link-local` / `yarn unlink-local` - Link/unlink packages for local development
- `yarn publish-all` - Clean, build, and publish all packages via Lerna
- `yarn depcruise:all` - Analyze package dependencies and detect circular dependencies

### Individual Package Scripts

Each package in `packages/` has these common scripts:

- `yarn build` - Build the specific package
- `yarn clean` - Clean build artifacts
- `yarn dev` - Watch mode for development
- `yarn lint` - Check linting rules only
- `yarn lint:fix` - Fix linting issues automatically
- `yarn typecheck` - Type check without emitting files

## Architecture

### Monorepo Structure

The project follows a monorepo pattern with these core packages:

1. **`@nadohq/client`** - Main entry point that composes all other packages into a unified `NadoClient`
2. **`@nadohq/engine-client`** - Handles off-chain matching engine communication
3. **`@nadohq/indexer-client`** - Provides indexer queries for historical data
4. **`@nadohq/trigger-client`** - Manages trigger service for stop orders
5. **`@nadohq/contracts`** - Contract utilities, ABIs, and on-chain interactions
6. **`@nadohq/utils`** - Common utilities including bignumber.js for decimal math

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
    - Run `yarn typecheck` to verify all TypeScript types are correct across all packages
2. **Lint Check**
    - Run `yarn lint` to run ESLint with auto-fix and Prettier formatting
3. **Build**
    - Run `yarn build` to build all packages before running any tests
4. **Tests**
    - Run `yarn test` to run all tests across the codebase

### Requirements

- **All commands must pass** before considering a task complete
- **Fix errors immediately** - If any command fails, address issues and re-run the full sequence
- **Build before adding E2E tests** - Always run `yarn build` before E2E testing to ensure packages are properly built
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

