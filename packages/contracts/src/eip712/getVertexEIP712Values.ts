import {
  SignableRequestType,
  SignableRequestTypeToParams,
} from './signableRequestType';
import {
  EIP712BurnLpParams,
  EIP712LinkSignerParams,
  EIP712LiquidateSubaccountParams,
  EIP712ListTriggerOrdersParams,
  EIP712MintLpParams,
  EIP712CancelOrdersParams,
  EIP712OrderParams,
  EIP712CancelProductOrdersParams,
  EIP712WithdrawCollateralParams,
  EIP712TransferQuoteParams,
} from './signatureParamTypes';
import { toX18 } from '@vertex-protocol/utils';
import { subaccountToHex } from '../utils';
import {
  EIP712BurnLpValues,
  EIP712LinkSignerValues,
  EIP712LiquidateSubaccountValues,
  EIP712ListTriggerOrdersValues,
  EIP712MintLpValues,
  EIP712OrderCancellationValues,
  EIP712OrderValues,
  EIP712ProductOrdersCancellationValues,
  EIP712TransferQuoteValues,
  EIP712WithdrawCollateralValues,
  SignableRequestTypeToEIP712Values,
} from './eip712ValueTypes';

/**
 * Returns the EIP712 compatible values for signing.
 *
 * Note: We use the string representation of bigint to be compatible with JSON.stringify
 *
 * @param requestType
 * @param params
 */
export function getVertexEIP712Values<TReqType extends SignableRequestType>(
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
    case 'mint_lp':
      values = getMintLpValues(params as EIP712MintLpParams);
      break;
    case 'burn_lp':
      values = getBurnLpValues(params as EIP712BurnLpParams);
      break;
    case 'place_order':
      values = getOrderValues(params as EIP712OrderParams);
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
    default:
      throw Error(`Unknown request type: ${requestType}`);
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
    amount: BigInt(params.amount).toString(),
    nonce: BigInt(params.nonce).toString(),
  };
}

function getMintLpValues(params: EIP712MintLpParams): EIP712MintLpValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    productId: params.productId,
    amountBase: params.amountBase.toString(),
    quoteAmountLow: params.quoteAmountLow.toString(),
    quoteAmountHigh: params.quoteAmountHigh.toString(),
    nonce: BigInt(params.nonce).toString(),
  };
}

function getBurnLpValues(params: EIP712BurnLpParams): EIP712BurnLpValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    productId: params.productId,
    amount: params.amount.toString(),
    nonce: BigInt(params.nonce).toString(),
  };
}

function getOrderValues(params: EIP712OrderParams): EIP712OrderValues {
  return {
    sender: subaccountToHex({
      subaccountOwner: params.subaccountOwner,
      subaccountName: params.subaccountName,
    }),
    priceX18: toX18(params.price).toString(),
    amount: BigInt(params.amount).toString(),
    expiration: BigInt(params.expiration).toString(),
    nonce: BigInt(params.nonce).toString(),
  };
}

function getListTriggerOrdersValues(
  params: EIP712ListTriggerOrdersParams,
): EIP712ListTriggerOrdersValues {
  return {
    recvTime: BigInt(params.recvTime).toString(),
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
    nonce: BigInt(params.nonce).toString(),
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
    nonce: BigInt(params.nonce).toString(),
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
    healthGroup: params.healthGroup.toString(),
    amount: BigInt(params.amount).toString(),
    nonce: BigInt(params.nonce).toString(),
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
    nonce: BigInt(params.nonce).toString(),
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
    amount: BigInt(params.amount).toString(),
    nonce: BigInt(params.nonce).toString(),
  };
}
