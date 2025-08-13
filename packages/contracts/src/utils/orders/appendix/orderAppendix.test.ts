import { describe, expect, it } from '@jest/globals';
import { OrderAppendix, OrderExpirationType } from '../../../common/types';
import { packOrderAppendix } from './packOrderAppendix';
import { unpackOrderAppendix } from './unpackOrderAppendix';

describe('OrderAppendix packing/unpacking', () => {
  it('should pack and unpack an order appendix without iso/twap values', () => {
    const appendix: OrderAppendix = {
      orderExpirationType: 'default',
      triggerType: 'price',
      reduceOnly: false,
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(packed).toBe(4096n);
    expect(unpacked.orderExpirationType).toBe(appendix.orderExpirationType);
    expect(unpacked.triggerType).toBe(appendix.triggerType);
    expect(unpacked.reduceOnly).toBe(appendix.reduceOnly);
  });

  it('should handle reduceOnly true', () => {
    const appendix: OrderAppendix = {
      orderExpirationType: 'default',
      triggerType: 'price',
      reduceOnly: true,
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(packed).toBe(6144n);
    expect(unpacked.reduceOnly).toBe(true);
  });

  it('should handle all orderExpirationType values', () => {
    const types: OrderExpirationType[] = ['default', 'ioc', 'fok', 'post_only'];
    for (const type of types) {
      const appendix: OrderAppendix = {
        orderExpirationType: type,
        triggerType: 'price',
        reduceOnly: false,
      };
      const packed = packOrderAppendix(appendix);
      const unpacked = unpackOrderAppendix(packed);
      expect(unpacked.orderExpirationType).toBe(type);
    }
  });

  it('should handle all triggerType values', () => {
    const triggers = ['price', 'twap', 'twap_random'] as const;
    for (const trigger of triggers) {
      const appendix: OrderAppendix = {
        orderExpirationType: 'default',
        triggerType: trigger,
        reduceOnly: false,
      };
      const packed = packOrderAppendix(appendix);
      const unpacked = unpackOrderAppendix(packed);
      expect(unpacked.triggerType).toBe(trigger);
    }
  });

  it('should handle isolated margin', () => {
    const appendix: OrderAppendix = {
      orderExpirationType: 'default',
      triggerType: 'price',
      reduceOnly: false,
      isolated: { margin: 123456789012345678901234n },
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(packed).toBe(530242871277196831127717244047616n);
    expect(unpacked.isolated?.margin).toBe(123456789012345678901234n);
  });

  it('should handle TWAP fields', () => {
    const appendix: OrderAppendix = {
      orderExpirationType: 'default',
      triggerType: 'twap',
      reduceOnly: false,
      twap: { numOrders: 10, slippageFrac: 0.005 },
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(packed).toBe(792281717376363744483197591552n);
    expect(unpacked.twap).toMatchObject({ numOrders: 10, slippageFrac: 0.005 });
  });

  it('should handle max values for all fields for iso orders', () => {
    const appendix: OrderAppendix = {
      orderExpirationType: 'post_only',
      triggerType: undefined,
      reduceOnly: true,
      isolated: { margin: 79228162514264337593543950335n }, // 2^96-1
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(unpacked.orderExpirationType).toBe(appendix.orderExpirationType);
    expect(unpacked.triggerType).toBe(appendix.triggerType);
    expect(unpacked.reduceOnly).toBe(appendix.reduceOnly);
    expect(unpacked.isolated?.margin).toBe(79228162514264337593543950335n);
    expect(unpacked.twap).toBe(undefined);
    expect(packed).toBe(340282366920938463463374607427473248000n);
  });

  it('should handle max values for all fields for TWAP orders', () => {
    const appendix: OrderAppendix = {
      orderExpirationType: 'post_only',
      triggerType: 'twap_random',
      reduceOnly: true,
      twap: {
        // max 32-bit unsigned int
        numOrders: 4294967295,
        slippageFrac: 0.000001,
      },
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(unpacked.orderExpirationType).toBe(appendix.orderExpirationType);
    expect(unpacked.triggerType).toBe(appendix.triggerType);
    expect(unpacked.reduceOnly).toBe(appendix.reduceOnly);
    expect(unpacked.twap?.slippageFrac).toBe(0.000001);
    expect(unpacked.twap?.numOrders).toBe(4294967295);
    expect(packed).toBe(340282366841710300967557013911933828608n);
  });
});
