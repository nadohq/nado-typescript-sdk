export const WITHDRAW_POOL_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint8',
        name: 'version',
        type: 'uint8',
      },
    ],
    name: 'Initialized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'uint64[]',
        name: 'idxs',
        type: 'uint64[]',
      },
    ],
    name: 'checkMarkedIdxs',
    outputs: [
      {
        internalType: 'bool[]',
        name: '',
        type: 'bool[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint32[]',
        name: 'productIds',
        type: 'uint32[]',
      },
    ],
    name: 'checkProductBalances',
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
  {
    inputs: [
      {
        internalType: 'contract IERC20Base',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'uint32',
        name: 'productId',
        type: 'uint32',
      },
      {
        internalType: 'uint128',
        name: 'amount',
        type: 'uint128',
      },
    ],
    name: 'fastWithdrawalFeeAmount',
    outputs: [
      {
        internalType: 'int128',
        name: '',
        type: 'int128',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint32',
        name: '',
        type: 'uint32',
      },
    ],
    name: 'fees',
    outputs: [
      {
        internalType: 'int128',
        name: '',
        type: 'int128',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_clearinghouse',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_verifier',
        type: 'address',
      },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint64',
        name: '',
        type: 'uint64',
      },
    ],
    name: 'markedIdxs',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint32',
        name: 'productId',
        type: 'uint32',
      },
      {
        internalType: 'uint128',
        name: 'amount',
        type: 'uint128',
      },
      {
        internalType: 'address',
        name: 'sendTo',
        type: 'address',
      },
    ],
    name: 'removeLiquidity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint64',
        name: 'idx',
        type: 'uint64',
      },
      {
        internalType: 'bytes',
        name: 'transaction',
        type: 'bytes',
      },
      {
        internalType: 'bytes[]',
        name: 'signatures',
        type: 'bytes[]',
      },
    ],
    name: 'submitFastWithdrawal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'contract IERC20Base',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'sendTo',
        type: 'address',
      },
      {
        internalType: 'uint128',
        name: 'amount',
        type: 'uint128',
      },
      {
        internalType: 'uint64',
        name: 'idx',
        type: 'uint64',
      },
    ],
    name: 'submitWithdrawal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
