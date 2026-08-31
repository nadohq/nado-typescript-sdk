import {
  NUANZE_NEWS_ENTITY_ROLES,
  NUANZE_NEWS_EVENT_TYPES,
  NUANZE_NEWS_SENTIMENTS,
  NuanzeNewsStory,
  NuanzeServerFailureError,
} from '@nadohq/nuanze-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArrayElements,
  assertEnumMember,
  assertNonEmptyString,
  assertNonNegativeInteger,
  assertNumber,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

void describe(
  '[nuanze-client]: news',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('lists published stories newest first', async () => {
      const response = await tc.nuanze.getNews({ limit: 10 });
      debugPrint('News', response);

      assert.match(
        response.asOf,
        ISO_UTC,
        'asOf should be a UTC ISO timestamp',
      );
      assert.ok(Array.isArray(response.stories), 'stories should be an array');
      assert.ok(
        response.nextCursor === null || typeof response.nextCursor === 'string',
        'nextCursor should be a string or null',
      );
      assertArrayElements(response.stories, assertNewsStoryShape, 'stories');
    });

    void test('rejects an unknown sentiment with BAD_REQUEST', async () => {
      try {
        await tc.nuanze.getNews({
          sentiment: 'euphoric' as (typeof NUANZE_NEWS_SENTIMENTS)[number],
        });
        assert.fail('expected BAD_REQUEST for an unknown sentiment');
      } catch (error) {
        assert.ok(
          error instanceof NuanzeServerFailureError,
          'should throw NuanzeServerFailureError',
        );
        assert.equal(error.errorCode, 'BAD_REQUEST');
        assert.equal(error.httpStatus, 400);
        assertNonEmptyString(error.requestId, 'error.requestId');
      }
    });
  },
);

function assertNewsStoryShape(story: NuanzeNewsStory, label: string): void {
  assertNonEmptyString(story.id, `${label}.id`);
  assertNonEmptyString(story.title, `${label}.title`);
  assertNonEmptyString(story.url, `${label}.url`);
  assertEnumMember(
    story.sentiment,
    NUANZE_NEWS_SENTIMENTS,
    `${label}.sentiment`,
  );
  assertNumber(story.sourceCount, `${label}.sourceCount`);
  assert.ok(story.sourceCount >= 1, `${label}.sourceCount should be >= 1`);

  if (story.publishedAt !== null) {
    assert.match(story.publishedAt, ISO_UTC, `${label}.publishedAt`);
  }
  if (story.eventType !== null) {
    assertEnumMember(
      story.eventType,
      NUANZE_NEWS_EVENT_TYPES,
      `${label}.eventType`,
    );
  }

  for (const [i, entity] of story.entities.entries()) {
    assertNonEmptyString(entity.key, `${label}.entities[${i}].key`);
    assertNonEmptyString(entity.name, `${label}.entities[${i}].name`);
    assertEnumMember(
      entity.role,
      NUANZE_NEWS_ENTITY_ROLES,
      `${label}.entities[${i}].role`,
    );
    if (entity.productId !== null) {
      assertNonNegativeInteger(
        entity.productId,
        `${label}.entities[${i}].productId`,
      );
    }
  }
}
