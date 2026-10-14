import { OtcSiweMessageParams } from './types/clientTypes';

/**
 * Statement shown to the user when the owner wallet signs. The service does not check it.
 */
export const OTC_SIWE_STATEMENT =
  'Sign in to read Nado OTC quotes. This signature cannot place or authorize trades.';

/**
 * Builds the exact ERC-4361 text the OTC service verifies for private quote login. Sign it
 * with `personal_sign` and send it unchanged to `verifyAuth`.
 */
export function buildOtcSiweMessage({
  domain,
  uri,
  address,
  chainId,
  nonce,
  issuedAtMs,
  sender,
}: OtcSiweMessageParams): string {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    OTC_SIWE_STATEMENT,
    '',
    `URI: ${uri}`,
    'Version: 1',
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date(issuedAtMs).toISOString()}`,
    'Resources:',
    `- urn:nado:subaccount:${sender}`,
  ].join('\n');
}
