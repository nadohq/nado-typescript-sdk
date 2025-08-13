import { OrderAppendix } from '../../../common';
import { unpackTWAPOrderAppendixValue } from './appendixTWAPValue';
import { PackedOrderAppendixBits } from './types';

function mapBitValuesToAppendix(bits: PackedOrderAppendixBits): OrderAppendix {
  const triggerType = (() => {
    switch (bits.trigger) {
      case 1:
        return 'price';
      case 2:
        return 'twap';
      case 3:
        return 'twap_random';
      default:
        return undefined;
    }
  })();
  const orderExpirationType = (() => {
    switch (bits.orderType) {
      case 0:
        return 'default';
      case 1:
        return 'ioc';
      case 2:
        return 'fok';
      case 3:
        return 'post_only';
      default:
        throw new Error(
          `[mapBitValuesToAppendix] Unknown order type: ${bits.orderType}`,
        );
    }
  })();
  const isolatedFields = (() => {
    if (bits.isolated) {
      return { margin: bits.value };
    }
    return undefined;
  })();
  const twapFields = (() => {
    if (triggerType === 'twap' || triggerType === 'twap_random') {
      return unpackTWAPOrderAppendixValue(bits.value);
    }
  })();

  return {
    reduceOnly: !!bits.reduceOnly,
    orderExpirationType,
    triggerType,
    isolated: isolatedFields,
    twap: twapFields,
  };
}

/**
 * Unpack the OrderAppendix fields from a packed bigint.
 * @param packed
 */
export function unpackOrderAppendix(packed: bigint): OrderAppendix {
  let temp = packed;
  // Bitmasks lowest 8 bits for version
  const version = Number(temp & 0xffn);
  // Shift out the version bits
  temp >>= 8n;
  // Repeat for the rest of the fields
  const isolated = Number(temp & 0x1n);
  temp >>= 1n;
  const orderType = Number(temp & 0x3n);
  temp >>= 2n;
  const reduceOnly = Number(temp & 0x1n);
  temp >>= 1n;
  const trigger = Number(temp & 0x3n);
  temp >>= 2n;
  const reserved = Number(temp & 0x3ffffn);
  temp >>= 18n;
  // The remaining bits are the value, which should be 96 bits
  const value = temp & ((1n << 96n) - 1n);

  return mapBitValuesToAppendix({
    value,
    reserved,
    trigger,
    reduceOnly,
    orderType,
    isolated,
    version,
  });
}
