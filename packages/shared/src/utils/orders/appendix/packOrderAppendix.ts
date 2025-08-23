import { OrderAppendix } from '../../../types/orderAppendixTypes';
import { toBigInt } from '../../math/toBigInt';
import { packTWAPOrderAppendixValue } from './appendixTWAPValue';
import { bitMaskValue } from './bitMaskValue';
import { PackedOrderAppendixBits } from './types';

function mapOrderAppendixToBitValues(
  appendix: OrderAppendix,
): PackedOrderAppendixBits {
  const value = (() => {
    if (appendix.twap) {
      return packTWAPOrderAppendixValue(appendix.twap);
    }
    if (appendix.isolated) {
      return toBigInt(appendix.isolated.margin);
    }
    return 0n;
  })();
  const trigger = (() => {
    switch (appendix.triggerType) {
      case 'price':
        return 1;
      case 'twap':
        return 2;
      case 'twap_custom_amounts':
        return 3;
      default:
        return 0;
    }
  })();
  const orderType = (() => {
    switch (appendix.orderExecutionType) {
      case 'default':
        return 0;
      case 'ioc':
        return 1;
      case 'fok':
        return 2;
      case 'post_only':
        return 3;
    }
  })();

  return {
    value,
    reserved: 0,
    trigger,
    reduceOnly: appendix.reduceOnly ? 1 : 0,
    orderType,
    isolated: appendix.isolated ? 1 : 0,
    version: 0,
  };
}

/**
 * Pack the OrderAppendix fields into a single bigint.
 * @param appendix
 */
export function packOrderAppendix(appendix: OrderAppendix): bigint {
  const bits = mapOrderAppendixToBitValues(appendix);

  // Ensure value is within 96 bits
  let packed = bitMaskValue(bits.value, 96);
  packed = (packed << 18n) | bitMaskValue(bits.reserved, 18);
  packed = (packed << 2n) | bitMaskValue(bits.trigger, 2);
  packed = (packed << 1n) | bitMaskValue(bits.reduceOnly, 1);
  packed = (packed << 2n) | bitMaskValue(bits.orderType, 2);
  packed = (packed << 1n) | bitMaskValue(bits.isolated, 1);
  packed = (packed << 8n) | bitMaskValue(bits.version, 8);
  return packed;
}
