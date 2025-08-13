import { hashTypedData } from 'viem';
import { getNadoEIP712Domain } from './getNadoEIP712Domain';
import { getNadoEIP712PrimaryType } from './getNadoEIP712PrimaryType';
import { getNadoEIP712Types } from './getNadoEIP712Types';
import { getNadoEIP712Values } from './getNadoEIP712Values';
import { EIP712OrderParams } from './signatureParamTypes';

interface OrderDigestParams {
  order: EIP712OrderParams;
  verifyingAddr: string;
  chainId: number;
}

/**
 * Returns the EIP712 digest for an order
 *
 * @param params
 */
export function getOrderDigest(params: OrderDigestParams): string {
  const { chainId, order, verifyingAddr } = params;
  return hashTypedData({
    domain: getNadoEIP712Domain(verifyingAddr, chainId),
    message: getNadoEIP712Values('place_order', order),
    primaryType: getNadoEIP712PrimaryType('place_order'),
    types: getNadoEIP712Types('place_order'),
  });
}
