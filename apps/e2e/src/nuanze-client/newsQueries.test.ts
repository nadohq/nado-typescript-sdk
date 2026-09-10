import {
  NUANZE_NEWS_ENTITY_ROLES,
  NUANZE_NEWS_EVENT_TYPES,
  NUANZE_NEWS_SENTIMENTS,
  NuanzeClient,
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
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

/** UTC ISO 8601 with a required `Z`, as the Nuanze contract specifies. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

void describe(
  '[nuanze-client]: news',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;
    let newsClient: NuanzeClient;

    before(() => {
      tc = createTestContext();
      newsClient = process.env.NUANZE_E2E_URL
        ? new NuanzeClient({ url: process.env.NUANZE_E2E_URL })
        : tc.nuanze;
    });

    void test('lists published stories newest first', async () => {
      const response = await newsClient.getNews({ limit: 10 });
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

    void test('filters by ticker and productId across cursor pages', async () => {
      const [markets, recentNews] = await Promise.all([
        newsClient.getMarkets(),
        newsClient.getNews({ limit: 100, tradableOnly: true }),
      ]);
      const storiesByProduct = new Map<number, Set<string>>();
      for (const story of recentNews.stories) {
        for (const entity of story.entities) {
          if (entity.productId === null) continue;
          const storyIds =
            storiesByProduct.get(entity.productId) ?? new Set<string>();
          storyIds.add(story.id);
          storiesByProduct.set(entity.productId, storyIds);
        }
      }

      const selectedMarket = markets.markets.find(
        (market) => (storiesByProduct.get(market.productId)?.size ?? 0) >= 2,
      );
      assert.ok(
        selectedMarket,
        'expected a listed market with at least two recent news stories',
      );

      const assetProductIds = new Set(
        markets.markets
          .filter(
            (market) =>
              market.ticker.toLowerCase() ===
              selectedMarket.ticker.toLowerCase(),
          )
          .map((market) => market.productId),
      );
      const tickerPage = await newsClient.getNews({
        limit: 100,
        ticker: selectedMarket.ticker.toLowerCase(),
      });
      assert.ok(tickerPage.stories.length >= 2, 'ticker feed should have news');
      assert.ok(
        tickerPage.stories.every((story) =>
          storyHasProduct(story, assetProductIds),
        ),
        'every ticker-filtered story should reference the selected asset',
      );

      const firstPage = await newsClient.getNews({
        limit: 1,
        ticker: selectedMarket.ticker,
        productId: selectedMarket.productId,
      });
      assert.equal(firstPage.stories.length, 1);
      assert.ok(
        storyHasProduct(
          firstPage.stories[0],
          new Set([selectedMarket.productId]),
        ),
        'the first page should reference the exact product',
      );
      assert.ok(firstPage.nextCursor, 'the first page should have a cursor');

      const secondPage = await newsClient.getNews({
        limit: 1,
        ticker: selectedMarket.ticker,
        productId: selectedMarket.productId,
        cursor: firstPage.nextCursor,
      });
      assert.equal(secondPage.stories.length, 1);
      assert.notEqual(secondPage.stories[0].id, firstPage.stories[0].id);
      assert.ok(
        storyHasProduct(
          secondPage.stories[0],
          new Set([selectedMarket.productId]),
        ),
        'the second page should retain the exact product filter',
      );
    });

    void test('rejects an unknown sentiment with BAD_REQUEST', async () => {
      try {
        await newsClient.getNews({
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

function storyHasProduct(
  story: NuanzeNewsStory,
  productIds: ReadonlySet<number>,
): boolean {
  return story.entities.some(
    (entity) => entity.productId !== null && productIds.has(entity.productId),
  );
}

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
