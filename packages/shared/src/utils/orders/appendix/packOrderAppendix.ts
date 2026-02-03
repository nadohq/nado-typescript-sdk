import { OrderAppendix } from '../../../types/orderAppendixTypes';
import { packIsolatedOrderAppendixValue } from './appendixIsolatedValue';
import { packTwapOrderAppendixValue } from './appendixTwapValue';
import { bitMaskValue } from './bitMaskValue';
import { PackedOrderAppendixBits } from './types';

function mapOrderAppendixToBitValues(
  appendix: OrderAppendix,
): PackedOrderAppendixBits {
  const value = (() => {
    if (appendix.twap) {
      return packTwapOrderAppendixValue(appendix.twap);
    }
    if (appendix.isolated) {
      return packIsolatedOrderAppendixValue(appendix.isolated);
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
    builderId: appendix.builder?.builderId ?? 0,
    builderFeeRate: appendix.builder?.builderFeeRate ?? 0,
    reserved: 0,
    trigger,
    reduceOnly: appendix.reduceOnly ? 1 : 0,
    orderType,
    isolated: appendix.isolated ? 1 : 0,
    version: 1,
  };
}

/**
 * Pack the OrderAppendix fields into a single bigint.
 * @param appendix
 */
export function packOrderAppendix(appendix: OrderAppendix): bigint {
  const bits = mapOrderAppendixToBitValues(appendix);

  // Ensure value is within 64 bits
  let packed = bitMaskValue(bits.value, 64);
  packed = (packed << 16n) | bitMaskValue(bits.builderId, 16);
  packed = (packed << 10n) | bitMaskValue(bits.builderFeeRate, 10);
  packed = (packed << 24n) | bitMaskValue(bits.reserved, 24);
  packed = (packed << 2n) | bitMaskValue(bits.trigger, 2);
  packed = (packed << 1n) | bitMaskValue(bits.reduceOnly, 1);
  packed = (packed << 2n) | bitMaskValue(bits.orderType, 2);
  packed = (packed << 1n) | bitMaskValue(bits.isolated, 1);
  packed = (packed << 8n) | bitMaskValue(bits.version, 8);
  return packed;
}
