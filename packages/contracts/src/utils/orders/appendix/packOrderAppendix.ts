import { toBigInt } from '@nadohq/utils';
import { OrderAppendix } from '../../../common/types';
import { packTWAPOrderAppendixValue } from './appendixTWAPValue';
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
      case 'twap_random':
        return 3;
      default:
        return 0;
    }
  })();
  const orderType = (() => {
    switch (appendix.orderExpirationType) {
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
 * @param fields
 */
export function packOrderAppendix(appendix: OrderAppendix): bigint {
  const bits = mapOrderAppendixToBitValues(appendix);

  // Ensure value is within 96 bits
  let packed = bits.value & ((1n << 96n) - 1n);
  /*
  This line shifts the current packed value left by 18 bits to make space for the reserved field,
  then inserts the 18-bit reserved value into those bits using a bitwise OR.
  - packed << 18n: Moves all bits up by 18, opening 18 zero bits at the bottom.
  - bits.reserved & 0x3ffff: Masks reserved to its lowest 18 bits (ensures it fits).
  - BigInt(...): Converts the masked value to a BigInt for bitwise operations.
  - |: Combines the shifted packed and the masked reserved value.
   */
  packed = (packed << 18n) | BigInt(bits.reserved & 0x3ffff);
  packed = (packed << 2n) | BigInt(bits.trigger & 0x3);
  packed = (packed << 1n) | BigInt(bits.reduceOnly & 0x1);
  packed = (packed << 2n) | BigInt(bits.orderType & 0x3);
  packed = (packed << 1n) | BigInt(bits.isolated & 0x1);
  packed = (packed << 8n) | BigInt(bits.version & 0xff);
  return packed;
}
