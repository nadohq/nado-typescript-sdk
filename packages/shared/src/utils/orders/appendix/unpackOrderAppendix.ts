import { OrderAppendix } from '../../../types/orderAppendixTypes';
import { BigDecimalish, toBigInt } from '../../math';
import { unpackIsolatedOrderAppendixValue } from './appendixIsolatedValue';
import { unpackTwapOrderAppendixValue } from './appendixTwapValue';
import { bitMaskValue } from './bitMaskValue';
import { PackedOrderAppendixBits } from './types';

function mapBitValuesToAppendix(bits: PackedOrderAppendixBits): OrderAppendix {
  const triggerType = (() => {
    switch (bits.trigger) {
      case 1:
        return 'price';
      case 2:
        return 'twap';
      case 3:
        return 'twap_custom_amounts';
      default:
        return undefined;
    }
  })();
  const orderExecutionType = (() => {
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
      return unpackIsolatedOrderAppendixValue(bits.value);
    }
    return undefined;
  })();
  const twapFields = (() => {
    if (triggerType === 'twap' || triggerType === 'twap_custom_amounts') {
      return unpackTwapOrderAppendixValue(bits.value);
    }
  })();

  return {
    reduceOnly: !!bits.reduceOnly,
    orderExecutionType,
    triggerType,
    isolated: isolatedFields,
    twap: twapFields,
  };
}

/**
 * Unpack the OrderAppendix fields from a packed bigint.
 * @param packed
 */
export function unpackOrderAppendix(packed: BigDecimalish): OrderAppendix {
  let temp = toBigInt(packed);
  // Bitmasks lowest 8 bits for version
  const version = Number(bitMaskValue(temp, 8));
  // Shift out the version bits
  temp >>= 8n;
  // Repeat for the rest of the fields
  const isolated = Number(bitMaskValue(temp, 1));
  temp >>= 1n;
  const orderType = Number(bitMaskValue(temp, 2));
  temp >>= 2n;
  const reduceOnly = Number(bitMaskValue(temp, 1));
  temp >>= 1n;
  const trigger = Number(bitMaskValue(temp, 2));
  temp >>= 2n;
  const reserved = Number(bitMaskValue(temp, 50));
  temp >>= 50n;
  // The remaining bits are the value, which should be 64 bits
  const value = bitMaskValue(temp, 64);

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
