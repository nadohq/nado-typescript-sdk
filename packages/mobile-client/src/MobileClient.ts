import {
  getNadoClientTypeHeaders,
  subaccountToHex,
  WalletClientWithAccount,
  WalletNotProvidedError,
} from '@nadohq/shared';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { keccak256 } from 'viem';
import {
  mapMobileAvatarPreset,
  mapMobileAvatarSelectionToServer,
  mapMobileAvatarUpload,
  mapMobileFeedPage,
  mapMobileFollowBatchResult,
  mapMobileFollowListPage,
  mapMobileFollowListParamsToServer,
  mapMobileFollowMutationResult,
  mapMobileNotificationPreferences,
  mapMobileNotificationPreferencesToServer,
  mapMobileProfileSearchPage,
  mapMobileProfileSearchParamsToServer,
  mapMobileProfilesIncludeToServer,
  mapMobilePublicProfile,
  mapMobileRegisteredWallet,
  mapMobileSocialFeedActionResolutionResult,
  mapMobileSocialFeedCommentResult,
  mapMobileSocialFeedCommentsPage,
  mapMobileSocialFeedDrawingMutationResult,
  mapMobileSocialFeedDrawingResult,
  mapMobileSocialFeedImageUpload,
  mapMobileSocialFeedItem,
  mapMobileSocialFeedItemResponse,
  mapMobileSocialFeedLikeResult,
  mapMobileSocialFeedListParamsToServer,
  mapMobileSocialFeedMentionToServer,
  mapMobileSocialFeedPage,
  mapMobileSocialFeedPositionChart,
  mapMobileSocialFeedPositionHistory,
  mapMobileSocialFeedPositionResolutionResult,
  mapMobileSocialFeedPositionsPage,
  mapMobileSocialFeedPresence,
  mapMobileSocialFeedRankedPage,
  mapMobileSocialFeedReadParamsToServer,
  mapMobileSocialFeedTopTradersPage,
  mapMobileSocialFeedUpdates,
  mapMobileSocialFeedViewsResult,
  mapMobileSocialFeedWatchers,
} from './dataMappers';
import {
  buildSignedMobileRequest,
  MobileSignedInner,
  MobileSignedInnerByType,
  MobileSignedInnerParams,
  MobileSignedRequest,
} from './signing';
import {
  GetMobileFeedChartDrawingParams,
  GetMobileFeedCommentsParams,
  GetMobileFeedImageBytesParams,
  GetMobileFeedItemParams,
  GetMobileFeedParams,
  GetMobileFeedUpdatesParams,
  GetMobileFollowersParams,
  GetMobileFollowingParams,
  GetMobileForYouFeedParams,
  GetMobileFriendsFeedParams,
  GetMobileMarketFeedParams,
  GetMobileNotificationPreferencesParams,
  GetMobilePositionChartParams,
  GetMobilePositionFeedParams,
  GetMobilePositionHistoryParams,
  GetMobilePositionWatchersParams,
  GetMobileProfileFeedParams,
  GetMobileProfilesParams,
  GetMobileRegisteredWalletParams,
  GetMobileSelfFeedPositionsParams,
  GetMobileTopTradersFeedParams,
  GetMobileUsernameAvailabilityParams,
  MobileAvatarPreset,
  MobileAvatarUpload,
  MobileCreateAvatarUploadParams,
  MobileCreateFeedCommentParams,
  MobileCreateFeedImageUploadParams,
  MobileCreateFeedPostParams,
  MobileFeedChartDrawingParams,
  MobileFeedPage,
  MobileFollowBatchResultItem,
  MobileFollowListPage,
  MobileFollowMutationResult,
  MobileNotificationPreferences,
  MobilePositionPresenceParams,
  MobileProfileSearchPage,
  MobilePublicProfile,
  MobileRecordFeedViewsParams,
  MobileRegisteredWallet,
  MobileRegisterExpoTokenParams,
  MobileSetAvatarParams,
  MobileSetBioParams,
  MobileSetFeedLikeParams,
  MobileSetFollowBatchParams,
  MobileSetFollowParams,
  MobileSetPrivateModeParams,
  MobileSetUsernameParams,
  MobileSignedRequestParams,
  MobileSocialFeedActionResolutionResult,
  MobileSocialFeedCommentResult,
  MobileSocialFeedCommentsPage,
  MobileSocialFeedDrawingMutationResult,
  MobileSocialFeedDrawingResult,
  MobileSocialFeedImage,
  MobileSocialFeedItem,
  MobileSocialFeedItemResponse,
  MobileSocialFeedLikeResult,
  MobileSocialFeedPage,
  MobileSocialFeedPositionChart,
  MobileSocialFeedPositionHistory,
  MobileSocialFeedPositionResolutionResult,
  MobileSocialFeedPositionsPage,
  MobileSocialFeedPresence,
  MobileSocialFeedRankedPage,
  MobileSocialFeedTopTradersPage,
  MobileSocialFeedUpdates,
  MobileSocialFeedViewsResult,
  MobileSocialFeedWatchers,
  MobileUnregisterExpoTokenParams,
  MobileUpdateNotificationPreferencesParams,
  MobileUsernameAvailability,
  ResolveMobileFeedActionParams,
  ResolveMobileFeedPositionParams,
  SearchMobileProfilesParams,
} from './types/clientTypes';
import { MobileServerFailureError } from './types/MobileServerFailureError';
import { MobileServerSuccessResponse } from './types/serverBaseTypes';
import {
  MobileServerExecuteResult,
  MobileServerExecuteSuccessResponse,
  MobileServerPublicExecuteRequest,
  MobileServerPublicExecuteSuccessResponse,
} from './types/serverExecuteTypes';
import {
  MobileServerPublicQueryRequest,
  MobileServerPublicQuerySuccessResponse,
} from './types/serverQueryTypes';
import {
  MobileServerExecuteRequestType,
  MobileServerPublicExecuteRequestByType,
  MobileServerPublicExecuteRequestType,
  MobileServerPublicQueryRequestByType,
  MobileServerPublicQueryRequestType,
} from './types/serverRequestTypes';
import { buildMobileFeedImageMultipart } from './utils/buildMobileFeedImageMultipart';
import {
  isMobileServerFailureResponse,
  isMobileServerSuccessResponse,
} from './utils/serverResponseGuards';

/**
 * Options for constructing a {@link MobileClient}.
 */
export interface MobileClientOpts {
  /**
   * Base URL of the mobile service API, e.g. {@link MOBILE_CLIENT_ENDPOINTS}.
   */
  url: string;
  /**
   * Wallet client used to sign requests.
   */
  walletClient?: WalletClientWithAccount;
  /**
   * If provided, this signer is used instead of `walletClient` for all signed requests.
   */
  linkedSignerWalletClient?: WalletClientWithAccount;
  /**
   * If provided, identifies the calling client, sent as a header with every request.
   */
  clientType?: string;
}

/**
 * Client for the Nado mobile service API: usernames, bios, avatars, public profile lookups, the global
 * trade feed, session-based social feeds, the follower/following graph, privacy settings, and push
 * notification device/preference management.
 */
export class MobileClient {
  readonly opts: MobileClientOpts;
  readonly axiosInstance: AxiosInstance;

  constructor(opts: MobileClientOpts) {
    this.opts = opts;
    this.axiosInstance = axios.create({
      withCredentials: true,
      // We have custom logic to validate response status and create an appropriate error
      validateStatus: () => true,
      headers: getNadoClientTypeHeaders(opts.clientType),
    });
  }

  /**
   * Sets the linked signer for requests
   *
   * @param linkedSignerWalletClient The linkedSigner to use for all signatures. Set to null to revert to the chain signer
   */
  public setLinkedSigner(
    linkedSignerWalletClient: WalletClientWithAccount | null,
  ) {
    this.opts.linkedSignerWalletClient = linkedSignerWalletClient ?? undefined;
  }

  /*
  Public queries
   */

  /**
   * Returns the current server-owned avatar catalogue in display order.
   *
   * @throws {MobileServerFailureError} With `SERVICE_UNAVAILABLE` when avatar storage is not configured.
   */
  async getAvatarPresets(): Promise<MobileAvatarPreset[]> {
    const body: MobileServerPublicQueryRequest<'avatar_presets'> = {
      type: 'avatar_presets',
    };
    const data = await this.publicQuery(body);
    return data.presets.map(mapMobileAvatarPreset);
  }

  /**
   * Checks whether a username derived from the given display name is available to claim.
   */
  async getUsernameAvailability(
    params: GetMobileUsernameAvailabilityParams,
  ): Promise<MobileUsernameAvailability> {
    const body: MobileServerPublicQueryRequest<'username_availability'> = {
      type: 'username_availability',
      display_name: params.displayName,
    };
    const data = await this.publicQuery(body);
    return { username: data.username, available: data.available };
  }

  /**
   * Looks up public profiles, optionally with follower totals and a follow summary. Returns one profile per
   * requested subaccount, in the requested order, so callers can correlate positionally. Every non-isolated
   * subaccount resolves, with `username` and `displayName` `null` until a username is claimed. Private Mode
   * does not hide the profile itself, only the account's activity.
   *
   * This is the only profile route, so use it for a single subaccount too. It is unsigned, which means
   * `include.followSummary.viewAs` is an unauthenticated claim.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_PROFILES_REQUEST` if `subaccounts` is empty,
   * holds duplicates, or exceeds `MOBILE_PROFILES_MAX_BATCH_SIZE` (25), or `PROFILE_NOT_FOUND` if any
   * requested subaccount — or the follow summary's `viewAs` — is in the engine-created isolated namespace.
   * One isolated member fails the whole batch rather than being omitted.
   */
  async getProfiles(
    params: GetMobileProfilesParams,
  ): Promise<MobilePublicProfile[]> {
    const body: MobileServerPublicQueryRequest<'profiles'> = {
      type: 'profiles',
      subaccounts: params.subaccounts.map(subaccountToHex),
      include: params.include
        ? mapMobileProfilesIncludeToServer(params.include)
        : undefined,
    };
    const data = await this.publicQuery(body);
    return data.profiles.map(mapMobilePublicProfile);
  }

  /**
   * Searches claimed profiles by the start of their username, in ascending username order with an exact
   * match first. Only current claimed identities match: an unnamed profile never does, and Private Mode does
   * not hide one. Takes the same `include` as {@link MobileClient.getProfiles}, so a page can carry follower
   * totals and a follow summary without a second request; as there, `include.followSummary.viewAs` is an
   * unauthenticated claim on an unsigned route.
   *
   * Pagination is live rather than snapshot, so deduplicate matches by subaccount across pages. A cursor is
   * bound to the query alone, so `include` and `limit` may change between pages.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_PROFILE_SEARCH_REQUEST` if `query` is outside
   * the username alphabet or length or `limit` is out of range (1-50, or 1-25 with an include),
   * `INVALID_PROFILE_SEARCH_CURSOR` if the cursor is malformed or was issued for a different query (discard
   * it and restart from the first page), or `PROFILE_NOT_FOUND` if `include.followSummary.viewAs` is in the
   * engine-created isolated namespace.
   */
  async searchProfiles(
    params: SearchMobileProfilesParams,
  ): Promise<MobileProfileSearchPage> {
    const body: MobileServerPublicQueryRequest<'search_profiles'> = {
      type: 'search_profiles',
      ...mapMobileProfileSearchParamsToServer(params),
    };
    const data = await this.publicQuery(body);
    return mapMobileProfileSearchPage(data);
  }

  /**
   * Fetches a page of the accounts that follow the given Profile.
   *
   * Ordering depends on `viewAs`. With it, accounts the Viewer already follows come first, unfamiliar
   * accounts second, and every row carries an `isFollowing`. Without it, the page is ordered by the listed
   * relationship alone and no row carries an `isFollowing`. In both cases the newest listed relationship
   * comes first within a group, with a bytes32 tie-break. The grouping is evaluated per request against the
   * live graph, so following an account from inside the list moves it between groups on the next page —
   * deduplicate by subaccount and do not re-sort locally.
   *
   * @throws {MobileServerFailureError} With error code `PROFILE_NOT_FOUND` if the viewed Profile or `viewAs`
   * is isolated, `INVALID_FOLLOW_CURSOR` if the cursor is malformed or was issued for a different `viewAs`,
   * Profile, or list direction (discard it and restart from the first page), or `INVALID_FOLLOW_LIMIT` if
   * `limit` is outside 1–50.
   */
  async getFollowers(
    params: GetMobileFollowersParams,
  ): Promise<MobileFollowListPage> {
    const body: MobileServerPublicQueryRequest<'followers'> = {
      type: 'followers',
      ...mapMobileFollowListParamsToServer(params),
    };
    const data = await this.publicQuery(body);
    return mapMobileFollowListPage(data);
  }

  /**
   * Fetches a page of the accounts the given Profile follows. Ordering, cursor rules, and errors match
   * {@link MobileClient.getFollowers}. When `viewAs` reads its own Following list every row is familiar, so
   * every `isFollowing` is `true`.
   */
  async getFollowing(
    params: GetMobileFollowingParams,
  ): Promise<MobileFollowListPage> {
    const body: MobileServerPublicQueryRequest<'following'> = {
      type: 'following',
      ...mapMobileFollowListParamsToServer(params),
    };
    const data = await this.publicQuery(body);
    return mapMobileFollowListPage(data);
  }

  /**
   * Fetches a page of the global trade feed: public perpetual trades, newest first, optionally filtered by a
   * whole-dollar minimum notional (omitted means unfiltered). Trades by subaccounts that have not claimed a
   * username are included with `null` name fields; only private accounts are filtered out. The feed is
   * best-effort rather than authoritative history, and pagination is live (not snapshot), so deduplicate pages
   * by {@link MobileFeedTrade.orderDigest}.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_FEED_FILTER` if `minimumNotional` or
   * `limit` is outside its allowed domain (fix the request; do not retry unchanged), or
   * `INVALID_FEED_CURSOR` if the cursor is malformed or was issued for a different `minimumNotional`
   * (discard the cursor and restart from the first page).
   */
  async getFeed(params: GetMobileFeedParams = {}): Promise<MobileFeedPage> {
    const body: MobileServerPublicQueryRequest<'feed'> = {
      type: 'feed',
      minimum_notional: params.minimumNotional,
      limit: params.limit,
      cursor: params.cursor,
    };
    const data = await this.publicQuery(body);
    return mapMobileFeedPage(data);
  }

  /**
   * Fetches chronological For You recommendations with server-side author/thread constraints.
   * Always public, with optional viewAs for relationship state. Preserve the session, viewAs, filters, and limit
   * when paging, including through empty pages with a nextCursor. A 6312 error requires a refresh.
   * @param params - Filters, pagination, optional viewing account, and browser credential; no signing identity.
   * @returns A fixed-session page with its ranking version and new-content watermark.
   * @throws {MobileServerFailureError} On invalid parameters, session mismatch/expiry, or unavailable data.
   * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported item kind.
   */
  async getForYouFeed(
    params: GetMobileForYouFeedParams = {},
  ): Promise<MobileSocialFeedRankedPage> {
    const body: MobileServerPublicQueryRequest<'for_you_feed'> = {
      type: 'for_you_feed',
      market_category: params.marketCategory,
      ...mapMobileSocialFeedListParamsToServer(params),
      ...mapMobileSocialFeedReadParamsToServer(params),
    };
    const data = await this.publicQuery(body);
    return mapMobileSocialFeedRankedPage(data);
  }

  /**
   * Fetches chronological content by qualified Top Traders, with official account PnL badges.
   * Always public; neither a wallet nor one-click trading setup is required.
   * @param params - Filters, pagination, optional viewing account, and browser credential.
   * @returns A page with its qualification cohort; an unavailable cohort fails instead of returning an empty ranking.
   * @throws {MobileServerFailureError} On request/session errors or unavailable cohort data.
   * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported item kind.
   */
  async getTopTradersFeed(
    params: GetMobileTopTradersFeedParams = {},
  ): Promise<MobileSocialFeedTopTradersPage> {
    const body: MobileServerPublicQueryRequest<'top_traders_feed'> = {
      type: 'top_traders_feed',
      market_category: params.marketCategory,
      ...mapMobileSocialFeedListParamsToServer(params),
      ...mapMobileSocialFeedReadParamsToServer(params),
    };
    const data = await this.publicQuery(body);
    return mapMobileSocialFeedTopTradersPage(data);
  }

  /**
   * Fetches public content by authors followed by viewAs, without a signature. One-way following is sufficient.
   * @param params - Required viewing account on every request, filters, pagination, and browser credential.
   * @returns A chronological Friends page and reading session.
   * @throws {MobileServerFailureError} On invalid viewing account, session errors, or feed query failure.
   * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported item kind.
   */
  async getFriendsFeed(
    params: GetMobileFriendsFeedParams,
  ): Promise<MobileSocialFeedRankedPage> {
    const body: MobileServerPublicQueryRequest<'friends_feed'> = {
      type: 'friends_feed',
      market_category: params.marketCategory,
      ...mapMobileSocialFeedListParamsToServer(params),
      view_as: subaccountToHex(params.viewAs),
      viewer_token: params.viewerToken,
    };
    const data = await this.publicQuery(body);
    return mapMobileSocialFeedRankedPage(data);
  }

  /**
   * Fetches an author's content visible to viewAs, including that account's own hidden content.
   * @param params - Target identity, filters, pagination, and optional public viewing account.
   * @returns An author page without main-feed ranking or cohort fields.
   * @throws {MobileServerFailureError} On invalid parameters, session errors, or inaccessible content.
   * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported item kind.
   */
  async getProfileFeed(
    params: GetMobileProfileFeedParams,
  ): Promise<MobileSocialFeedPage> {
    const body: MobileServerPublicQueryRequest<'profile_feed'> = {
      type: 'profile_feed',
      subaccount: subaccountToHex(params.subaccount),
      market_category: params.marketCategory,
      ...mapMobileSocialFeedListParamsToServer(params),
      ...mapMobileSocialFeedReadParamsToServer(params),
    };
    const data = await this.publicQuery(body);
    return mapMobileSocialFeedPage(data);
  }

  /**
   * Fetches published content for one market.
   * @param params - Product ID, content/size filters, pagination, and public viewing account.
   * @returns A market page without main-feed ranking fields.
   * @throws {MobileServerFailureError} On an unknown market, session errors, or unavailable data.
   * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported item kind.
   */
  async getMarketFeed(
    params: GetMobileMarketFeedParams,
  ): Promise<MobileSocialFeedPage> {
    const body: MobileServerPublicQueryRequest<'market_feed'> = {
      type: 'market_feed',
      product_id: params.productId,
      ...mapMobileSocialFeedListParamsToServer(params),
      ...mapMobileSocialFeedReadParamsToServer(params),
    };
    const data = await this.publicQuery(body);
    return mapMobileSocialFeedPage(data);
  }

  /**
   * Fetches already published content for a position lifecycle. This is not full position history
   * and includes hidden content owned by viewAs under account_view. It does not recreate suppressed activity.
   * @param params - Position UUID, filters, pagination, and public viewing account.
   * @returns A fixed-session position feed page.
   * @throws {MobileServerFailureError} On inaccessible content, session errors, or unavailable data.
   * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported item kind.
   */
  async getPositionFeed(
    params: GetMobilePositionFeedParams,
  ): Promise<MobileSocialFeedPage> {
    const body: MobileServerPublicQueryRequest<'position_feed'> = {
      type: 'position_feed',
      position_id: params.positionId,
      ...mapMobileSocialFeedListParamsToServer(params),
      ...mapMobileSocialFeedReadParamsToServer(params),
    };
    const data = await this.publicQuery(body);
    return mapMobileSocialFeedPage(data);
  }

  /**
   * Reads one item visible to viewAs, including that account's own hidden content.
   * Creates an item session directly when sessionId is omitted.
   * @param params - Item UUID, preview limit, and optional existing session/read identity.
   * @returns The complete item and authorized reading session.
   * @throws {MobileServerFailureError} On inaccessible content or session mismatch/expiry.
   * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported item kind.
   */
  async getFeedItem(
    params: GetMobileFeedItemParams,
  ): Promise<MobileSocialFeedItemResponse> {
    const body: MobileServerPublicQueryRequest<'feed_item'> = {
      type: 'feed_item',
      item_id: params.itemId,
      comment_preview_limit: params.commentPreviewLimit,
      session_id: params.sessionId,
      ...mapMobileSocialFeedReadParamsToServer(params),
    };
    const data = await this.publicQuery(body);
    return mapMobileSocialFeedItemResponse(data);
  }

  /**
   * Polls authorized visible items and positions without inserting or reordering list members.
   * Increment requestSeq across the entire session, including viewport changes; never reset it for a new viewport.
   * Accept only the current session and viewportRevision's latest requestSeq; discard stale patches and cursors together.
   * Updates currently always return reset=true. Apply current author details, follow state, and badges even if the item version is unchanged.
   * Null patches clear values;
   * omitted fields leave them unchanged. Stop polling off-screen and refresh on error 6312.
   * @param params - Session, visible IDs, update baseline, sequence, and matching read identity.
   * @returns Item/position patches, revoked targets, and a new-content hint.
   * @throws {MobileServerFailureError} On invalid or unauthorized targets, session expiry, or unavailable data.
   */
  async getFeedUpdates(
    params: GetMobileFeedUpdatesParams,
  ): Promise<MobileSocialFeedUpdates> {
    const body: MobileServerPublicQueryRequest<'feed_updates'> = {
      type: 'feed_updates',
      session_id: params.sessionId,
      visible_item_ids: params.visibleItemIds,
      visible_position_ids: params.visiblePositionIds,
      update_cursor: params.updateCursor,
      viewport_revision: params.viewportRevision,
      request_seq: params.requestSeq,
      viewer_token: params.viewerToken,
    };
    const data = await this.publicQuery(body);
    return mapMobileSocialFeedUpdates(data);
  }

  /**
   * Fetches the push notification preferences of the wallet that owns the given Expo push token. Unsigned —
   * the token identifies the wallet on its own. Falls back to the backend's defaults if the wallet has never
   * updated its preferences.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_EXPO_TOKEN` if the token is malformed, or is
   * not currently registered to a wallet.
   */
  async getNotificationPreferences(
    params: GetMobileNotificationPreferencesParams,
  ): Promise<MobileNotificationPreferences> {
    const body: MobileServerPublicQueryRequest<'notification_preferences'> = {
      type: 'notification_preferences',
      expo_token: params.expoToken,
    };
    const data = await this.publicQuery(body);
    return mapMobileNotificationPreferences(data.preferences);
  }

  /**
   * Resolves the wallet that an Expo push token is currently registered to, along with the redacted metadata
   * of the device that registered it. Unsigned — the token identifies the wallet on its own. Use it to check
   * whether a locally held token is still active and which wallet currently owns it, since registering the
   * same token under another wallet transfers ownership.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_EXPO_TOKEN` if the token is malformed, or is
   * not currently registered to a wallet — including a token that was unregistered. The backend does not
   * distinguish those cases.
   */
  async getRegisteredWallet(
    params: GetMobileRegisteredWalletParams,
  ): Promise<MobileRegisteredWallet> {
    const body: MobileServerPublicQueryRequest<'registered_wallet'> = {
      type: 'registered_wallet',
      expo_token: params.expoToken,
    };
    const data = await this.publicQuery(body);
    return mapMobileRegisteredWallet(data);
  }

  /**
   * Lists a selected account's current positions without signing or authenticating ownership.
   * Publication and attachment eligibility are hints that the service rechecks on writes.
   * @param params - Viewing subaccount, optional market filter, page size, and opaque cursor.
   * @returns Current position candidates, their eligibility hints, the next cursor, and observation time.
   * @throws {MobileServerFailureError} On invalid parameters, an unsupported viewing account, or unavailable
   * position data. An account with no open positions returns an empty page instead of an error.
   */
  async getSelfFeedPositions(
    params: GetMobileSelfFeedPositionsParams,
  ): Promise<MobileSocialFeedPositionsPage> {
    const body: MobileServerPublicQueryRequest<'self_feed_positions'> = {
      type: 'self_feed_positions',
      view_as: subaccountToHex(params.viewAs),
      product_id: params.productId,
      cursor: params.cursor,
      limit: params.limit,
    };
    return mapMobileSocialFeedPositionsPage(await this.publicQuery(body));
  }

  /**
   * Resolves a slash command against a selected account without changing the caller's input.
   * @param params - Viewing subaccount, original command text, and optional market disambiguation.
   * @returns The resolution, nullable market, candidate positions, and reason for an empty result.
   * @throws {MobileServerFailureError} On invalid parameters, an unsupported viewing account, or unavailable
   * source data. Unknown markets and accounts without open positions are normal resolution results.
   */
  async resolveFeedPosition(
    params: ResolveMobileFeedPositionParams,
  ): Promise<MobileSocialFeedPositionResolutionResult> {
    const body: MobileServerPublicQueryRequest<'resolve_feed_position'> = {
      type: 'resolve_feed_position',
      view_as: subaccountToHex(params.viewAs),
      input: params.input,
      product_id: params.productId,
    };
    return mapMobileSocialFeedPositionResolutionResult(
      await this.publicQuery(body),
    );
  }

  /**
   * Resolves every trusted lifecycle segment of an order without requiring a signature.
   * @param params - Order-owning subaccount and order digest; selecting the account is not authentication.
   * @returns Trusted action candidates and their observation time, or a pending result with no actions.
   * @throws {MobileServerFailureError} On invalid parameters, an inaccessible order, or unavailable source
   * data. Pending projection is a successful result, not a source failure.
   */
  async resolveFeedAction(
    params: ResolveMobileFeedActionParams,
  ): Promise<MobileSocialFeedActionResolutionResult> {
    const body: MobileServerPublicQueryRequest<'resolve_feed_action'> = {
      type: 'resolve_feed_action',
      view_as: subaccountToHex(params.viewAs),
      order_digest: params.orderDigest,
    };
    return mapMobileSocialFeedActionResolutionResult(
      await this.publicQuery(body),
    );
  }

  /**
   * Reads a drawing publicly without issuing a reading session. Supplied sessions retain their scope.
   * @param params - Parent item, optional viewing account, and optional original session and viewer token.
   * @returns The parent ID and version, with a nullable drawing whose data may legitimately be false or zero.
   * @throws {MobileServerFailureError} On invalid parameters, session mismatch or expiry, unavailable data,
   * or `SOCIAL_FEED_DRAWING_UNAVAILABLE` when the parent is inaccessible. A readable parent without a drawing
   * returns null. Acquire a new reading session when the original has expired.
   */
  async getFeedChartDrawing(
    params: GetMobileFeedChartDrawingParams,
  ): Promise<MobileSocialFeedDrawingResult> {
    const body: MobileServerPublicQueryRequest<'feed_chart_drawing'> = {
      type: 'feed_chart_drawing',
      item_id: params.itemId,
      session_id: params.sessionId,
      ...mapMobileSocialFeedReadParamsToServer(params),
    };
    return mapMobileSocialFeedDrawingResult(await this.publicQuery(body));
  }

  /**
   * Reads a comment thread with an optional anchor and bidirectional pagination.
   * Independent reads create a public-only session; reused sessions retain their original scope.
   * @param params - Root item, optional anchor or cursor (mutually exclusive), page size, and read perspective.
   * Paging requires the original session and viewer token.
   * @returns Replies, total count, forward and backward cursors, the anchor, and the actual reading session.
   * @throws {MobileServerFailureError} On invalid parameters, session mismatch or expiry, inaccessible content,
   * or unavailable data. Restart pagination with a new session after expiry; do not reuse the old cursor.
   */
  async getFeedComments(
    params: GetMobileFeedCommentsParams,
  ): Promise<MobileSocialFeedCommentsPage> {
    const body: MobileServerPublicQueryRequest<'feed_comments'> = {
      type: 'feed_comments',
      root_item_id: params.rootItemId,
      cursor: params.cursor,
      limit: params.limit,
      anchor_reply_id: params.anchorReplyId,
      session_id: params.sessionId,
      ...mapMobileSocialFeedReadParamsToServer(params),
    };
    return mapMobileSocialFeedCommentsPage(await this.publicQuery(body));
  }

  /**
   * Reads the full position lifecycle and creates or reuses a position session.
   * Unlike getPositionFeed, this includes lifecycle actions as well as published takes.
   * @param params - Position, optional takes-only filter, pagination, and read perspective. Paging requires
   * the original position session and viewer token, not a feed session.
   * @returns Position metrics, ordered action/take history, summary, trading hints, cursor, and reading session.
   * @throws {MobileServerFailureError} On invalid parameters, session mismatch or expiry, inaccessible content,
   * or unavailable source data. Restart with a new position session after expiry.
   * @throws {MobileUnsupportedFeedItemError} If a timeline entry or take has an unsupported kind.
   */
  async getPositionHistory(
    params: GetMobilePositionHistoryParams,
  ): Promise<MobileSocialFeedPositionHistory> {
    const body: MobileServerPublicQueryRequest<'position_history'> = {
      type: 'position_history',
      position_id: params.positionId,
      takes_only: params.takesOnly,
      cursor: params.cursor,
      limit: params.limit,
      session_id: params.sessionId,
      ...mapMobileSocialFeedReadParamsToServer(params),
    };
    return mapMobileSocialFeedPositionHistory(await this.publicQuery(body));
  }

  /**
   * Reads candles and action markers without creating a reading session.
   * Preserve the original range, interval, and read perspective when paging with nextBeforeMs.
   * @param params - Position, candle interval, half-open time range, pagination, and optional original session
   * and viewer token. An independent read omits both session credentials.
   * @returns Candles with decimal prices and x18 volume, action markers, a nullable liquidation line, and paging metadata.
   * @throws {MobileServerFailureError} On invalid parameters, session mismatch or expiry, inaccessible content,
   * or wholly unavailable chart sources. Partially available data is returned with its quality indicator.
   */
  async getPositionChart(
    params: GetMobilePositionChartParams,
  ): Promise<MobileSocialFeedPositionChart> {
    const body: MobileServerPublicQueryRequest<'position_chart'> = {
      type: 'position_chart',
      position_id: params.positionId,
      session_id: params.sessionId,
      interval: params.interval,
      range: { from_ms: params.range.fromMs, to_ms: params.range.toMs },
      before_ms: params.beforeMs,
      limit: params.limit,
      ...mapMobileSocialFeedReadParamsToServer(params),
    };
    return mapMobileSocialFeedPositionChart(await this.publicQuery(body));
  }

  /**
   * Reads active visitor counts and self-reported account previews without registering presence.
   * @param params - Position and optional viewing account, used only for preview relationship information.
   * @returns The visitor count, public account previews, and observation time; previews need not match the count.
   * @throws {MobileServerFailureError} On invalid parameters, an unavailable position, or unavailable source data.
   */
  async getPositionWatchers(
    params: GetMobilePositionWatchersParams,
  ): Promise<MobileSocialFeedWatchers> {
    const body: MobileServerPublicQueryRequest<'position_watchers'> = {
      type: 'position_watchers',
      position_id: params.positionId,
      view_as:
        params.viewAs === undefined
          ? undefined
          : subaccountToHex(params.viewAs),
    };
    return mapMobileSocialFeedWatchers(await this.publicQuery(body));
  }

  /*
  Public executes
   */

  /**
   * Unregisters an Expo push token, stopping delivery to that device. Unsigned, so it still works at logout
   * when a wallet signature may no longer be obtainable. Idempotent: unregistering an inactive or unknown
   * well-formed token succeeds.
   *
   * A registration that commits after this call re-activates the token, so stop or await any in-flight
   * {@link MobileClient.registerExpoToken} before unregistering.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_EXPO_TOKEN` if the token is malformed.
   */
  async unregisterExpoToken(
    params: MobileUnregisterExpoTokenParams,
  ): Promise<MobileServerSuccessResponse> {
    const body: MobileServerPublicExecuteRequest<'unregister_expo_token'> = {
      type: 'unregister_expo_token',
      expo_token: params.expoToken,
    };
    return this.publicExecute(body);
  }

  /**
   * Replaces the push notification preferences of the wallet that owns the given Expo push token. Possession
   * of an active token is the credential rather than a signature, so anyone holding the token can overwrite
   * that wallet's preferences. The backend requires `schemaVersion` of 1, exactly one entry per known
   * category, and empty `scopes` on every entry.
   *
   * Writes are last-write-wins on commit order rather than ordered by a client nonce, so callers must
   * serialize their own preference writes.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_PREFERENCES` if those rules are violated, or
   * `INVALID_EXPO_TOKEN` if the token is malformed or is not currently registered to a wallet.
   */
  async updateNotificationPreferences(
    params: MobileUpdateNotificationPreferencesParams,
  ): Promise<MobileServerSuccessResponse> {
    const body: MobileServerPublicExecuteRequest<'update_preferences'> = {
      type: 'update_preferences',
      expo_token: params.expoToken,
      preferences: mapMobileNotificationPreferencesToServer(params.preferences),
    };
    return this.publicExecute(body);
  }

  /**
   * Reports qualified exposures without signing. Ordinary reads and root previews do not count as exposures.
   * Report after the primary detail target is shown in the foreground (`viewTracking.mode` is `detail_visit`).
   * @param params - Original reading session and viewer token, plus one to fifty fully delivered, readable,
   * interactive item IDs. The service deduplicates repeated exposures.
   * @returns Separate lists of newly accepted and already-counted item IDs.
   * @throws {MobileServerFailureError} On invalid parameters, session mismatch or expiry, or any ineligible item.
   * A rejected batch is not partially counted. Acquire a new session after expiry and re-evaluate exposure eligibility.
   */
  async recordFeedViews(
    params: MobileRecordFeedViewsParams,
  ): Promise<MobileSocialFeedViewsResult> {
    const body: MobileServerPublicExecuteRequest<'record_feed_views'> = {
      type: 'record_feed_views',
      session_id: params.sessionId,
      item_ids: params.itemIds,
      viewer_token: params.viewerToken,
    };
    return mapMobileSocialFeedViewsResult(await this.publicExecute(body));
  }

  /**
   * Registers, renews, or leaves a page lease without signing or authenticating the displayed account.
   * Omitting watcherSubaccount preserves its value; null clears it. This operation does not record item views.
   * @param params - Authorized position, original session and viewer token, page-scoped viewSessionId,
   * lease state, and optional self-reported display account. Retain viewSessionId for the lifetime of the page.
   * @returns Visitor count, public previews, recommended heartbeat interval, and remaining lease lifetime.
   * @throws {MobileServerFailureError} On invalid parameters, session mismatch or expiry, or an inaccessible
   * position. Rejected requests leave leases unchanged; acquire a new reading session after expiry.
   */
  async setPositionPresence(
    params: MobilePositionPresenceParams,
  ): Promise<MobileSocialFeedPresence> {
    const body: MobileServerPublicExecuteRequest<'position_presence'> = {
      type: 'position_presence',
      position_id: params.positionId,
      session_id: params.sessionId,
      view_session_id: params.viewSessionId,
      state: params.state,
      viewer_token: params.viewerToken,
      ...(params.watcherSubaccount === undefined
        ? {}
        : {
            watcher_subaccount:
              params.watcherSubaccount === null
                ? null
                : subaccountToHex(params.watcherSubaccount),
          }),
    };
    return mapMobileSocialFeedPresence(await this.publicExecute(body));
  }

  /*
  Signed executes
   */

  /**
   * Updates the biography, or clears it when the text is whitespace-only.
   *
   * Serialize this with {@link MobileClient.setAvatar}, {@link MobileClient.setUsername} and
   * {@link MobileClient.setPrivateMode} for the same subaccount: all share the identity update nonce.
   *
   * @throws {MobileServerFailureError} With `INVALID_BIO` for exceeding `MOBILE_BIO_MAX_LENGTH` or null
   * characters, `INVALID_IDENTITY_TARGET` for an isolated subaccount, or `STALE_IDENTITY_UPDATE` when a
   * later write has committed (re-read the profile before retrying).
   */
  async setBio(
    params: MobileSetBioParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest('set_bio', params, {
      bio: params.bio,
    });
    return this.execute(signedRequest);
  }

  /**
   * Creates a short-lived upload grant. The caller uploads an image meeting {@link MobileAvatarUpload}'s requirements;
   * file access and transport remain platform-specific. This does not change the saved avatar.
   *
   * @throws {MobileServerFailureError} With `INVALID_AVATAR` for a zero or oversized upload,
   * `INVALID_IDENTITY_TARGET` for an isolated subaccount, or `SERVICE_UNAVAILABLE` when storage is unavailable.
   */
  async createAvatarUpload(
    params: MobileCreateAvatarUploadParams,
  ): Promise<MobileAvatarUpload> {
    const signedRequest = await this.getSignedRequest(
      'create_avatar_upload',
      params,
      { content_length: params.contentLength },
    );
    const data = await this.execute(signedRequest);
    return mapMobileAvatarUpload(data);
  }

  /**
   * Publishes a preset/staged upload, or clears the saved avatar when avatar is null.
   * Uploaded JPEG/PNG images must be square, at most 4096 × 4096 pixels, and within
   * `MOBILE_AVATAR_MAX_UPLOAD_BYTES`. A successful PUT can still fail this publication check.
   *
   * Serialize identity writes for the same subaccount; see {@link MobileClient.setBio}.
   *
   * @throws {MobileServerFailureError} With `INVALID_AVATAR` for an invalid preset, staging key, or image,
   * `INVALID_IDENTITY_TARGET` for an isolated subaccount, `SERVICE_UNAVAILABLE` when storage is unavailable,
   * or `STALE_IDENTITY_UPDATE` when a later write has committed (re-read the profile before retrying).
   */
  async setAvatar(
    params: MobileSetAvatarParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest('set_avatar', params, {
      avatar: mapMobileAvatarSelectionToServer(params.avatar),
    });
    return this.execute(signedRequest);
  }

  /**
   * Sets a subaccount's username, derived from the given display name. Upserts: the same call claims a first
   * username and renames an existing one, so callers never need to read the current identity first.
   *
   * Serialize identity writes for the same subaccount; see {@link MobileClient.setBio}.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_DISPLAY_NAME` if the display name violates
   * `MOBILE_DISPLAY_NAME_PATTERN`, `USERNAME_UNAVAILABLE` if the derived username is reserved or already
   * taken by another subaccount, `INVALID_IDENTITY_TARGET` if the sender is in the engine-created isolated
   * namespace, or `STALE_IDENTITY_UPDATE` if another identity write for this subaccount committed with a
   * later nonce (re-read the identity before retrying).
   */
  async setUsername(
    params: MobileSetUsernameParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest('set_username', params, {
      display_name: params.displayName,
    });
    return this.execute(signedRequest);
  }

  /**
   * Sets whether a subaccount's profile is private.
   * Serialize identity writes for the same subaccount; see {@link MobileClient.setBio}.
   */
  async setPrivateMode(
    params: MobileSetPrivateModeParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest(
      'set_private_mode',
      params,
      { private_mode: params.privateMode },
    );
    return this.execute(signedRequest);
  }

  /**
   * Registers an Expo push token for the wallet, transferring active ownership of the token if another
   * wallet had registered it. Idempotent per `(wallet, token)`.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_EXPO_TOKEN` if the token is not a valid Expo
   * push token, or `INVALID_DEVICE_METADATA` if `locale` (max 35 chars) or `appVersion` (max 64 chars) is
   * too long.
   */
  async registerExpoToken(
    params: MobileRegisterExpoTokenParams,
  ): Promise<MobileServerSuccessResponse> {
    const signedRequest = await this.getSignedRequest(
      'register_expo_token',
      params,
      {
        expo_token: params.expoToken,
        platform: params.platform,
        locale: params.locale ?? null,
        app_version: params.appVersion ?? null,
      },
    );
    return this.execute(signedRequest);
  }

  /**
   * Sets whether the signing subaccount follows a Profile. Both directions are idempotent: following again
   * keeps the original relationship creation time, so it does not move the account in recency order, and
   * unfollowing a relationship that does not exist succeeds with `isFollowing: false`. Unfollowing deletes
   * the relationship rather than deactivating it, so a later follow gets a new creation time and moves the
   * account to the front of recency order.
   *
   * Only `isFollowing: true` is checked against the canonical Query DB subaccount index, so unfollowing still
   * works while that index lags.
   *
   * @throws {MobileServerFailureError} With error code `INVALID_FOLLOW_TARGET` if the target is the sender or
   * either party is isolated, `FOLLOWER_NOT_ELIGIBLE` if the sender is not yet in the canonical Query DB
   * subaccount index, or `FOLLOWING_NOT_FOUND` if the target is not. Both index errors are transient for an
   * account that is being recorded, so they are retryable after catch-up — unlike `INVALID_FOLLOW_TARGET`.
   */
  async setFollow(
    params: MobileSetFollowParams,
  ): Promise<MobileFollowMutationResult> {
    const signedRequest = await this.getSignedRequest('set_follow', params, {
      subaccount: subaccountToHex(params.target),
      is_following: params.isFollowing,
    });
    const data = await this.execute(signedRequest);
    return mapMobileFollowMutationResult(data);
  }

  /**
   * Sets whether the signing subaccount follows each of up to `MOBILE_FOLLOW_BATCH_MAX_SIZE` (25) Profiles in
   * one signed request, which costs far less of the shared IP rate limit than one {@link MobileClient.setFollow}
   * per target. The server validates the whole list before writing and commits every target in one database
   * transaction, so the batch either fully applies or changes nothing. Each target has the same idempotent
   * semantics as `setFollow`, so resending a batch is safe.
   *
   * Targets are lowercased before signing but not deduplicated, and two spellings of one subaccount are a
   * duplicate. Longer lists must be split by the caller; each request commits on its own, so earlier chunks
   * stay applied when a later one fails.
   *
   * @returns One result per target, in request order, carrying each target's post-commit follower count.
   * @throws {MobileServerFailureError} With error code `INVALID_FOLLOW_BATCH` if `targets` is empty, holds
   * duplicates, or exceeds the maximum, or `INVALID_FOLLOW_TARGET` if any target is the sender or either party
   * is isolated. Either rejects the whole batch before any write, so do not retry it unchanged.
   */
  async setFollowBatch(
    params: MobileSetFollowBatchParams,
  ): Promise<MobileFollowBatchResultItem[]> {
    const signedRequest = await this.getSignedRequest(
      'set_follow_batch',
      params,
      {
        subaccounts: params.targets.map(subaccountToHex),
        is_following: params.isFollowing,
      },
    );
    const data = await this.execute(signedRequest);
    return mapMobileFollowBatchResult(data);
  }

  /**
   * Publishes text, a drawing, or both atomically using the signed author identity.
   * For an idempotent retry, reuse clientRequestId and the exact original content with a valid signature.
   * The SDK does not trim text or reformat the signed drawing JSON.
   * @param params - Author subaccount and signing options, request UUID, owned position, original text and
   * mentions, plus an optional trusted action and original drawing JSON.
   * @returns The published item, including authoritative interaction state and any drawing or comment preview.
   * @throws {WalletNotProvidedError} If neither a linked signer nor a default wallet is configured.
   * @throws {MobileServerFailureError} On authentication, ownership, eligibility, content, mention, or drawing
   * errors, or `SOCIAL_FEED_REQUEST_CONFLICT` when a request UUID is reused with different content. Do not
   * change an earlier request to retry it; use a new UUID for a genuinely new publication.
   * @throws {MobileUnsupportedFeedItemError} If the service returns an unsupported item kind.
   */
  async createFeedPost(
    params: MobileCreateFeedPostParams,
  ): Promise<MobileSocialFeedItem> {
    const request = await this.getSignedRequest('create_feed_post', params, {
      client_request_id: params.clientRequestId,
      position_id: params.positionId,
      action_id: params.actionId,
      text: params.text,
      mentions: params.mentions.map(mapMobileSocialFeedMentionToServer),
      drawing_data_json: params.drawingDataJson,
      image_ids: params.imageIds,
    });
    return mapMobileSocialFeedItem((await this.execute(request)).item);
  }

  /**
   * Uploads one static JPEG/PNG for a later {@link createFeedPost} via multipart execute.
   * The whole HTTP request must stay within 2 MiB including signature overhead; upload one file per call
   * and bind up to nine ready IDs at publication. There is no complete/PUT step — success means ready.
   * @param params - Author subaccount and signing options, plus the original file bytes.
   * @returns Ready image metadata, including original and thumbnail paths.
   * @throws {WalletNotProvidedError} If neither a linked signer nor a default wallet is configured.
   * @throws {MobileServerFailureError} On authentication, format/size/hash errors (`INVALID_SOCIAL_FEED_IMAGE`),
   * or when publishing is disabled (`SERVICE_UNAVAILABLE`).
   */
  async createFeedPostImageUpload(
    params: MobileCreateFeedImageUploadParams,
  ): Promise<MobileSocialFeedImage> {
    return this.createFeedImageUpload('create_feed_post_image_uploads', params);
  }

  /**
   * Uploads one static JPEG/PNG for a later {@link createFeedComment} via multipart execute.
   * Same size and readiness rules as {@link createFeedPostImageUpload}; comment text remains required.
   * @param params - Author subaccount and signing options, plus the original file bytes.
   * @returns Ready image metadata, including original and thumbnail paths.
   * @throws {WalletNotProvidedError} If neither a linked signer nor a default wallet is configured.
   * @throws {MobileServerFailureError} On authentication, format/size/hash errors (`INVALID_SOCIAL_FEED_IMAGE`),
   * or when comments are disabled (`SERVICE_UNAVAILABLE`).
   */
  async createFeedCommentImageUpload(
    params: MobileCreateFeedImageUploadParams,
  ): Promise<MobileSocialFeedImage> {
    return this.createFeedImageUpload(
      'create_feed_comment_image_uploads',
      params,
    );
  }

  /**
   * Resolves a feed image path from {@link MobileSocialFeedImage} against this client's base URL.
   * @param path - Relative backend path or absolute URL from image metadata.
   * @returns An absolute URL suitable for authenticated fetches.
   */
  resolveFeedImageUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const stripped = path
      .replace(/^\/v1\/mobile(?=\/)/, '')
      .replace(/^\/mobile\/v1(?=\/)/, '');
    const base = this.opts.url.replace(/\/$/, '');
    return `${base}${stripped.startsWith('/') ? stripped : `/${stripped}`}`;
  }

  /**
   * Fetches protected feed image bytes using the reading session that fully delivered the parent item.
   * Does not count as a detail visit or recorded view.
   * @param params - Image path from metadata plus the original session credentials.
   * @returns Raw image bytes.
   * @throws {MobileServerFailureError} On session, permission, or availability errors.
   */
  async getFeedImageBytes(
    params: GetMobileFeedImageBytesParams,
  ): Promise<Uint8Array> {
    const response = await this.axiosInstance.get<ArrayBuffer>(
      this.resolveFeedImageUrl(params.path),
      {
        responseType: 'arraybuffer',
        headers: {
          'x-feed-session-id': params.sessionId,
          'x-feed-viewer-token': params.viewerToken,
        },
      },
    );
    this.checkResponseStatus(response);
    return new Uint8Array(response.data);
  }

  /**
   * First attaches a drawing to an owned post or trade card while the author still holds its position.
   * The original JSON is signed unchanged; false and zero are valid drawing documents.
   * For an exact retry after a timeout, generate a nonce up front with {@link getMobileNonce} and reuse
   * that nonce and the original JSON before its receive deadline. A fresh nonce is not an exact replay.
   * If a retry returns `SOCIAL_FEED_DRAWING_EXISTS`, use {@link getFeedChartDrawing} to confirm that the
   * stored data matches the intended drawing before treating the original create as successful.
   * @param params - Author subaccount and signing options, parent item, and complete original drawing JSON.
   * @returns The parent ID and updated version together with the stored drawing.
   * @throws {WalletNotProvidedError} If neither a linked signer nor a default wallet is configured.
   * @throws {MobileServerFailureError} On authentication, ownership, eligibility, or invalid/oversized drawing
   * errors, an unavailable parent, or `SOCIAL_FEED_DRAWING_EXISTS` for a conflicting existing drawing.
   * Read the existing drawing and use updateFeedChartDrawing when replacement is intended.
   */
  async createFeedChartDrawing(
    params: MobileFeedChartDrawingParams,
  ): Promise<MobileSocialFeedDrawingMutationResult> {
    const request = await this.getSignedRequest(
      'create_feed_chart_drawing',
      params,
      { item_id: params.itemId, data_json: params.dataJson },
    );
    return mapMobileSocialFeedDrawingMutationResult(
      await this.execute(request),
    );
  }

  /**
   * Replaces an existing drawing, including after the associated position has closed.
   * Serialize writes per item and preserve the original JSON text when retrying.
   * @param params - Author subaccount and signing options, parent item, and complete replacement JSON.
   * @returns The parent ID and updated version together with the stored replacement drawing.
   * @throws {WalletNotProvidedError} If neither a linked signer nor a default wallet is configured.
   * @throws {MobileServerFailureError} On authentication, ownership, or invalid/oversized drawing errors, an
   * unavailable parent or drawing, or `STALE_SOCIAL_FEED_DRAWING_UPDATE`. Re-read the drawing before retrying
   * a stale or conflicting update instead of blindly replacing newer content.
   */
  async updateFeedChartDrawing(
    params: MobileFeedChartDrawingParams,
  ): Promise<MobileSocialFeedDrawingMutationResult> {
    const request = await this.getSignedRequest(
      'update_feed_chart_drawing',
      params,
      { item_id: params.itemId, data_json: params.dataJson },
    );
    return mapMobileSocialFeedDrawingMutationResult(
      await this.execute(request),
    );
  }

  /**
   * Publishes a comment or reply atomically; an invalid position attachment rejects the entire request.
   * For an idempotent retry, reuse clientRequestId and the unmodified text, mentions, and attachment.
   * @param params - Author subaccount and signing options, request UUID, root item, original nonblank text
   * and mentions, plus an optional reply target in the same thread and currently owned position attachment.
   * @returns The created reply and authoritative root comment count; this write does not create a reading session.
   * @throws {WalletNotProvidedError} If neither a linked signer nor a default wallet is configured.
   * @throws {MobileServerFailureError} On authentication, inaccessible content, invalid text/mentions/reply
   * relationships, an ineligible attachment, or `SOCIAL_FEED_REQUEST_CONFLICT`. Correct invalid input before
   * a new submission, and never reuse an existing request UUID with different content.
   */
  async createFeedComment(
    params: MobileCreateFeedCommentParams,
  ): Promise<MobileSocialFeedCommentResult> {
    const request = await this.getSignedRequest('create_feed_comment', params, {
      client_request_id: params.clientRequestId,
      root_item_id: params.rootItemId,
      reply_to_item_id: params.replyToItemId,
      text: params.text,
      mentions: params.mentions.map(mapMobileSocialFeedMentionToServer),
      attached_position_id: params.attachedPositionId,
      image_ids: params.imageIds,
    });
    return mapMobileSocialFeedCommentResult(await this.execute(request));
  }

  /**
   * Sets or clears a signed user's like without requiring an open position.
   * Serialize mutations per item and author. Retrying the same isLiked state with a fresh nonce is safe
   * when no newer change intervenes; an unchanged state does not increment the count or version again.
   * Pass the original nonce on a retry before its deadline to avoid overwriting a newer change from
   * another device. Re-read the current state if that retry conflicts.
   * @param params - Acting subaccount and signing options, interactive item, and desired like state.
   * @returns The applied like state, authoritative count, and item version after the mutation.
   * @throws {WalletNotProvidedError} If neither a linked signer nor a default wallet is configured.
   * @throws {MobileServerFailureError} On authentication errors, inaccessible or non-interactive content,
   * or `STALE_SOCIAL_FEED_LIKE_UPDATE`. Re-read the current state before submitting a new mutation after a conflict.
   */
  async setFeedLike(
    params: MobileSetFeedLikeParams,
  ): Promise<MobileSocialFeedLikeResult> {
    const request = await this.getSignedRequest('set_feed_like', params, {
      item_id: params.itemId,
      is_liked: params.isLiked,
    });
    return mapMobileSocialFeedLikeResult(await this.execute(request));
  }

  /*
  Base Fns
   */

  // Returns the request narrowed to `type` so `execute` can infer its response from the request it is given,
  // instead of being told the type a second time at the call site.
  protected async getSignedRequest<T extends MobileSignedInner['type']>(
    type: T,
    params: MobileSignedRequestParams,
    innerParams: MobileSignedInnerParams<T>,
  ): Promise<MobileSignedRequest<MobileSignedInnerByType<T>>> {
    // Use the linked signer if provided, otherwise use the default signer provided to the client
    const walletClient =
      this.opts.linkedSignerWalletClient ?? this.opts.walletClient;

    if (walletClient == null) {
      throw new WalletNotProvidedError();
    }

    const inner = {
      type,
      ...innerParams,
    } as unknown as MobileSignedInnerByType<T>;
    return buildSignedMobileRequest({ ...params, walletClient, inner });
  }

  // Spelled out as an intersection rather than `MobileServerPublicQueryRequest<T>`: the latter is an indexed
  // access on a mapped type, which is not an inference site, so `T` would always widen to the full union.
  protected async publicQuery<T extends MobileServerPublicQueryRequestType>(
    body: { type: T } & MobileServerPublicQueryRequestByType[T],
  ): Promise<MobileServerPublicQuerySuccessResponse<T>> {
    const response = await this.axiosInstance.post<unknown>(
      `${this.opts.url}/public_query`,
      body,
    );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus throws on failure responses so the cast to the success response is acceptable here
    return response.data as MobileServerPublicQuerySuccessResponse<T>;
  }

  protected async publicExecute<T extends MobileServerPublicExecuteRequestType>(
    body: { type: T } & MobileServerPublicExecuteRequestByType[T],
  ): Promise<MobileServerPublicExecuteSuccessResponse<T>> {
    const response = await this.axiosInstance.post<MobileServerExecuteResult>(
      `${this.opts.url}/public_execute`,
      body,
    );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus catches the failure result and throws the error, so the cast to the success response is acceptable here
    return response.data as MobileServerPublicExecuteSuccessResponse<T>;
  }

  // `T` is inferred from the body's `type` rather than declared by the caller, for the same reason
  // `publicQuery` spells its body out as an intersection: an indexed access is not an inference site.
  protected async execute<T extends MobileServerExecuteRequestType>(
    body: MobileSignedRequest & { type: T },
  ): Promise<MobileServerExecuteSuccessResponse<T>> {
    const response = await this.axiosInstance.post<MobileServerExecuteResult>(
      `${this.opts.url}/execute`,
      body,
    );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    // checkServerStatus catches the failure result and throws the error, so the cast to the success response is acceptable here
    return response.data as MobileServerExecuteSuccessResponse<T>;
  }

  private async createFeedImageUpload(
    type:
      | 'create_feed_post_image_uploads'
      | 'create_feed_comment_image_uploads',
    params: MobileCreateFeedImageUploadParams,
  ): Promise<MobileSocialFeedImage> {
    const contentHash = keccak256(params.fileBytes);
    const request = await this.getSignedRequest(type, params, {
      content_hash: contentHash,
    });
    const data = await this.executeMultipart(request, params);
    return mapMobileSocialFeedImageUpload(data);
  }

  /**
   * Posts a signed execute as multipart/form-data: `payload` (JSON) + `file` (raw bytes).
   * Built without DOM FormData/Blob so Node, browsers, and React Native share one path.
   */
  protected async executeMultipart<T extends MobileServerExecuteRequestType>(
    body: MobileSignedRequest & { type: T },
    params: Pick<MobileCreateFeedImageUploadParams, 'fileBytes' | 'fileName'>,
  ): Promise<MobileServerExecuteSuccessResponse<T>> {
    const { body: multipartBody, contentType } = buildMobileFeedImageMultipart(
      JSON.stringify(body),
      params.fileBytes,
      params.fileName ?? 'image.bin',
    );

    const response = await this.axiosInstance.post<MobileServerExecuteResult>(
      `${this.opts.url}/execute`,
      multipartBody,
      { headers: { 'Content-Type': contentType } },
    );

    this.checkResponseStatus(response);
    this.checkServerStatus(response);

    return response.data as MobileServerExecuteSuccessResponse<T>;
  }

  /**
   * Validates the HTTP status before interpreting the body. Unlike the engine, the mobile backend returns
   * failure envelopes with non-2xx statuses (e.g. 404 for `PROFILE_NOT_FOUND`), so a non-2xx response with a
   * failure envelope still throws the typed error; anything else is a transport-level error.
   */
  private checkResponseStatus(response: AxiosResponse<unknown>) {
    if (response.status >= 200 && response.status < 300) {
      return;
    }
    if (isMobileServerFailureResponse(response.data)) {
      throw new MobileServerFailureError(response.data, response.status);
    }
    throw new Error(
      `Unexpected response from mobile service: ${response.status} ${response.statusText}. Data: ${JSON.stringify(response.data)}`,
    );
  }

  private checkServerStatus(response: AxiosResponse<unknown>) {
    const { data } = response;

    if (isMobileServerFailureResponse(data)) {
      throw new MobileServerFailureError(data, response.status);
    }
    if (!isMobileServerSuccessResponse(data)) {
      throw new Error(
        `Unexpected response from mobile service: missing success envelope. Data: ${JSON.stringify(data)}`,
      );
    }
  }
}
