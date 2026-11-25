import { describe, expect, it } from '@jest/globals';
import { NADO_CLIENT_TYPE_HEADER } from '@nadohq/shared';
import { AxiosHeaders } from 'axios';
import { MobileClient, MobileClientOpts } from './MobileClient';
import {
  getMobileClientHeaders,
  NADO_CLIENT_APP_VERSION_HEADER,
  NADO_CLIENT_PLATFORM_HEADER,
} from './utils/clientHeaders';

const url = 'https://mobile.example/mobile/v1';

/** Sends one public query through the client and returns the headers it went out with. */
async function captureRequestHeaders(
  opts: Omit<MobileClientOpts, 'url'>,
): Promise<AxiosHeaders> {
  const client = new MobileClient({ url, ...opts });
  let headers: AxiosHeaders | undefined;
  client.axiosInstance.defaults.adapter = (config) => {
    headers = AxiosHeaders.from(config.headers);
    return Promise.resolve({
      data: { status: 'success', presets: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
  };

  await client.getAvatarPresets();

  if (!headers) {
    throw new Error('No request was sent');
  }
  return headers;
}

describe('getMobileClientHeaders', () => {
  it('returns no headers when nothing is given', () => {
    expect(getMobileClientHeaders({})).toEqual({});
  });

  it('includes the client type, platform and app version when given', () => {
    expect(
      getMobileClientHeaders({
        clientType: 'mobile',
        clientPlatform: 'ios',
        clientAppVersion: 'v1.2.0 b67',
      }),
    ).toEqual({
      [NADO_CLIENT_TYPE_HEADER]: 'mobile',
      [NADO_CLIENT_PLATFORM_HEADER]: 'ios',
      [NADO_CLIENT_APP_VERSION_HEADER]: 'v1.2.0 b67',
    });
  });

  it('omits a blank platform or app version', () => {
    expect(
      getMobileClientHeaders({
        clientType: 'mobile',
        clientPlatform: '',
        clientAppVersion: '   ',
      }),
    ).toEqual({ [NADO_CLIENT_TYPE_HEADER]: 'mobile' });
  });

  it('trims the platform and app version', () => {
    expect(
      getMobileClientHeaders({
        clientPlatform: ' android ',
        clientAppVersion: '\tv1.2.0 b67\n',
      }),
    ).toEqual({
      [NADO_CLIENT_PLATFORM_HEADER]: 'android',
      [NADO_CLIENT_APP_VERSION_HEADER]: 'v1.2.0 b67',
    });
  });
});

describe('MobileClient request headers', () => {
  it('sends the client type, platform and app version with every request', async () => {
    const headers = await captureRequestHeaders({
      clientType: 'mobile',
      clientPlatform: 'ios',
      clientAppVersion: 'v1.2.0 b67',
    });

    expect(headers.get(NADO_CLIENT_TYPE_HEADER)).toBe('mobile');
    expect(headers.get(NADO_CLIENT_PLATFORM_HEADER)).toBe('ios');
    expect(headers.get(NADO_CLIENT_APP_VERSION_HEADER)).toBe('v1.2.0 b67');
  });

  it('omits the platform and app version when unset', async () => {
    const headers = await captureRequestHeaders({ clientType: 'mobile' });

    expect(headers.get(NADO_CLIENT_TYPE_HEADER)).toBe('mobile');
    expect(headers.has(NADO_CLIENT_PLATFORM_HEADER)).toBe(false);
    expect(headers.has(NADO_CLIENT_APP_VERSION_HEADER)).toBe(false);
  });

  it('omits the platform and app version when blank', async () => {
    const headers = await captureRequestHeaders({
      clientPlatform: ' ',
      clientAppVersion: '',
    });

    expect(headers.has(NADO_CLIENT_TYPE_HEADER)).toBe(false);
    expect(headers.has(NADO_CLIENT_PLATFORM_HEADER)).toBe(false);
    expect(headers.has(NADO_CLIENT_APP_VERSION_HEADER)).toBe(false);
  });
});
