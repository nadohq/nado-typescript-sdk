# Nado Typescript SDK

Monorepo for the Nado TS SDK. The Nado SDK is a collection of utilities
for interacting with the Nado API and contracts.

[SDK Docs](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Setup and validation

This repository uses Bun `1.3.14` as its package manager. Install dependencies before running workspace commands:

```bash
bun install
```

Useful checks include:

```bash
bun run build
bun run test:unit
bun run typecheck
bun run depcruise:all
```

## Packages

### `@nadohq/client`

Exposes the top-level `NadoClient`, which composes subpackages for API & contract interaction.

### `@nadohq/engine-client`

Exports queries & executes that talk to the off-chain matching engine.

### `@nadohq/indexer-client`

Exports queries that talk to the indexer.

### `@nadohq/trigger-client`

Exports queries and executes that talk to the trigger service (used for stop & TP/SL orders).

### `@nadohq/mobile-client`

Client for the mobile service — identity, usernames, privacy settings, and push notification devices & preferences.

### `@nadohq/nuanze-client`

Read-only client for the public Nuanze analytics API — markets, wallets, trades, candles, flows, and
positioning. Credential-free, so it takes no wallet client or linked signer.

### `@nadohq/shared`

Base utilities, contract interfaces, and EIP712 signing logic. This also includes [
`bignumber.js`](https://mikemcl.github.io/bignumber.js/), which is used for representing
large numbers.

## Development

### Workspace Scripts

This is a Lerna monorepo. See `package.json` for common tasks, some of which are:

**clean/build/dev/lint/typecheck**: Fairly common & self-explanatory tasks, operate on the entire repo

**gen-typedoc**: Generates documentation using [TypeDoc](https://typedoc.org/)

**link/unlink-local**: Used for local package development.
Uses `bun link/unlink` ([docs](https://bun.com/docs/pm/cli/link))
to enable other local repos to consume Nado packages without having to publish a new version.

> When making a change to the SDK, you will need to build the SDK, then run `bun install` on the consuming
> repo for the changes to be picked up.

**depcruise:all**: Run dependency-cruiser on all packages to check for dependency issues (incl. circular dependencies).

### Production Build Setup

We're using [Tsup](https://tsup.egoist.dev/) for building the packages in CJS and ESM formats.
Each package has its own `tsup.config.ts` file importing `tsup.base.config.ts` at the root of the monorepo.
`apps/node-compat-test` tests the compatibility of the SDK in a pure, bundler-less, Node.js environment.
Note our packages should have legacy 'main', 'module', and 'types', 'react-native' fields in their `package.json` to ensure support of older pre-`exports` environments.

## Agent Instructions

This repository includes agent instruction files for LLM-based development tools:

- `AGENTS.md` - Master instructions file
- `CLAUDE.md` - Automatically symlinked to `AGENTS.md` (managed by the repository)
- `.github/copilot-instructions.md` - Automatically symlinked to `AGENTS.md` for GitHub Copilot

For other LLM agents (Qwen, Gemini, etc.), you can manually create symlinks:

```bash
# For Qwen
ln -sf AGENTS.md QWEN.md

# For Gemini
ln -sf AGENTS.md GEMINI.md
```
