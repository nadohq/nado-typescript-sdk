import { describe, expect, it } from '@jest/globals';
import { NuanzeApiError } from './NuanzeApiError';
import {
  NUANZE_BODY_PREVIEW_LIMIT,
  NuanzeResponseError,
  nuanzeBodyPreview,
} from './NuanzeResponseError';
import { NuanzeTimeoutError } from './NuanzeTimeoutError';

const NO_RATE_LIMIT = {
  limit: null,
  remaining: null,
  reset: null,
  retryAfterSeconds: null,
};

describe('nuanzeBodyPreview', () => {
  it('collapses whitespace so a preview cannot span log lines', () => {
    expect(nuanzeBodyPreview('<html>\n  <body>\tdown</body>\n</html>')).toBe(
      '<html> <body> down</body> </html>',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(nuanzeBodyPreview('   oops   ')).toBe('oops');
    expect(nuanzeBodyPreview('')).toBe('');
  });

  it('keeps a short body verbatim', () => {
    expect(nuanzeBodyPreview('{"error":"nope"}')).toBe('{"error":"nope"}');
  });

  it('truncates a long body and marks it as truncated', () => {
    const preview = nuanzeBodyPreview(
      'x'.repeat(NUANZE_BODY_PREVIEW_LIMIT + 100),
    );

    expect(preview).toHaveLength(NUANZE_BODY_PREVIEW_LIMIT + 1);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('keeps a body exactly at the limit unmarked', () => {
    const preview = nuanzeBodyPreview('x'.repeat(NUANZE_BODY_PREVIEW_LIMIT));

    expect(preview).toHaveLength(NUANZE_BODY_PREVIEW_LIMIT);
    expect(preview.endsWith('…')).toBe(false);
  });
});

describe('error hierarchy', () => {
  it('keeps each failure mode distinguishable without parsing messages', () => {
    const api = new NuanzeApiError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Request parameters are invalid.',
      requestId: 'req-1234-5678',
      rateLimit: NO_RATE_LIMIT,
    });
    const response = new NuanzeResponseError('malformed', {
      status: 502,
      requestId: null,
      bodyPreview: '<html>',
      rateLimit: NO_RATE_LIMIT,
    });
    const timeout = new NuanzeTimeoutError('/markets', 10_000);

    expect(api).toBeInstanceOf(Error);
    expect(api).not.toBeInstanceOf(NuanzeResponseError);
    expect(response).not.toBeInstanceOf(NuanzeApiError);
    expect(timeout).not.toBeInstanceOf(NuanzeApiError);

    expect(api.name).toBe('NuanzeApiError');
    expect(response.name).toBe('NuanzeResponseError');
    expect(timeout.name).toBe('NuanzeTimeoutError');
  });

  it('reports the timeout budget and path in the message', () => {
    const timeout = new NuanzeTimeoutError('/markets', 250);

    expect(timeout.message).toBe(
      'Nuanze request to /markets timed out after 250ms.',
    );
    expect(timeout.timeoutMs).toBe(250);
    expect(timeout.path).toBe('/markets');
  });

  it('retains the underlying cause when one was wrapped', () => {
    const cause = new Error('unexpected token < in JSON');
    const response = new NuanzeResponseError('malformed', {
      status: 200,
      requestId: 'req-1234-5678',
      bodyPreview: '<html>',
      rateLimit: NO_RATE_LIMIT,
      cause,
    });

    expect(response.cause).toBe(cause);
    expect(
      new NuanzeResponseError('malformed', {
        status: 200,
        requestId: null,
        bodyPreview: '',
        rateLimit: NO_RATE_LIMIT,
      }).cause,
    ).toBeUndefined();
  });
});
