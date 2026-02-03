import { describe, expect, it } from '@jest/globals';
import { OrderAppendix, OrderExecutionType } from '../../../types';
import { packOrderAppendix } from './packOrderAppendix';
import { unpackOrderAppendix } from './unpackOrderAppendix';

describe('OrderAppendix packing/unpacking', () => {
  it('should pack and unpack an order appendix without iso/twap values', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'default',
      triggerType: 'price',
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(packed).toBe(4097n);
    expect(unpacked.orderExecutionType).toBe(appendix.orderExecutionType);
    expect(unpacked.triggerType).toBe(appendix.triggerType);
    expect(unpacked.reduceOnly).toBeFalsy();
  });

  it('should handle reduceOnly true', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'default',
      triggerType: 'price',
      reduceOnly: true,
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(packed).toBe(6145n);
    expect(unpacked.reduceOnly).toBe(true);
  });

  it('should handle all orderExecutionType values', () => {
    const types: OrderExecutionType[] = ['default', 'ioc', 'fok', 'post_only'];
    for (const type of types) {
      const appendix: OrderAppendix = {
        orderExecutionType: type,
        triggerType: 'price',
      };
      const packed = packOrderAppendix(appendix);
      const unpacked = unpackOrderAppendix(packed);
      expect(unpacked.orderExecutionType).toBe(type);
    }
  });

  it('should handle all triggerType values', () => {
    const triggers = ['price', 'twap', 'twap_custom_amounts'] as const;
    for (const trigger of triggers) {
      const appendix: OrderAppendix = {
        orderExecutionType: 'default',
        triggerType: trigger,
      };
      const packed = packOrderAppendix(appendix);
      const unpacked = unpackOrderAppendix(packed);
      expect(unpacked.triggerType).toBe(trigger);
    }
  });

  it('should handle isolated margin', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'default',
      triggerType: 'price',

      isolated: { margin: 12345678901000000000000n },
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(packed).toBe(227737579102942800187821658369n);
    expect(unpacked.isolated?.margin).toBe(appendix.isolated?.margin);
  });

  it('should handle TWAP fields', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'default',
      triggerType: 'twap',

      twap: { numOrders: 10, slippageFrac: 0.005 },
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(packed).toBe(792281717376363744483197591553n);
    expect(unpacked.twap).toMatchObject({ numOrders: 10, slippageFrac: 0.005 });
  });

  it('should handle max values for all fields for iso orders', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'post_only',
      triggerType: undefined,
      reduceOnly: true,
      isolated: { margin: 18446744073709551615n }, // 2^64-1
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(unpacked.orderExecutionType).toBe(appendix.orderExecutionType);
    expect(unpacked.triggerType).toBe(appendix.triggerType);
    expect(unpacked.reduceOnly).toBe(appendix.reduceOnly);
    expect(unpacked.isolated?.margin).toBe(18446744000000000000n);
    expect(unpacked.twap).toBe(undefined);
    expect(packed).toBe(340282365561237229015142145n);
  });

  it('should handle max values for all fields for TWAP orders', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'post_only',
      triggerType: 'twap_custom_amounts',
      reduceOnly: true,
      twap: {
        numOrders: 4294967295,
        slippageFrac: 0.000001,
      },
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(unpacked.orderExecutionType).toBe(appendix.orderExecutionType);
    expect(unpacked.triggerType).toBe(appendix.triggerType);
    expect(unpacked.reduceOnly).toBe(appendix.reduceOnly);
    expect(unpacked.twap?.slippageFrac).toBe(0.000001);
    expect(unpacked.twap?.numOrders).toBe(4294967295);
    expect(packed).toBe(340282366841710300967557013911933828609n);
  });

  it('should handle builder fields', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'default',
      builder: { builderId: 123, builderFeeRate: 500 },
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(unpacked.builder?.builderId).toBe(123);
    expect(unpacked.builder?.builderFeeRate).toBe(500);
  });

  it('should handle builder with zero fee rate', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'default',
      builder: { builderId: 42, builderFeeRate: 0 },
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(unpacked.builder?.builderId).toBe(42);
    expect(unpacked.builder?.builderFeeRate).toBe(0);
  });

  it('should handle builder with max values', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'default',
      builder: { builderId: 65535, builderFeeRate: 1023 }, // 16 bits, 10 bits max
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(unpacked.builder?.builderId).toBe(65535);
    expect(unpacked.builder?.builderFeeRate).toBe(1023);
  });

  it('should handle builder combined with other flags', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'ioc',
      reduceOnly: true,
      triggerType: 'price',
      builder: { builderId: 5, builderFeeRate: 100 },
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(unpacked.orderExecutionType).toBe('ioc');
    expect(unpacked.reduceOnly).toBe(true);
    expect(unpacked.triggerType).toBe('price');
    expect(unpacked.builder?.builderId).toBe(5);
    expect(unpacked.builder?.builderFeeRate).toBe(100);
  });

  it('should not return builder fields when builderId is 0', () => {
    const appendix: OrderAppendix = {
      orderExecutionType: 'default',
    };
    const packed = packOrderAppendix(appendix);
    const unpacked = unpackOrderAppendix(packed);
    expect(unpacked.builder).toBeUndefined();
  });
});
