import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { buildMobileFeedImageMultipart } from './buildMobileFeedImageMultipart';

describe('buildMobileFeedImageMultipart', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps multipart overhead fixed across timestamp and random boundary lengths', () => {
    const payload = '{"type":"create_feed_post_image_uploads"}';
    const fileBytes = new Uint8Array([0, 1, 255]);
    const expected = buildMobileFeedImageMultipart(payload, fileBytes);
    for (const timestamp of [0, 1_700_000_000_000, 8_640_000_000_000_000]) {
      for (const random of [0, 0.000001, 0.5, 0.999999]) {
        jest.spyOn(Date, 'now').mockReturnValue(timestamp);
        jest.spyOn(Math, 'random').mockReturnValue(random);
        const actual = buildMobileFeedImageMultipart(payload, fileBytes);
        expect(actual.body.byteLength).toBe(expected.body.byteLength);
        expect(actual.contentType.length).toBe(expected.contentType.length);
      }
    }
  });

  it('emits payload and file parts with a boundary Content-Type', () => {
    const fileBytes = new Uint8Array([0, 1, 127, 128, 255, 13, 10]);
    const { body, contentType } = buildMobileFeedImageMultipart(
      '{"type":"create_feed_post_image_uploads"}',
      fileBytes,
    );
    const text = String.fromCharCode(...body);
    expect(contentType.startsWith('multipart/form-data; boundary=')).toBe(true);
    expect(text).toContain('name="payload"');
    expect(text).toContain('name="file"; filename="image"');
    expect(text).toContain('{"type":"create_feed_post_image_uploads"}');
    const boundary = contentType.split('boundary=')[1];
    const fileStart = text.indexOf('\r\n\r\n', text.indexOf('name="file"')) + 4;
    expect(body.slice(fileStart, fileStart + fileBytes.length)).toEqual(
      fileBytes,
    );
    expect(text.slice(fileStart + fileBytes.length)).toBe(
      `\r\n--${boundary}--\r\n`,
    );
    expect(text.startsWith(`--${boundary}\r\n`)).toBe(true);
  });
});
