import { describe, expect, it } from '@jest/globals';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';
import { MobileClient } from './MobileClient';

// Offline only: Axios never reaches the network and the wallet signs locally.
const account = privateKeyToAccount(
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b786907',
);
const signedParams = {
  subaccountOwner: account.address,
  subaccountName: 'default',
  chainId: ink.id,
  verifyingAddr: '0x0000000000000000000000000000000000000001',
};

function createClient(response: object) {
  const requests: { url: string | undefined; body: unknown }[] = [];
  const client = new MobileClient({
    url: 'https://mobile.example',
    walletClient: createWalletClient({
      account,
      chain: ink,
      transport: http(),
    }),
  });
  client.axiosInstance.defaults.adapter = (config) => {
    requests.push({
      url: config.url,
      body: JSON.parse(String(config.data)) as unknown,
    });
    return Promise.resolve({
      config,
      data: { status: 'success', ...response },
      status: 200,
      statusText: 'OK',
      headers: {},
    });
  };
  return { client, requests };
}

describe('[mobile-client]: profile transport (offline)', () => {
  it('maps preset and upload responses without changing required PUT headers', async () => {
    const presets = createClient({
      presets: [
        { id: 'penguin', avatar_url: 'https://images.example/penguin.jpg' },
      ],
    });
    expect(await presets.client.getAvatarPresets()).toEqual([
      { id: 'penguin', avatarUrl: 'https://images.example/penguin.jpg' },
    ]);
    expect(presets.requests[0]).toEqual({
      url: 'https://mobile.example/public_query',
      body: { type: 'avatar_presets' },
    });
    const headers = {
      'content-type': 'image/jpeg',
      'x-amz-meta-owner': 'owner',
    };
    const upload = createClient({
      upload_key: 'staging/avatars/test',
      upload_url: 'https://upload.example',
      headers,
    });
    expect(
      await upload.client.createAvatarUpload({
        ...signedParams,
        contentLength: 12345,
      }),
    ).toEqual({
      uploadKey: 'staging/avatars/test',
      uploadUrl: 'https://upload.example',
      headers,
    });
    expect(upload.requests[0].body).toMatchObject({
      type: 'create_avatar_upload',
      content_length: 12345,
      signature: expect.stringMatching(/^0x[\da-f]+$/i),
    });
  });

  it('signs bio and each avatar selection using the backend wire format', async () => {
    const { client, requests } = createClient({});
    await client.setBio({ ...signedParams, bio: 'Trading 🚀' });
    await client.setAvatar({
      ...signedParams,
      avatar: { type: 'preset', id: 'penguin' },
    });
    await client.setAvatar({
      ...signedParams,
      avatar: { type: 'upload', uploadKey: 'staging/avatars/test' },
    });
    await client.setAvatar({ ...signedParams, avatar: null });
    const payloads = [
      { type: 'set_bio', bio: 'Trading 🚀' },
      { type: 'set_avatar', avatar: { type: 'preset', id: 'penguin' } },
      {
        type: 'set_avatar',
        avatar: { type: 'upload', upload_key: 'staging/avatars/test' },
      },
      { type: 'set_avatar', avatar: null },
    ];
    requests.forEach(({ url, body }, index) => {
      expect(url).toBe('https://mobile.example/execute');
      expect(body).toMatchObject({
        ...payloads[index],
        signature: expect.stringMatching(/^0x[\da-f]+$/i),
      });
    });
  });
});
