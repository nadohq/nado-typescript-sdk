import { Address } from 'viem';

/**
 * Identifies an Airdrop contract to read from or write to. The address is returned by the indexer
 * as `wallet.claim.airdropAddress` of a cash incentives event.
 */
export interface AirdropAddressParams {
  /** Airdrop contract holding the reward. */
  airdropAddress: Address;
}

export interface GetClaimedAirdropAmountsParams extends AirdropAddressParams {
  /** Wallet to look up the claimed amounts for. */
  address: Address;
}
