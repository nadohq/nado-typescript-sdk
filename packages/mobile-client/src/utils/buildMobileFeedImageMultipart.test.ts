import { describe, expect, it } from '@jest/globals';
import { buildMobileFeedImageMultipart } from './buildMobileFeedImageMultipart';

describe('buildMobileFeedImageMultipart', () => {
  it('emits payload and file parts with a boundary Content-Type', () => {
    const fileBytes = new Uint8Array([1, 2, 3, 4]);
    const { body, contentType } = buildMobileFeedImageMultipart(
      '{"type":"create_feed_post_image_uploads"}',
      fileBytes,
      'shot.png',
    );
    const text = String.fromCharCode(...body);
    expect(contentType.startsWith('multipart/form-data; boundary=')).toBe(true);
    expect(text).toContain('name="payload"');
    expect(text).toContain('name="file"; filename="shot.png"');
    expect(text).toContain('{"type":"create_feed_post_image_uploads"}');
    expect(Array.from(body.slice(text.indexOf('\r\n\r\n') + 4))).toEqual(
      expect.arrayContaining([1, 2, 3, 4]),
    );
  });
});
