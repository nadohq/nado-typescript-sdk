import { describe, expect, it } from '@jest/globals';
import { getNadoEIP712Types } from './getNadoEIP712Types';
import { getNadoEIP712Values } from './getNadoEIP712Values';

const TEST_ADDRESS = '0xb92EFcF519EDC2f1FE60b4491Ef51d97Ed4d7685';

describe('getNadoEIP712Types', () => {
  it('matches the LiquidateSubaccount struct verified on chain', () => {
    // From `Verifier.sol` in nado-contracts
    const contractTypeString =
      'LiquidateSubaccount(bytes32 sender,bytes32 liquidatee,uint32 productId,bool isEncodedSpread,int128 amount,uint64 nonce)';

    const fields = getNadoEIP712Types(
      'liquidate_subaccount',
    ).LiquidateSubaccount;
    const typeString = `LiquidateSubaccount(${fields
      .map(({ type, name }) => `${type} ${name}`)
      .join(',')})`;

    expect(typeString).toBe(contractTypeString);
  });

  it.each([
    { productId: 2, isEncodedSpread: false },
    // Spread liquidation encodes both products: (perp_id << 16) | spot_id
    { productId: (2 << 16) | 1, isEncodedSpread: true },
  ])(
    'signs exactly the LiquidateSubaccount fields (%o)',
    ({ productId, isEncodedSpread }) => {
      const values = getNadoEIP712Values('liquidate_subaccount', {
        subaccountOwner: TEST_ADDRESS,
        subaccountName: 'default',
        liquidateeOwner: TEST_ADDRESS,
        liquidateeName: 'test',
        productId,
        isEncodedSpread,
        amount: '1000000000000000000',
        nonce: '1',
      });

      const fieldNames = getNadoEIP712Types(
        'liquidate_subaccount',
      ).LiquidateSubaccount.map(({ name }) => name);

      expect(Object.keys(values).sort()).toStrictEqual([...fieldNames].sort());
      expect(values).toMatchObject({
        productId,
        isEncodedSpread,
        amount: '1000000000000000000',
        nonce: '1',
      });
    },
  );
});
