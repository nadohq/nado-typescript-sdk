import { BigDecimalish, toBigInt } from '@nadohq/utils';

// All valid "special" order expiration types
export type OrderExpirationType = 'default' | 'ioc' | 'fok' | 'post_only';

// Encodes all aspects of an order expiration number
export interface OrderExpirationConfig {
  type: OrderExpirationType;
  // The expiration timestamp in UNIX seconds
  expirationTime: number;
  // If true, the order can only reduce the size of an existing position. Works only with IOC & FOK
  reduceOnly?: boolean;
}

// 2 MSBs of u64
const EXPIRATION_TYPE_TO_MS2B: Record<OrderExpirationType, bigint> = {
  default: 0n,
  ioc: 1n,
  fok: 2n,
  post_only: 3n,
};

/**
 * Special order types, such as immediate-or-cancel, are encoded into the expiration field.
 * This is a utility to create the proper timestamp needed
 *
 * @param config
 */
export function getExpirationTimestamp(config: OrderExpirationConfig): bigint {
  const expirationWithType =
    toBigInt(config.expirationTime) |
    (EXPIRATION_TYPE_TO_MS2B[config.type] << 62n);

  if (!config.reduceOnly) {
    return expirationWithType;
  }

  // 3rd MSB denotes the boolean value of reduce-only
  return expirationWithType | (1n << 61n);
}

/**
 * Parses the expiration timestamp into its subcomponents:
 * - expiration type
 * - expiration timestamp in UNIX seconds
 * - value of the reduce only flag
 *
 * @param rawExpiration
 */
export function parseRawExpirationTimestamp(
  rawExpiration: BigDecimalish,
): Required<OrderExpirationConfig> {
  const bigIntRawExpiration = toBigInt(rawExpiration);
  const largestTwoBits = bigIntRawExpiration >> 62n;
  const reduceOnlyBitValue = (bigIntRawExpiration >> 61n) & 1n;

  const expirationType = (() => {
    if (largestTwoBits === EXPIRATION_TYPE_TO_MS2B.default) {
      return 'default';
    }
    if (largestTwoBits === EXPIRATION_TYPE_TO_MS2B.ioc) {
      return 'ioc';
    }
    if (largestTwoBits === EXPIRATION_TYPE_TO_MS2B.fok) {
      return 'fok';
    }
    if (largestTwoBits === EXPIRATION_TYPE_TO_MS2B.post_only) {
      return 'post_only';
    }
    throw new Error(
      `Could not detect order expiration type. Raw expiration ${bigIntRawExpiration.toString()}`,
    );
  })();
  const bigIntExpiration = bigIntRawExpiration - (largestTwoBits << 62n);

  return {
    type: expirationType,
    expirationTime: Number(bigIntExpiration.toString()),
    reduceOnly: reduceOnlyBitValue === 1n,
  };
}
