import { describe, expect, it } from '@jest/globals';
import { NUANZE_API_BASE_URL, resolveNuanzeBaseUrl } from './endpoints';
import { NuanzeConfigError } from './errors';

describe('resolveNuanzeBaseUrl', () => {
  it('defaults to the canonical versioned endpoint', () => {
    expect(NUANZE_API_BASE_URL).toBe('https://api.nuanze.co/v1');
    expect(resolveNuanzeBaseUrl()).toBe(NUANZE_API_BASE_URL);
  });

  it('strips trailing slashes so path joining stays unambiguous', () => {
    expect(resolveNuanzeBaseUrl('https://api.nuanze.co/v1/')).toBe(
      NUANZE_API_BASE_URL,
    );
    expect(resolveNuanzeBaseUrl('https://api.nuanze.co/v1//')).toBe(
      NUANZE_API_BASE_URL,
    );
  });

  it('accepts a private host, a port, and a path prefix for staging', () => {
    expect(resolveNuanzeBaseUrl('http://127.0.0.1:8787')).toBe(
      'http://127.0.0.1:8787',
    );
    expect(resolveNuanzeBaseUrl('https://staging.example.com/api/v1')).toBe(
      'https://staging.example.com/api/v1',
    );
  });

  it('rejects a value that is not a parseable URL', () => {
    for (const rejected of [
      '',
      '   ',
      'not a url',
      '/v1',
      'api.nuanze.co/v1',
    ]) {
      expect(() => resolveNuanzeBaseUrl(rejected)).toThrow(NuanzeConfigError);
    }
  });

  it('rejects a scheme that would bypass HTTP entirely', () => {
    for (const rejected of [
      'ftp://api.nuanze.co/v1',
      'file:///etc/passwd',
      'data:text/plain,hello',
      'ws://api.nuanze.co/v1',
    ]) {
      expect(() => resolveNuanzeBaseUrl(rejected)).toThrow(NuanzeConfigError);
    }
  });

  it('names the offending scheme, so the failure is actionable', () => {
    expect(() => resolveNuanzeBaseUrl('ftp://api.nuanze.co/v1')).toThrow(
      /received ftp/,
    );
  });
});
