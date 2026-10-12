import { toBigNumber } from '@nadohq/shared';
import { MobileServerSocialFeedListParams } from './types/serverSocialFeedTypes';
import {
  MobileFeedModel,
  MobileSocialFeedListParams,
} from './types/socialFeedTypes';

/**
 * Converts F01 response fields to camelCase, preserving x18 precision, nulls, and omitted patches.
 * Only use with the typed F01 schema: arbitrary user JSON is not a feed model.
 * @param server - A typed F01 response or nested model.
 * @returns The corresponding client model, with x18 integers represented by BigNumber.
 */
export function mapMobileSocialFeedModel<T>(server: T): MobileFeedModel<T> {
  return mapValue(server) as MobileFeedModel<T>;
}

function mapValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(mapValue);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase()),
      key.endsWith('_x18') && typeof child === 'string'
        ? toBigNumber(child)
        : mapValue(child),
    ]),
  );
}

/**
 * Maps common list parameters without inserting defaults before signing.
 * @param params - Client filters and session pagination.
 * @returns Wire fields; signing removes undefined properties entirely.
 */
export function mapMobileSocialFeedListParams(
  params: MobileSocialFeedListParams,
): MobileServerSocialFeedListParams {
  return {
    feed_types: params.feedTypes,
    minimum_notional: params.minimumNotional,
    limit: params.limit,
    session_id: params.sessionId,
    cursor: params.cursor,
  };
}
