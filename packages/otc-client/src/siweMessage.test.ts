import { describe, expect, it } from '@jest/globals';
import { buildOtcSiweMessage } from './siweMessage';

describe('buildOtcSiweMessage', () => {
  it('matches the documented message layout', () => {
    expect(
      buildOtcSiweMessage({
        domain: 'testnet.nado.xyz',
        uri: 'https://testnet.nado.xyz',
        address: '0x1111111111111111111111111111111111111111',
        chainId: 763373,
        nonce: 'Qm3Ys8Pd5Hc1Ja6R',
        issuedAtMs: Date.UTC(2026, 9, 6, 12),
        sender:
          '0x111111111111111111111111111111111111111164656661756c740000000000',
      }),
    ).toBe(
      [
        'testnet.nado.xyz wants you to sign in with your Ethereum account:',
        '0x1111111111111111111111111111111111111111',
        '',
        'Sign in to read Nado OTC quotes. This signature cannot place or authorize trades.',
        '',
        'URI: https://testnet.nado.xyz',
        'Version: 1',
        'Chain ID: 763373',
        'Nonce: Qm3Ys8Pd5Hc1Ja6R',
        'Issued At: 2026-10-06T12:00:00.000Z',
        'Resources:',
        '- urn:nado:subaccount:0x111111111111111111111111111111111111111164656661756c740000000000',
      ].join('\n'),
    );
  });
});
