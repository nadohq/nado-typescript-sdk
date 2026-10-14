import { describe, expect, it } from '@jest/globals';
import { Subaccount, subaccountToHex } from '@nadohq/shared';
import { privateKeyToAccount } from 'viem/accounts';
import { mapMobileProfileSearchPage } from './dataMappers';
import { MobileClient } from './MobileClient';
import {
  MOBILE_ERROR_CODES,
  MobileServerFailureError,
  MobileServerSearchProfilesResponse,
} from './types';
import { MOBILE_PROFILE_SEARCH_QUERY_PATTERN } from './utils';

const viewer = privateKeyToAccount(
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b786907',
);
const viewAs: Subaccount = {
  subaccountOwner: viewer.address,
  subaccountName: 'default',
};
const match = privateKeyToAccount(
  '0x0123456789012345678901234567890123456789012345678901234567890123',
);
const matchSubaccount = subaccountToHex({
  subaccountOwner: match.address,
  subaccountName: 'default',
});

const emptyPage: MobileServerSearchProfilesResponse = {
  profiles: [],
  next_cursor: null,
};

function mockClient(data: unknown = { status: 'success', ...emptyPage }) {
  const client = new MobileClient({ url: 'https://mobile.example/v1/mobile' });
  const requests: Array<{
    url: string | undefined;
    body: Record<string, unknown>;
  }> = [];
  client.axiosInstance.defaults.adapter = (config) => {
    requests.push({
      url: config.url,
      body: JSON.parse(String(config.data)) as Record<string, unknown>,
    });
    return Promise.resolve({
      data,
      status: 200,
      statusText: 'mock',
      headers: {},
      config,
    });
  };
  return { client, requests };
}

describe('[mobile-client]: profile search transport', () => {
  it('posts the prefix, cursor, limit and mapped include as an unsigned public query', async () => {
    const { client, requests } = mockClient();

    await client.searchProfiles({
      query: 'Ali',
      cursor: 'profilesv1_616c69',
      limit: 25,
      include: { followCounts: true, followSummary: { viewAs } },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(
      'https://mobile.example/v1/mobile/public_query',
    );
    expect(requests[0].body).toEqual({
      type: 'search_profiles',
      query: 'Ali',
      cursor: 'profilesv1_616c69',
      limit: 25,
      include: {
        follow_counts: true,
        follow_summary: { view_as: subaccountToHex(viewAs) },
      },
    });
  });

  it('omits the include, cursor and limit when the caller did not set them', async () => {
    const { client, requests } = mockClient();

    await client.searchProfiles({ query: 'ali' });

    // The backend treats an absent include as the cheap unenriched search; sending `null` would be the same
    // but an undefined key must not turn into an empty object, which it would price as unenriched anyway.
    expect(requests[0].body).toEqual({ type: 'search_profiles', query: 'ali' });
  });

  it('surfaces a failure envelope as MobileServerFailureError with its error code', async () => {
    const { client } = mockClient({
      status: 'failure',
      error: 'The profile search query or limit is invalid.',
      error_code: MOBILE_ERROR_CODES.INVALID_PROFILE_SEARCH_REQUEST,
      request_type: 'public_query_search_profiles',
    });

    await expect(client.searchProfiles({ query: 'a b' })).rejects.toMatchObject(
      {
        name: 'MobileServerFailureError',
        errorCode: MOBILE_ERROR_CODES.INVALID_PROFILE_SEARCH_REQUEST,
      },
    );
    await expect(
      client.searchProfiles({ query: 'a b' }),
    ).rejects.toBeInstanceOf(MobileServerFailureError);
  });
});

describe('[mobile-client]: profile search response mapping', () => {
  it('maps a page and keeps include-gated fields absent when the backend omitted them', () => {
    const page = mapMobileProfileSearchPage({
      profiles: [
        {
          subaccount: matchSubaccount,
          username: 'alice',
          display_name: 'Alice',
          private_mode: false,
        },
      ],
      next_cursor: 'profilesv1_616c6963653a616c696365',
    });

    expect(page).toEqual({
      profiles: [
        {
          subaccount: matchSubaccount,
          username: 'alice',
          displayName: 'Alice',
          privateMode: false,
          followerCount: undefined,
          followingCount: undefined,
          followSummary: undefined,
        },
      ],
      nextCursor: 'profilesv1_616c6963653a616c696365',
    });
    expect(page.profiles[0]).not.toHaveProperty('followerCount', 0);
  });

  it('maps follow counts and the viewer-relative summary when they were included', () => {
    const page = mapMobileProfileSearchPage({
      profiles: [
        {
          subaccount: matchSubaccount,
          username: 'fan.two',
          display_name: 'Fan.Two',
          private_mode: true,
          follower_count: 2,
          following_count: 0,
          follow_summary: {
            is_following: false,
            followed_by_count: 2,
            followed_by: [
              {
                subaccount: subaccountToHex(viewAs),
                username: 'fan.one',
                display_name: 'Fan.One',
                avatar_url: null,
              },
            ],
          },
        },
      ],
      next_cursor: null,
    });

    expect(page.nextCursor).toBeNull();
    expect(page.profiles[0]).toMatchObject({
      privateMode: true,
      followerCount: 2,
      followingCount: 0,
      followSummary: {
        isFollowing: false,
        followedByCount: 2,
        followedBy: [
          {
            subaccount: subaccountToHex(viewAs),
            username: 'fan.one',
            displayName: 'Fan.One',
            avatarUrl: null,
          },
        ],
      },
    });
  });

  it('maps an empty last page', () => {
    expect(mapMobileProfileSearchPage(emptyPage)).toEqual({
      profiles: [],
      nextCursor: null,
    });
  });
});

describe('[mobile-client]: profile search query pattern', () => {
  it.each(['a', '7', 'Ali', 'a_.', 'a'.repeat(20)])('accepts %p', (query) => {
    expect(MOBILE_PROFILE_SEARCH_QUERY_PATTERN.test(query)).toBe(true);
  });

  it.each(['', '_a', '.a', 'a b', 'a-b', '@ali', ' ali', 'a'.repeat(21), 'é'])(
    'rejects %p',
    (query) => {
      expect(MOBILE_PROFILE_SEARCH_QUERY_PATTERN.test(query)).toBe(false);
    },
  );
});
