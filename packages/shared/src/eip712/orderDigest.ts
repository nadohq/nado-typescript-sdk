import { hashTypedData } from 'viem';
import { getNadoEIP712Domain } from './getNadoEIP712Domain';
import { getNadoEIP712PrimaryType } from './getNadoEIP712PrimaryType';
import { getNadoEIP712Types } from './getNadoEIP712Types';
import { getNadoEIP712Values } from './getNadoEIP712Values';
import { getOrderVerifyingAddress } from './getOrderVerifyingAddress';
import { EIP712OrderParams } from './signatureParamTypes';

interface OrderDigestParams {
  order: EIP712OrderParams;
  chainId: number;
  productId: number;
}

/**
 * Returns the EIP712 digest for an order
 *
 * @param params
 */
export function getOrderDigest(params: OrderDigestParams): string {
  const { chainId, order, productId } = params;
  return hashTypedData({
    domain: getNadoEIP712Domain(getOrderVerifyingAddress(productId), chainId),
    message: getNadoEIP712Values('place_order', order),
    primaryType: getNadoEIP712PrimaryType('place_order'),
    types: getNadoEIP712Types('place_order'),
  });
}
