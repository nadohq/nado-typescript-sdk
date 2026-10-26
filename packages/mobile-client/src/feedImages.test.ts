import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createWalletClient, http, keccak256, stringToBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ink } from 'viem/chains';
import { MobileClient } from './MobileClient';
import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  MobileServerFailureResponse,
  MobileServerSocialFeedImage,
} from './types';
import { MOBILE_FEED_IMAGE_MAX_REQUEST_BYTES } from './utils/feed';

const imagePath = '/v1/mobile/feed/images/test/standard';
const session = { sessionId: 'Session', viewerToken: 'Viewer' };
const imageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 127, 128, 255]);

function mockImageClient(data: ArrayBuffer | Uint8Array, status = 200) {
  const client = new MobileClient({ url: 'https://mobile.example/mobile/v1' });
  client.axiosInstance.defaults.adapter = (config) => {
    expect(config.url).toBe(
      'https://mobile.example/mobile/v1/feed/images/test/standard',
    );
    expect(config.method).toBe('get');
    expect(config.responseType).toBe('arraybuffer');
    expect(config.headers.get('x-feed-session-id')).toBe(session.sessionId);
    expect(config.headers.get('x-feed-viewer-token')).toBe(session.viewerToken);
    return Promise.resolve({
      data,
      status,
      statusText: 'mock',
      headers: {},
      config,
    });
  };
  return client;
}

describe('[mobile-client]: feed image reads', () => {
  it.each(['uint8array', 'arraybuffer'] as const)(
    'preserves successful image bytes from %s responses',
    async (format) => {
      const data =
        format === 'uint8array' ? imageBytes : imageBytes.slice().buffer;
      const client = mockImageClient(data);
      await expect(
        client.getFeedImageBytes({ ...session, path: imagePath }),
      ).resolves.toEqual(imageBytes);
    },
  );

  describe.each(['uint8array', 'arraybuffer'] as const)(
    '%s error responses',
    (format) => {
      it.each([
        [401, MOBILE_ERROR_CODES.SOCIAL_FEED_SESSION_EXPIRED],
        [403, MOBILE_ERROR_CODES.SOCIAL_FEED_SESSION_MISMATCH],
        [404, MOBILE_ERROR_CODES.SOCIAL_FEED_CONTENT_UNAVAILABLE],
      ])(
        'preserves the failure envelope for HTTP %i',
        async (status, errorCode) => {
          const failure: MobileServerFailureResponse = {
            status: 'failure',
            error: 'Image unavailable: \u56fe\u7247\u4e0d\u53ef\u7528',
            error_code: errorCode,
            request_type: 'feed_image',
          };
          const encoded = stringToBytes(JSON.stringify(failure));
          const data =
            format === 'uint8array' ? encoded : Uint8Array.from(encoded).buffer;
          const client = mockImageClient(data, status);
          const result = client.getFeedImageBytes({
            ...session,
            path: imagePath,
          });
          await expect(result).rejects.toBeInstanceOf(MobileServerFailureError);
          await expect(result).rejects.toMatchObject({
            errorCode,
            requestType: 'feed_image',
            httpStatus: status,
            responseData: failure,
          });
        },
      );
    },
  );

  it.each([
    '',
    '<html>Bad gateway</html>',
    '{invalid',
    '{"message":"unavailable"}',
  ])('keeps non-envelope failures as transport errors: %s', async (body) => {
    const client = mockImageClient(stringToBytes(body), 502);
    const result = client.getFeedImageBytes({ ...session, path: imagePath });
    await expect(result).rejects.not.toBeInstanceOf(MobileServerFailureError);
    await expect(result).rejects.toThrow(
      'Unexpected response from mobile service: 502',
    );
  });

  it.each([
    '/v1/mobile/feed/images/test/standard',
    '/feed/images/test/standard',
  ])('resolves the metadata path %s', (path) => {
    const client = new MobileClient({
      url: 'https://mobile.example/mobile/v1',
    });
    expect(client.resolveFeedImageUrl(path)).toBe(
      'https://mobile.example/mobile/v1/feed/images/test/standard',
    );
  });
});

describe('[mobile-client]: feed image uploads', () => {
  it.each([
    ['createFeedPostImageUpload', 'create_feed_post_image_uploads'],
    ['createFeedCommentImageUpload', 'create_feed_comment_image_uploads'],
  ] as const)('sends signed multipart bytes for %s', async (method, type) => {
    const account = privateKeyToAccount(
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b786907',
    );
    const client = new MobileClient({
      url: 'https://mobile.example/mobile/v1',
      walletClient: createWalletClient({
        account,
        chain: ink,
        transport: http(),
      }),
    });
    const image: MobileServerSocialFeedImage = {
      image_id: '88888888-8888-4888-8888-888888888888',
      url: imagePath,
      width: 1,
      height: 1,
      content_type: 'image/jpeg',
      byte_size: imageBytes.length,
      thumbnail: {
        url: '/v1/mobile/feed/images/test/thumbnail',
        width: 1,
        height: 1,
      },
    };
    client.axiosInstance.defaults.adapter = (config) => {
      expect(config.url).toBe('https://mobile.example/mobile/v1/execute');
      expect(config.method).toBe('post');
      expect(config.data).toBeInstanceOf(ArrayBuffer);
      const body = new Uint8Array(config.data as ArrayBuffer);
      const text = String.fromCharCode(...body);
      const contentType = config.headers.get('Content-Type');
      if (typeof contentType !== 'string')
        throw new Error('Expected multipart Content-Type');
      expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
      const boundary = contentType.split('boundary=')[1];
      const payloadStart = text.indexOf('\r\n\r\n') + 4;
      const payloadEnd = text.indexOf(`\r\n--${boundary}`, payloadStart);
      const payload = JSON.parse(
        text.slice(payloadStart, payloadEnd),
      ) as Record<string, unknown>;
      expect(payload).toMatchObject({
        type,
        content_hash: keccak256(imageBytes),
      });
      expect(payload.signature).toEqual(expect.stringMatching(/^0x[\da-f]+$/));
      const fileHeader = text.indexOf('name="file"; filename="image"');
      expect(fileHeader).toBeGreaterThan(payloadEnd);
      const fileStart = text.indexOf('\r\n\r\n', fileHeader) + 4;
      expect(
        new Uint8Array(body.subarray(fileStart, fileStart + imageBytes.length)),
      ).toEqual(imageBytes);
      expect(text.slice(fileStart + imageBytes.length)).toBe(
        `\r\n--${boundary}--\r\n`,
      );
      return Promise.resolve({
        data: { status: 'success', image },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    };
    await expect(
      client[method]({
        subaccountOwner: account.address,
        subaccountName: 'default',
        chainId: ink.id,
        verifyingAddr: '0x0000000000000000000000000000000000000001',
        fileBytes: imageBytes,
      }),
    ).resolves.toEqual({
      imageId: image.image_id,
      url: imagePath,
      width: 1,
      height: 1,
      contentType: 'image/jpeg',
      byteSize: imageBytes.length,
      thumbnail: image.thumbnail,
    });
  });
});

describe.each([
  'createFeedPostImageUpload',
  'createFeedCommentImageUpload',
] as const)('[mobile-client]: %s request size', (method) => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([-1, 0, 1])(
    'checks the complete body at the limit %+i',
    async (offset) => {
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const account = privateKeyToAccount(
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b786907',
      );
      const client = new MobileClient({
        url: 'https://mobile.example/mobile/v1',
        walletClient: createWalletClient({
          account,
          chain: ink,
          transport: http(),
        }),
      });
      const params = {
        subaccountOwner: account.address,
        subaccountName: 'default',
        chainId: ink.id,
        verifyingAddr: '0x0000000000000000000000000000000000000001',
        nonce: 1n,
      } as const;
      const post = jest.spyOn(client.axiosInstance, 'post').mockResolvedValue({
        data: {
          status: 'success',
          image: {
            image_id: 'test',
            url: imagePath,
            width: 1,
            height: 1,
            content_type: 'image/jpeg',
            byte_size: 0,
            thumbnail: { url: imagePath, width: 1, height: 1 },
          },
        },
        status: 200,
      });
      await client[method]({ ...params, fileBytes: new Uint8Array() });
      const emptyBody: unknown = post.mock.calls[0][1];
      if (!(emptyBody instanceof Uint8Array))
        throw new Error('Expected multipart bytes');
      post.mockClear();
      const fileBytes = new Uint8Array(
        MOBILE_FEED_IMAGE_MAX_REQUEST_BYTES - emptyBody.byteLength + offset,
      );
      const result = client[method]({ ...params, fileBytes });
      if (offset > 0) {
        await expect(result).rejects.toBeInstanceOf(RangeError);
        await expect(result).rejects.toThrow('2097152 bytes (2 MiB)');
        expect(post).not.toHaveBeenCalled();
      } else {
        await expect(result).resolves.toMatchObject({ imageId: 'test' });
        expect(post).toHaveBeenCalledTimes(1);
        const body: unknown = post.mock.calls[0][1];
        expect(body).toHaveProperty(
          'byteLength',
          MOBILE_FEED_IMAGE_MAX_REQUEST_BYTES + offset,
        );
      }
    },
  );
});
