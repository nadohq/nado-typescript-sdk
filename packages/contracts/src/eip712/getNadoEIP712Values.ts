import { addDecimals, toIntegerString } from '@nadohq/utils';
import { subaccountToHex } from '../utils/bytes32';
import {
  EIP712BurnVlpValues,
  EIP712IsolatedOrderValues,
  EIP712LeaderboardAuthenticationValues,
  EIP712LinkSignerValues,
  EIP712LiquidateSubaccountValues,
  EIP712ListTriggerOrdersValues,
  EIP712MintVlpValues,
  EIP712OrderCancellationValues,
  EIP712OrderValues,
  EIP712ProductOrdersCancellationValues,
  EIP712TransferQuoteValues,
  EIP712WithdrawCollateralValues,
  SignableRequestTypeToEIP712Values,
} from './eip712ValueTypes';
import {
  SignableRequestType,
  SignableRequestTypeToParams,
} from './signableRequestType';
import {
  EIP712CancelOrdersParams,
  EIP712CancelProductOrdersParams,
  EIP712IsolatedOrderParams,
  EIP712LeaderboardAuthenticationParams,
  EIP712LinkSignerParams,
  EIP712LiquidateSubaccountParams,
  EIP712ListTriggerOrdersParams,
  EIP712MintVlpParams,
  EIP712OrderParams,
  EIP712TransferQuoteParams,
  EIP712WithdrawCollateralParams,
  EIP712BurnVlpParams,
} from './signatureParamTypes';

/**
 * Returns the EIP712 compatible values for signing.
 *
 * Note: We use the string representation of bigint to be compatible with JSON.stringify
 *
 * @param requestType
 * @param params
 */
export function getNadoEIP712Values<TReqType extends SignableRequestType>(
  requestType: TReqType,
  params: SignableRequestTypeToParams[TReqType],
): SignableRequestTypeToEIP712Values[TReqType] {
  // Typescript does not yet support type narrowing + generic lookup types, hence the hacks here
  let values: SignableRequestTypeToEIP712Values[keyof SignableRequestTypeToEIP712Values];
  switch (requestType) {
    case 'withdraw_collateral':
      values = getWithdrawCollateralValues(
        params as EIP712WithdrawCollateralParams,
      );
      break;
    case 'place_order':
      values = getOrderValues(params as EIP712OrderParams);
      break;
    case 'place_isolated_order':
      values = getIsolatedOrderValues(params as EIP712IsolatedOrderParams);
      break;
    case 'list_trigger_orders':
      values = getListTriggerOrdersValues(
        params as EIP712ListTriggerOrdersParams,
      );
      break;
    case 'cancel_orders':
      values = getOrderCancellationValues(params as EIP712CancelOrdersParams);
      break;
    case 'cancel_product_orders':
      values = getProductOrdersCancellationValues(
        params as EIP712CancelProductOrdersParams,
      );
      break;
    case 'liquidate_subaccount':
      values = getLiquidateSubaccountValues(
        params as EIP712LiquidateSubaccountParams,
      );
      break;
    case 'link_signer':
      values = getLinkSignerValues(params as EIP712LinkSignerParams);
      break;
    case 'transfer_quote':
      values = getTransferQuoteValues(params as EIP712TransferQuoteParams);
      break;
    case 'leaderboard_authentication':
      values = getLeaderboardAuthenticationValues(
        params as EIP712LeaderboardAuthenticationParams,
      );
      break;
    case 'mint_vlp':
      values = getMintVlpValues(params as EIP712MintVlpParams);
      break;
    case 'burn_vlp':
      values = getBurnVlpValues(params as EIP712BurnVlpParams);
      break;
    default:
      throw new Error(`Unsupported request type: ${requestType}`);
  }

  return values as SignableRequestTypeToEIP712Values[TReqType];
}

function getWithdrawCollateralValues(
  params: EIP712WithdrawCollateralParams,
): EIP712WithdrawCollateralValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    productId: params.productId,
    amount: toIntegerString(params.amount),
    nonce: params.nonce,
  };
}

function getOrderValues(params: EIP712OrderParams): EIP712OrderValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    priceX18: toIntegerString(addDecimals(params.price)),
    amount: toIntegerString(params.amount),
    expiration: toIntegerString(params.expiration),
    nonce: params.nonce,
  };
}

function getIsolatedOrderValues(
  params: EIP712IsolatedOrderParams,
): EIP712IsolatedOrderValues {
  return {
    ...getOrderValues(params),
    margin: toIntegerString(params.margin),
  };
}

function getListTriggerOrdersValues(
  params: EIP712ListTriggerOrdersParams,
): EIP712ListTriggerOrdersValues {
  return {
    recvTime: toIntegerString(params.recvTime),
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
  };
}

function getOrderCancellationValues(
  params: EIP712CancelOrdersParams,
): EIP712OrderCancellationValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    productIds: params.productIds,
    digests: params.digests,
    nonce: params.nonce,
  };
}

function getProductOrdersCancellationValues(
  params: EIP712CancelProductOrdersParams,
): EIP712ProductOrdersCancellationValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    productIds: params.productIds,
    nonce: params.nonce,
  };
}

function getLiquidateSubaccountValues(
  params: EIP712LiquidateSubaccountParams,
): EIP712LiquidateSubaccountValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    liquidatee: subaccountToHex({
      subaccountOwner: params.liquidateeOwner,
      subaccountName: params.liquidateeName,
    }),
    mode: params.mode,
    healthGroup: toIntegerString(params.healthGroup),
    amount: toIntegerString(params.amount),
    nonce: params.nonce,
  };
}

function getLinkSignerValues(
  params: EIP712LinkSignerParams,
): EIP712LinkSignerValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    signer: params.signer,
    nonce: params.nonce,
  };
}

function getTransferQuoteValues(
  params: EIP712TransferQuoteParams,
): EIP712TransferQuoteValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    recipient: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.recipientSubaccountName,
    }),
    amount: toIntegerString(params.amount),
    nonce: params.nonce,
  };
}

function getLeaderboardAuthenticationValues(
  params: EIP712LeaderboardAuthenticationParams,
): EIP712LeaderboardAuthenticationValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    expiration: toIntegerString(params.expiration),
  };
}

function getMintVlpValues(params: EIP712MintVlpParams): EIP712MintVlpValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    quoteAmount: toIntegerString(params.quoteAmount),
    nonce: params.nonce,
  };
}

function getBurnVlpValues(params: EIP712BurnVlpParams): EIP712BurnVlpValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    vlpAmount: toIntegerString(params.vlpAmount),
    nonce: params.nonce,
  };
}
