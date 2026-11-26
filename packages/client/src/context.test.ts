import { describe, expect, it } from '@jest/globals';
import {
  NADO_CLIENT_APP_VERSION_HEADER,
  NADO_CLIENT_PLATFORM_HEADER,
} from '@nadohq/mobile-client';
import { NADO_CLIENT_TYPE_HEADER } from '@nadohq/shared';
import { createPublicClient, http } from 'viem';
import { createClientContext } from './context';

const publicClient = createPublicClient({
  transport: http('http://localhost:8545'),
});

function defaultHeaders({
  axiosInstance,
}: {
  axiosInstance: { defaults: { headers: object } };
}): Record<string, unknown> {
  return { ...axiosInstance.defaults.headers };
}

describe('createClientContext client identity headers', () => {
  const context = createClientContext(
    {
      chainEnv: 'inkTestnet',
      clientType: 'mobile',
      clientPlatform: 'android',
      clientAppVersion: 'v1.2.0 b67',
    },
    { publicClient },
  );

  it('keeps the client identity on the context', () => {
    expect(context.clientType).toBe('mobile');
    expect(context.clientPlatform).toBe('android');
    expect(context.clientAppVersion).toBe('v1.2.0 b67');
  });

  it('sends the platform and app version to the mobile client', () => {
    const headers = defaultHeaders(context.mobileClient);

    expect(headers[NADO_CLIENT_TYPE_HEADER]).toBe('mobile');
    expect(headers[NADO_CLIENT_PLATFORM_HEADER]).toBe('android');
    expect(headers[NADO_CLIENT_APP_VERSION_HEADER]).toBe('v1.2.0 b67');
  });

  it.each([
    ['engine', context.engineClient],
    ['indexer', context.indexerClient],
    ['trigger', context.triggerClient],
    ['otc', context.otcClient],
    ['nuanze', context.nuanzeClient],
  ])('keeps the platform and app version off the %s client', (_, client) => {
    const headers = defaultHeaders(client);

    expect(headers).not.toHaveProperty([NADO_CLIENT_PLATFORM_HEADER]);
    expect(headers).not.toHaveProperty([NADO_CLIENT_APP_VERSION_HEADER]);
  });
});
