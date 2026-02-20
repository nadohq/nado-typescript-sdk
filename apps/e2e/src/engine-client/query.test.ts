import { EngineClient } from '@nadohq/engine-client';
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import {
  assertArray,
  assertDefined,
  assertNonEmptyArray,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { createTestContext } from '../utils/runWithContext';
import { TEST_SUBACCOUNT_NAME, TEST_TIMEOUTS } from '../utils/testConstants';

void describe(
  '[engine-client]: queries',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let client: EngineClient;
    let walletClientAddress: string;

    before(() => {
      const context = createTestContext();
      const walletClient = context.getWalletClient();
      walletClientAddress = walletClient.account.address;
      client = new EngineClient({
        url: context.endpoints.engine,
        walletClient,
      });
    });

    void test('getSubaccountSummary returns subaccount info', async () => {
      const subaccountInfo = await client.getSubaccountSummary({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      debugPrint('Subaccount info', subaccountInfo);
      assertDefined(subaccountInfo, 'subaccountInfo');
      assertArray(subaccountInfo.balances, 'subaccountInfo.balances');
      assertDefined(subaccountInfo.health, 'subaccountInfo.health');
    });

    void test('getSymbols returns market symbols', async () => {
      const result = await client.getSymbols({});

      debugPrint('Symbols', result);
      assertDefined(result, 'symbolsResult');
      assertDefined(result.symbols, 'symbolsResult.symbols');
      assert.ok(
        Object.keys(result.symbols).length > 0,
        'should have at least one symbol',
      );
    });

    void test('getAllMarkets returns product definitions', async () => {
      const products = await client.getAllMarkets();

      debugPrint('All products', products);
      assertNonEmptyArray(products, 'products');
    });

    void test('getHealthGroups returns health group definitions', async () => {
      const result = await client.getHealthGroups();

      debugPrint('Health groups', result);
      assertDefined(result, 'healthGroupsResult');
      assertArray(result.healthGroups, 'healthGroupsResult.healthGroups');
    });

    void test('getInsurance returns a finite insurance balance', async () => {
      const insurance = await client.getInsurance();

      debugPrint('Insurance', insurance);
      assertDefined(insurance, 'insurance');
      assert.ok(insurance.isFinite(), 'insurance should be a finite number');
    });
  },
);
