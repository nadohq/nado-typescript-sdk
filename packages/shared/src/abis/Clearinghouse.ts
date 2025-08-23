export const CLEARINGHOUSE_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'endpoint',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'quote',
        type: 'address',
      },
    ],
    name: 'ClearinghouseInitialized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'liquidatorSubaccount',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'liquidateeSubaccount',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint32',
        name: 'productId',
        type: 'uint32',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isEncodedSpread',
        type: 'bool',
      },
      {
        indexed: false,
        internalType: 'int128',
        name: 'amount',
        type: 'int128',
      },
      {
        indexed: false,
        internalType: 'int128',
        name: 'amountQuote',
        type: 'int128',
      },
    ],
    name: 'Liquidation',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'int128',
        name: 'amount',
        type: 'int128',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'subaccount',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint32',
        name: 'productId',
        type: 'uint32',
      },
    ],
    name: 'ModifyCollateral',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'engine',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'offchainExchange',
        type: 'address',
      },
      {
        internalType: 'enum IProductEngine.EngineType',
        name: 'engineType',
        type: 'uint8',
      },
    ],
    name: 'addEngine',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'sender',
            type: 'bytes32',
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
          {
            internalType: 'uint64',
            name: 'nonce',
            type: 'uint64',
          },
        ],
        internalType: 'struct IEndpoint.BurnLp',
        name: 'tx',
        type: 'tuple',
      },
    ],
    name: 'burnLp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'sender',
            type: 'bytes32',
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
          {
            internalType: 'bytes32',
            name: 'recipient',
            type: 'bytes32',
          },
        ],
        internalType: 'struct IEndpoint.BurnLpAndTransfer',
        name: 'txn',
        type: 'tuple',
      },
    ],
    name: 'burnLpAndTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'subaccount',
            type: 'bytes32',
          },
        ],
        internalType: 'struct IEndpoint.ClaimSequencerFees',
        name: 'tx',
        type: 'tuple',
      },
      {
        internalType: 'int128[]',
        name: 'fees',
        type: 'int128[]',
      },
    ],
    name: 'claimSequencerFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'sender',
            type: 'bytes32',
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
        internalType: 'struct IEndpoint.DepositCollateral',
        name: 'tx',
        type: 'tuple',
      },
    ],
    name: 'depositCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'uint128',
            name: 'amount',
            type: 'uint128',
          },
        ],
        internalType: 'struct IEndpoint.DepositInsurance',
        name: 'tx',
        type: 'tuple',
      },
    ],
    name: 'depositInsurance',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getClearinghouseLiq',
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
    inputs: [],
    name: 'getEndpoint',
    outputs: [
      {
        internalType: 'address',
        name: 'endpoint',
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
    ],
    name: 'getEngineByProduct',
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
        internalType: 'enum IProductEngine.EngineType',
        name: 'engineType',
        type: 'uint8',
      },
    ],
    name: 'getEngineByType',
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
        internalType: 'bytes32',
        name: 'subaccount',
        type: 'bytes32',
      },
      {
        internalType: 'enum IProductEngine.HealthType',
        name: 'healthType',
        type: 'uint8',
      },
    ],
    name: 'getHealth',
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
    inputs: [],
    name: 'getInsurance',
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
    inputs: [],
    name: 'getQuote',
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
    inputs: [],
    name: 'getSpreads',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getVersion',
    outputs: [
      {
        internalType: 'uint64',
        name: '',
        type: 'uint64',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'sender',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'liquidatee',
            type: 'bytes32',
          },
          {
            internalType: 'uint32',
            name: 'productId',
            type: 'uint32',
          },
          {
            internalType: 'bool',
            name: 'isEncodedSpread',
            type: 'bool',
          },
          {
            internalType: 'int128',
            name: 'amount',
            type: 'int128',
          },
          {
            internalType: 'uint64',
            name: 'nonce',
            type: 'uint64',
          },
        ],
        internalType: 'struct IEndpoint.LiquidateSubaccount',
        name: 'tx',
        type: 'tuple',
      },
    ],
    name: 'liquidateSubaccount',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'sender',
            type: 'bytes32',
          },
          {
            internalType: 'uint32',
            name: 'productId',
            type: 'uint32',
          },
          {
            internalType: 'uint128',
            name: 'amountBase',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'quoteAmountLow',
            type: 'uint128',
          },
          {
            internalType: 'uint128',
            name: 'quoteAmountHigh',
            type: 'uint128',
          },
          {
            internalType: 'uint64',
            name: 'nonce',
            type: 'uint64',
          },
        ],
        internalType: 'struct IEndpoint.MintLp',
        name: 'tx',
        type: 'tuple',
      },
    ],
    name: 'mintLp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint32',
        name: 'productId',
        type: 'uint32',
      },
    ],
    name: 'registerProduct',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32[]',
            name: 'subaccounts',
            type: 'bytes32[]',
          },
          {
            internalType: 'uint256[]',
            name: 'productIds',
            type: 'uint256[]',
          },
        ],
        internalType: 'struct IEndpoint.SettlePnl',
        name: 'tx',
        type: 'tuple',
      },
    ],
    name: 'settlePnl',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'sender',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'recipient',
            type: 'bytes32',
          },
          {
            internalType: 'uint128',
            name: 'amount',
            type: 'uint128',
          },
          {
            internalType: 'uint64',
            name: 'nonce',
            type: 'uint64',
          },
        ],
        internalType: 'struct IEndpoint.TransferQuote',
        name: 'tx',
        type: 'tuple',
      },
    ],
    name: 'transferQuote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_clearinghouseLiq',
        type: 'address',
      },
    ],
    name: 'upgradeClearinghouseLiq',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'sender',
        type: 'bytes32',
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
      {
        internalType: 'address',
        name: 'sendTo',
        type: 'address',
      },
    ],
    name: 'withdrawCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
