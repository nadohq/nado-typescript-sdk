import { getNadoEIP712Types } from './getNadoEIP712Types';
import { SignableRequestType } from './signableRequestType';

/**
 * Return the primary EIP712 type for a given request
 *
 * @param requestType
 */
export function getNadoEIP712PrimaryType(requestType: SignableRequestType) {
  const types = getNadoEIP712Types(requestType);
  // We assume the first key is the primary type. Currently, all Nado EIP712 messages only have one type
  return Object.keys(types)[0];
}
