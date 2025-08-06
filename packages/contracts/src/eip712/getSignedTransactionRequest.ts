import { WalletClientWithAccount } from '../common';
import { getNadoEIP712Domain } from './getNadoEIP712Domain';
import { getNadoEIP712PrimaryType } from './getNadoEIP712PrimaryType';
import { getNadoEIP712Types } from './getNadoEIP712Types';
import { getNadoEIP712Values } from './getNadoEIP712Values';
import {
  SignableRequestType,
  SignableRequestTypeToParams,
} from './signableRequestType';

interface Params<TReqType extends SignableRequestType> {
  requestType: TReqType;
  requestParams: SignableRequestTypeToParams[TReqType];
  // Allow explicit definition of `chainId` to enable signing for different chains
  chainId: number;
  // Orderbook for orders, Sequencer for other requests
  verifyingContract: string;
  walletClient: WalletClientWithAccount;
}

export function getSignedTransactionRequest<
  TReqType extends SignableRequestType,
>(params: Params<TReqType>) {
  return params.walletClient.signTypedData({
    domain: getNadoEIP712Domain(params.verifyingContract, params.chainId),
    types: getNadoEIP712Types(params.requestType),
    primaryType: getNadoEIP712PrimaryType(params.requestType),
    message: getNadoEIP712Values(params.requestType, params.requestParams),
  });
}
