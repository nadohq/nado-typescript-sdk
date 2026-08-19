# Nado SDK E2E Scripts

## Setup

Before running any tests, make sure to configure your environment and set up the test account:

1. Copy `.env.example` into `.env` and fill out any appropriate values

2. Run the `bun account-setup` to mint and deposit tokens for the test account

## E2E Tests

| Command          | Description                       |
|------------------|-----------------------------------|
| bun e2e         | Runs all E2E tests                |
| bun e2e:client  | Runs all client-related E2E tests |
| bun e2e:engine  | Runs all engine-client E2E tests  |
| bun e2e:indexer | Runs all indexer-client E2E tests |
| bun e2e:nuanze  | Runs all nuanze-client E2E tests  |
| bun e2e:trigger | Runs all trigger-client E2E tests |

The `nuanze-client` suite is the exception to the setup above: the Nuanze API is
public, so it needs no `.env`, funded account, or chain environment. It runs
entirely against the live `api.nuanze.co`, with no mock server, so it needs
network access; `dualPackage.test.ts` also requires a prior `bun run build`.
