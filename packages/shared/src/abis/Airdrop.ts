/**
 * ABI for the `IAirdrop` contract, which holds merkle-distributed rewards such as Cash Incentives.
 *
 * Reward events are keyed by `week`, which is distinct from the internal Cash Incentives
 * `eventId` returned by the indexer. Always use the `week` provided alongside a claim proof.
 *
 * `getClaimed` returns cumulative claimed amounts indexed directly by week. Weeks are 1-based and
 * the array is sized `pastWeeks + 1`, so slot 0 is an unused sentinel and the length reports how
 * many reward events the contract knows about.
 */
export const AIRDROP_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint32',
        name: 'week',
        type: 'uint32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Claim',
    type: 'event',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'uint32',
            name: 'week',
            type: 'uint32',
          },
          {
            internalType: 'uint256',
            name: 'totalAmount',
            type: 'uint256',
          },
          {
            internalType: 'bytes32[]',
            name: 'proof',
            type: 'bytes32[]',
          },
        ],
        internalType: 'struct IAirdrop.ClaimProof[]',
        name: 'claimProofs',
        type: 'tuple[]',
      },
    ],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'getClaimed',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
