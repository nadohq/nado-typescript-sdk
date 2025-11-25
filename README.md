# Nado Typescript SDK

Monorepo for the Nado TS SDK. The Nado SDK is a collection of utilities
for interacting with the Nado API and contracts.

[SDK Docs](https://nadohq.github.io/nado-typescript-sdk/index.html)

## Packages

### `@nadohq/client`

Exposes the top-level `NadoClient`, which composes subpackages for API & contract interaction.

### `@nadohq/engine-client`

Exports queries & executes that talk to the off-chain matching engine.

### `@nadohq/indexer-client`

Exports queries that talk to the indexer.

### `@nadohq/trigger-client`

Exports queries and executes that talk to the trigger service (used for stop & TP/SL orders).

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
Uses `yarn link/unlink` ([docs](https://classic.yarnpkg.com/en/docs/cli/link))
to enable other local repos to consume Nado packages without having to publish a new version.

> When making a change to the SDK, you will need to build the SDK, then run `yarn install --force` on the consuming
> repo for the changes to be picked up.

**depcruise:all**: Run dependency-cruiser on all packages to check for dependency issues (incl. circular dependencies).

## Security

### Package Age Check

This repository includes automated security checks to protect against supply chain attacks, particularly the risk of malicious packages being published to npm shortly after legitimate package releases (as detailed in the [SHA1HULUD attack](https://helixguard.ai/blog/malicious-sha1hulud-2025-11-24)).

#### How It Works

The Package Age Guard workflow (`.github/workflows/package-age-check.yml`) runs on every pull request and:

1. **Scans dependencies** - Checks all packages in `package.json` (both `dependencies` and `devDependencies`)
2. **Resolves versions** - Uses `yarn.lock` to determine the exact version being installed
3. **Queries npm registry** - Fetches the publish date for each package version
4. **Enforces age window** - Flags packages that are too recent (default: less than 14 days old)
5. **Reports violations** - Adds a warning comment to the PR and applies a `package-age-warning` label

#### Configuration

The check is configured via GitHub repository variables:

- `MAX_PACKAGE_AGE_DAYS` (default: `14`) - Minimum age required for packages
- `PACKAGE_AGE_ALLOWLIST` - Comma or newline-separated list of packages to exempt from checks
- `NPM_REGISTRY_URL` (default: `https://registry.npmjs.org`) - Registry to query for package metadata

#### Allowlist Format

You can allowlist packages in two ways:

```
# Allowlist all versions of a package
lodash

# Allowlist a specific version
@aws-sdk/client-secrets-manager@3.306.0
```

The allowlist can be set as a GitHub repository variable with comma or newline separation:

```
PACKAGE_AGE_ALLOWLIST: |
  lodash
  @aws-sdk/client-secrets-manager@3.306.0
  @trusted-partner/preview-package
```

#### When to Use the Allowlist

Use the allowlist when:

- **Trusted partner packages** - Preview versions from trusted partners that you need to test immediately
- **Critical security patches** - Urgent security updates that can't wait for the age window
- **Internal packages** - Packages from your organization that you control and trust
- **Well-established packages** - Mature packages with strong security track records where the risk is minimal

⚠️ **Important**: Always document the justification when allowlisting a package, especially in security-sensitive contexts.

#### What Happens When a Package is Too Recent

When the check detects packages that are too recent:

1. A warning comment is posted to the PR with details about the flagged packages
2. The PR is labeled with `package-age-warning`
3. The CI check **does not fail** - it's informational to allow for informed decisions

#### Example Workflow Output

```
⚠️ Package age warning

Packages should be at least 14 days old.

- lodash@4.17.22 published 3.45 days ago on 2025-11-20
- axios@1.6.0 published 7.12 days ago on 2025-11-17
```

### Production Build Setup

We're using [Tsup](https://tsup.egoist.dev/) for building the packages in CJS and ESM formats.
Each package has its own `tsup.config.ts` file importing `tsup.base.config.ts` at the root of the monorepo.
`apps/node-compat-test` tests the compatibility of the SDK in a pure, bundler-less, Node.js environment.
Note our packages should have legacy 'main', 'module', and 'types', 'react-native' fields in their `package.json` to ensure support of older pre-`exports` environments.

## Agent Instructions

This repository includes agent instruction files for LLM-based development tools:

- `AGENT.md` - Master instructions file
- `CLAUDE.md` - Automatically symlinked to `AGENT.md` (managed by the repository)
- `.github/copilot-instructions.md` - Automatically symlinked to `AGENT.md` for GitHub Copilot

For other LLM agents (Qwen, Gemini, etc.), you can manually create symlinks:

```bash
# For Qwen
ln -sf AGENT.md QWEN.md

# For Gemini
ln -sf AGENT.md GEMINI.md
```
