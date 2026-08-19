import type BigNumber from 'bignumber.js';

/**
 * Exact decimal value returned by the Nuanze API.
 *
 * The API transmits exact values as finite base-10 strings, which this client
 * converts with `@nadohq/shared`'s `toBigNumber` for the fields the contract
 * documents as decimals. IDs, counts, ranks, enums, timestamps, calendar dates,
 * addresses, and cursors are never converted.
 *
 * This is `BigNumber` from `bignumber.js`, aliased so the package has a stable
 * decimal name of its own. The integration spec calls this type `BigDecimal`,
 * but `@nadohq/shared` exports no such symbol — only `BigNumber` and
 * `toBigNumber` — so the alias is defined here rather than in shared.
 */
export type NuanzeDecimal = BigNumber;
