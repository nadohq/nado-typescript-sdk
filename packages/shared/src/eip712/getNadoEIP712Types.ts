import { SignableRequestType } from './signableRequestType';

interface TypedDataField {
  name: string;
  type: string;
}

/**
 * Return the EIP712 types for a given request
 *
 * @param requestType
 */
export function getNadoEIP712Types(
  requestType: SignableRequestType,
): Record<string, Array<TypedDataField>> {
  switch (requestType) {
    case 'withdraw_collateral':
      return {
        WithdrawCollateral: [
          { name: 'sender', type: 'bytes32' },
          { name: 'productId', type: 'uint32' },
          { name: 'amount', type: 'uint128' },
          { name: 'nonce', type: 'uint64' },
        ],
      };
    case 'withdraw_collateral_v2':
      return {
        WithdrawCollateralV2: [
          { name: 'sender', type: 'bytes32' },
          { name: 'productId', type: 'uint32' },
          { name: 'amount', type: 'uint128' },
          { name: 'nonce', type: 'uint64' },
          { name: 'sendTo', type: 'address' },
          { name: 'appendix', type: 'uint128' },
        ],
      };
    case 'place_order':
      return {
        Order: [
          { name: 'sender', type: 'bytes32' },
          { name: 'priceX18', type: 'int128' },
          { name: 'amount', type: 'int128' },
          { name: 'expiration', type: 'uint64' },
          { name: 'nonce', type: 'uint64' },
          { name: 'appendix', type: 'uint128' },
        ],
      };
    case 'list_trigger_orders':
      return {
        ListTriggerOrders: [
          { name: 'sender', type: 'bytes32' },
          { name: 'recvTime', type: 'uint64' },
        ],
      };
    case 'update_dependency':
      return {
        DependencyUpdate: [
          { name: 'sender', type: 'bytes32' },
          { name: 'oldDigest', type: 'bytes32' },
          { name: 'newDigest', type: 'bytes32' },
          { name: 'nonce', type: 'uint64' },
        ],
      };
    case 'cancel_orders':
      return {
        Cancellation: [
          { name: 'sender', type: 'bytes32' },
          { name: 'productIds', type: 'uint32[]' },
          { name: 'digests', type: 'bytes32[]' },
          { name: 'nonce', type: 'uint64' },
        ],
      };
    case 'cancel_product_orders':
      return {
        CancellationProducts: [
          { name: 'sender', type: 'bytes32' },
          { name: 'productIds', type: 'uint32[]' },
          { name: 'nonce', type: 'uint64' },
        ],
      };
    case 'liquidate_subaccount':
      return {
        LiquidateSubaccount: [
          { name: 'sender', type: 'bytes32' },
          { name: 'liquidatee', type: 'bytes32' },
          { name: 'mode', type: 'uint8' },
          { name: 'healthGroup', type: 'uint32' },
          { name: 'amount', type: 'int128' },
          { name: 'nonce', type: 'uint64' },
        ],
      };
    case 'link_signer':
      return {
        LinkSigner: [
          { name: 'sender', type: 'bytes32' },
          { name: 'signer', type: 'bytes32' },
          { name: 'nonce', type: 'uint64' },
        ],
      };
    case 'transfer_quote':
      return {
        TransferQuote: [
          { name: 'sender', type: 'bytes32' },
          { name: 'recipient', type: 'bytes32' },
          { name: 'amount', type: 'uint128' },
          { name: 'nonce', type: 'uint64' },
        ],
      };
    case 'leaderboard_authentication':
      return {
        LeaderboardAuthentication: [
          { name: 'sender', type: 'bytes32' },
          { name: 'expiration', type: 'uint64' },
          { name: 'contestIds', type: 'uint32[]' },
        ],
      };
    case 'social_authentication':
      return {
        SocialAuthentication: [
          { name: 'sender', type: 'bytes32' },
          { name: 'expiration', type: 'uint64' },
          { name: 'provider', type: 'string' },
        ],
      };
    case 'mint_nlp':
      return {
        MintNlp: [
          { name: 'sender', type: 'bytes32' },
          { name: 'quoteAmount', type: 'uint128' },
          { name: 'nonce', type: 'uint64' },
        ],
      };
    case 'burn_nlp':
      return {
        BurnNlp: [
          { name: 'sender', type: 'bytes32' },
          { name: 'nlpAmount', type: 'uint128' },
          { name: 'nonce', type: 'uint64' },
        ],
      };
    case 'nado_authentication':
      return {
        NadoAuthentication: [
          { name: 'method', type: 'string' },
          { name: 'sender', type: 'bytes32' },
          { name: 'payloadHash', type: 'bytes32' },
          { name: 'nonce', type: 'uint64' },
        ],
      };
  }
}
