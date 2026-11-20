import { describe, expect, it } from '@jest/globals';
import { Subaccount, subaccountToHex } from '@nadohq/shared';
import { MobileClient } from './MobileClient';
import {
  GetMobilePositionLookupParams,
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
} from './types';

const subaccount: Subaccount = {
  subaccountOwner: '0x1111111111111111111111111111111111111111',
  subaccountName: 'default',
};
const positionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const openId = '9007199254740993';

function createParams(
  overrides: Partial<GetMobilePositionLookupParams> = {},
): GetMobilePositionLookupParams {
  return {
    subaccount,
    productId: 4,
    marginMode: 'cross',
    direction: 'long',
    openId,
    ...overrides,
  };
}

function mockClient(
  data: unknown = { status: 'success', position_id: positionId },
  httpStatus = 200,
) {
  const client = new MobileClient({ url: 'https://mobile.example/v1/mobile' });
  const requests: Array<{
    url: string | undefined;
    method: string | undefined;
    body: Record<string, unknown>;
  }> = [];
  client.axiosInstance.defaults.adapter = (config) => {
    requests.push({
      url: config.url,
      method: config.method,
      body: JSON.parse(String(config.data)) as Record<string, unknown>,
    });
    return Promise.resolve({
      data,
      status: httpStatus,
      statusText: 'mock',
      headers: {},
      config,
    });
  };
  return { client, requests };
}

describe('MobileClient', () => {
  describe('getPositionLookup', () => {
    it.each([
      ['cross', 'long'],
      ['cross', 'short'],
      ['isolated', 'long'],
      ['isolated', 'short'],
    ] as const)(
      'looks up a %s %s lifecycle publicly without losing opening-index precision',
      async (marginMode, direction) => {
        const { client, requests } = mockClient();
        const params = createParams({ marginMode, direction });

        await expect(client.getPositionLookup(params)).resolves.toEqual({
          positionId,
        });

        expect(requests).toEqual([
          {
            url: 'https://mobile.example/v1/mobile/public_query',
            method: 'post',
            body: {
              type: 'position_lookup',
              subaccount: subaccountToHex(subaccount),
              product_id: 4,
              margin_mode: marginMode,
              direction,
              open_id: openId,
            },
          },
        ]);
        expect(params).toEqual(createParams({ marginMode, direction }));
      },
    );

    it.each([
      [200, MOBILE_ERROR_CODES.INVALID_SOCIAL_FEED_PARAMS],
      [404, MOBILE_ERROR_CODES.SOCIAL_FEED_CONTENT_UNAVAILABLE],
      [503, MOBILE_ERROR_CODES.SOCIAL_FEED_DATA_UNAVAILABLE],
    ])(
      'preserves structured lookup failures (%i/%i)',
      async (httpStatus, errorCode) => {
        const failure = {
          status: 'failure',
          error: 'Position lookup failed',
          error_code: errorCode,
          request_type: 'public_query_position_lookup',
        };
        const { client, requests } = mockClient(failure, httpStatus);
        const result = client.getPositionLookup(createParams());

        await expect(result).rejects.toBeInstanceOf(MobileServerFailureError);
        await expect(result).rejects.toMatchObject({
          errorCode,
          httpStatus,
          requestType: 'public_query_position_lookup',
          responseData: failure,
        });
        expect(requests).toHaveLength(1);
      },
    );
  });
});
