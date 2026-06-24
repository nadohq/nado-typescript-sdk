export const FOUNDATION_REWARDS_AIRDROP_ABI = [
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
        internalType: 'struct IFoundationRewardsAirdrop.ClaimProof[]',
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
