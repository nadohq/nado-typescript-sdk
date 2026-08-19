import { getSignedTransactionRequest, subaccountToHex } from '@nadohq/shared';
import { canonicalizeMobileInner } from './canonicalize';
import { MOBILE_EIP712_METHOD_BY_TYPE } from './eip712MethodByType';
import { getMobileNonce } from './nonce';
import { getMobilePayloadHash } from './payloadHash';
import {
  BuildSignedMobileRequestParams,
  MobileSignedInner,
  MobileSignedRequest,
} from './types';

/**
 * Builds and signs a mobile service API request: canonicalizes the inner payload, derives `sender` from the
 * subaccount owner (never the signer), computes the EIP-712 `payloadHash`, signs the `NadoAuthentication`
 * typed data, and returns the flattened signed body ready to POST.
 */
export async function buildSignedMobileRequest<T extends MobileSignedInner>(
  params: BuildSignedMobileRequestParams & { inner: T },
): Promise<MobileSignedRequest<T>> {
  const {
    walletClient,
    subaccountOwner,
    subaccountName,
    chainId,
    verifyingAddr,
    inner,
  } = params;

  const canonicalInner = canonicalizeMobileInner(inner) as T;
  const sender = subaccountToHex({
    subaccountOwner,
    subaccountName,
  });
  const payloadHash = getMobilePayloadHash(canonicalInner);
  const nonce = params.nonce ?? getMobileNonce();
  const method = MOBILE_EIP712_METHOD_BY_TYPE[canonicalInner.type];

  const signature = await getSignedTransactionRequest({
    requestType: 'nado_authentication',
    requestParams: {
      method,
      subaccountOwner,
      subaccountName,
      payloadHash,
      nonce: nonce.toString(),
    },
    chainId,
    verifyingContract: verifyingAddr,
    walletClient,
  });

  return {
    ...canonicalInner,
    signature,
    sender,
    nonce: nonce.toString(),
  };
}
