import type { NadoClient, NadoClientContext } from '@nadohq/client';
import * as barrel from '@nadohq/client';
import * as nuanze from '@nadohq/nuanze-client';
import { NuanzeClient } from '@nadohq/nuanze-client';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * Every public runtime export of the package is either `Nuanze`/`NUANZE_`
 * prefixed or a `verb + Nuanze` helper, so nothing can collide inside the
 * `@nadohq/client` barrel.
 */
const NUANZE_PUBLIC_NAME =
  /^(NUANZE_[A-Z0-9_]+|Nuanze[A-Za-z]*|[a-z][A-Za-z]*Nuanze[A-Za-z]*)$/;

/** Members that would imply the client signs, authenticates, or holds a key. */
const CREDENTIAL_SHAPED =
  /sign|wallet|signer|account|privateKey|apiKey|secret|nonce|chainEnv/i;

void describe('[nuanze-client]: public surface', () => {
  void test('takes no wallet, signer, chain, or credential options', () => {
    // Each unknown option is ignored at runtime; the point of these is that the
    // compiler rejects them, which is what keeps the client credential-free.

    // @ts-expect-error - the API is public, so there is no wallet client option
    const withWallet = new NuanzeClient({ walletClient: {} });
    // @ts-expect-error - Nuanze is not chain-scoped, so there is no chain environment
    const withChainEnv = new NuanzeClient({ chainEnv: 'inkMainnet' });
    // @ts-expect-error - nothing is ever signed, so there is no linked signer
    const withSigner = new NuanzeClient({ linkedSignerWalletClient: {} });
    // @ts-expect-error - the API accepts no credentials, so there is no API key
    const withApiKey = new NuanzeClient({ apiKey: 'nope' });

    for (const client of [withWallet, withChainEnv, withSigner, withApiKey]) {
      assert.ok(client instanceof NuanzeClient);
    }
  });

  void test('exposes no signer-shaped members on the instance or prototype', () => {
    const client = new NuanzeClient();

    assert.deepEqual(Object.keys(client), ['transport']);

    const members = [
      ...Object.keys(client),
      ...Object.getOwnPropertyNames(NuanzeClient.prototype),
    ];
    for (const member of members) {
      assert.doesNotMatch(
        member,
        CREDENTIAL_SHAPED,
        `NuanzeClient.${member} suggests credential handling the client must not have`,
      );
    }
  });

  void test('is absent from NadoClientContext and NadoClient', () => {
    // These fail to compile the moment Nuanze is wired into the composed client,
    // which the integration contract forbids: it stays standalone.

    // @ts-expect-error - the context must not carry a Nuanze instance
    const contextMember: NadoClientContext['nuanze'] = undefined;
    // @ts-expect-error - the composed client must not expose a Nuanze namespace
    const clientMember: NadoClient['nuanze'] = undefined;

    assert.equal(contextMember, undefined);
    assert.equal(clientMember, undefined);
  });

  void describe('@nadohq/client re-export', () => {
    void test('re-exports every runtime value by identity, not by copy', () => {
      const reexported = barrel as unknown as Record<string, unknown>;

      for (const [name, value] of Object.entries(nuanze)) {
        assert.equal(
          reexported[name],
          value,
          `@nadohq/client must re-export the same ${name}, not a duplicate module instance`,
        );
      }
    });

    void test('publishes only names that cannot collide in the barrel', () => {
      for (const name of Object.keys(nuanze)) {
        assert.match(
          name,
          NUANZE_PUBLIC_NAME,
          `${name} is not Nuanze-prefixed, so re-exporting it could shadow another package`,
        );
      }
    });

    void test('serves a working client through the barrel entrypoint', () => {
      assert.equal(barrel.NuanzeClient, NuanzeClient);
      assert.equal(barrel.NUANZE_API_BASE_URL, nuanze.NUANZE_API_BASE_URL);
      assert.ok(new barrel.NuanzeClient() instanceof NuanzeClient);
    });
  });
});
