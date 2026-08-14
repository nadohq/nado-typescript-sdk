import { describe, expect, it } from '@jest/globals';
import { DEFAULT_NADO_CLIENT_TYPE, NADO_CLIENT_TYPE_HEADER } from '../types';
import { getNadoClientTypeHeaders } from './getNadoClientTypeHeaders';

describe('getNadoClientTypeHeaders', () => {
  it('uses the given client type', () => {
    expect(getNadoClientTypeHeaders('web')).toEqual({
      [NADO_CLIENT_TYPE_HEADER]: 'web',
    });
  });

  it('falls back to the default client type', () => {
    expect(getNadoClientTypeHeaders()).toEqual({
      [NADO_CLIENT_TYPE_HEADER]: DEFAULT_NADO_CLIENT_TYPE,
    });
  });
});
