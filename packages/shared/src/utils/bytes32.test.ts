import { describe, expect, it } from '@jest/globals';
import { Subaccount } from '../types/subaccountTypes';
import {
  subaccountFromBytes32,
  subaccountFromHex,
  subaccountNameBytesToStr,
  subaccountNameToBytes12,
  subaccountToBytes32,
  subaccountToHex,
} from './bytes32';

const TEST_ADDRESS = '0xb92EFcF519EDC2f1FE60b4491Ef51d97Ed4d7685';

describe('bytes32', () => {
  it('converts a subaccount to bytes', () => {
    const expectedBytes = new Uint8Array([
      185, 46, 252, 245, 25, 237, 194, 241, 254, 96, 180, 73, 30, 245, 29, 151,
      237, 77, 118, 133, 116, 101, 115, 116, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(
      subaccountToBytes32({
        subaccountName: 'test',
        subaccountOwner: TEST_ADDRESS,
      }),
    ).toStrictEqual(expectedBytes);
  });

  it('converts bytes to a subaccount', () => {
    const subaccountBytes = new Uint8Array([
      185, 46, 252, 245, 25, 237, 194, 241, 254, 96, 180, 73, 30, 245, 29, 151,
      237, 77, 118, 133, 116, 101, 115, 116, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const expectedSubaccount: Subaccount = {
      subaccountOwner: TEST_ADDRESS,
      subaccountName: 'test',
    };
    const convertedSubaccount = subaccountFromBytes32(subaccountBytes);

    expect(convertedSubaccount.subaccountOwner.toLowerCase()).toBe(
      expectedSubaccount.subaccountOwner.toLowerCase(),
    );
    expect(convertedSubaccount.subaccountName).toBe(
      expectedSubaccount.subaccountName,
    );
  });

  it('converts a string subaccount name to bytes', () => {
    const nameBytes = subaccountNameToBytes12('test');

    expect(nameBytes).toStrictEqual(
      new Uint8Array([116, 101, 115, 116, 0, 0, 0, 0, 0, 0, 0, 0]),
    );
  });

  it('converts a hex string subaccount name to bytes', () => {
    // `test` in hex form
    const nameBytes = subaccountNameToBytes12('0x74657374');

    expect(nameBytes).toStrictEqual(
      new Uint8Array([116, 101, 115, 116, 0, 0, 0, 0, 0, 0, 0, 0]),
    );
  });

  it('converts a subaccount with a string subaccount name to a hex string', () => {
    const subaccount: Subaccount = {
      subaccountOwner: TEST_ADDRESS,
      subaccountName: 'test',
    };

    expect(subaccountToHex(subaccount)).toBe(
      '0xb92efcf519edc2f1fe60b4491ef51d97ed4d7685746573740000000000000000',
    );
  });

  it('converts a subaccount with a hex subaccount name to a hex string', () => {
    const subaccount: Subaccount = {
      subaccountOwner: TEST_ADDRESS,
      // `test` in hex form
      subaccountName: '0x74657374',
    };

    expect(subaccountToHex(subaccount)).toBe(
      '0xb92efcf519edc2f1fe60b4491ef51d97ed4d7685746573740000000000000000',
    );
  });

  it('converts a hex string to a subaccount', () => {
    const convertedSubaccount = subaccountFromHex(
      '0xb92efcf519edc2f1fe60b4491ef51d97ed4d7685746573740000000000000000',
    );

    expect(convertedSubaccount.subaccountOwner.toLowerCase()).toBe(
      TEST_ADDRESS.toLowerCase(),
    );
    expect(convertedSubaccount.subaccountName).toBe('test');
  });

  it('handles leading zero bytes in subaccount name properly', () => {
    const subaccount: Subaccount = {
      subaccountOwner: TEST_ADDRESS,
      subaccountName: '\u0000\u0000\u0002\u0000iso\u0000',
    };
    const subaccountHex =
      '0xb92efcf519edc2f1fe60b4491ef51d97ed4d76850000020069736f0000000000';

    expect(subaccountToHex(subaccount)).toBe(subaccountHex);
    // Trailing 0 bytes are trimmed
    expect(subaccountFromHex(subaccountHex).subaccountName).toBe(
      '\u0000\u0000\u0002\u0000iso',
    );
  });

  it('handles converting non-utf8 byte sequences by converting bytes to a hex string', () => {
    const invalidUtf8Array = new Uint8Array([0x80, 0x81, 0x82]);
    expect(subaccountNameBytesToStr(invalidUtf8Array)).toBe('0x808182');
  });
});
