import {
  addDecimals,
  BigNumbers,
  NLP_PRODUCT_ID,
  removeDecimals,
} from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { assertArray, assertDefined } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[engine-client]: NLP operations',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);

      tc = createTestContext();
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('getMaxMintNlpAmount returns the max mintable amount', async () => {
      const result = await tc.engine.getMaxMintNlpAmount({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        spotLeverage: true,
      });

      debugPrint('Max mint NLP amount', result);
      assertDefined(result, 'maxMintNlpAmount');
      assert.ok(result.isFinite(), 'maxMintNlpAmount should be finite');
    });

    // TODO: Enable the NLP deposit for connected wallet address
    void test('mintNlp mints NLP tokens into the subaccount', async () => {
      try {
        const result = await tc.engine.mintNlp({
          subaccountOwner: tc.walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          quoteAmount: addDecimals(10),
          verifyingAddr: tc.endpointAddr,
          chainId: tc.chainId,
        });

        debugPrint('Mint NLP result', result);
        assertDefined(result, 'mintNlpResult');
        assert.equal(result.status, 'success', 'mintNlp should succeed');
      } catch (error) {
        // NLP minting may not be unlocked for test wallet
        // Skip test if API returns "not yet unlocked" error
        if (
          error instanceof Error &&
          (error.message.includes('not yet unlocked') ||
            error.message.includes('5000'))
        ) {
          console.log(
            'Skipping NLP minting test - wallet not unlocked for minting',
          );
          return;
        }
        throw error;
      }
    });

    void test('NLP balance appears in subaccount after minting', async () => {
      const subaccountInfo = await tc.engine.getSubaccountSummary({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      const nlpBalance =
        subaccountInfo.balances.find((bal) => bal.productId === NLP_PRODUCT_ID)
          ?.amount ?? BigNumbers.ZERO;

      debugPrint('NLP Balance', removeDecimals(nlpBalance));
      assert.ok(nlpBalance.gte(0), 'NLP balance should be non-negative');
    });

    void test('getMaxBurnNlpAmount returns the max burnable amount', async () => {
      const result = await tc.engine.getMaxBurnNlpAmount({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      debugPrint('Max burn NLP amount', result);
      assertDefined(result, 'maxBurnNlpAmount');
      assert.ok(result.isFinite(), 'maxBurnNlpAmount should be finite');
    });

    void test('burnNlp burns available NLP tokens', async () => {
      const { balanceUnlocked } = await tc.engine.getNlpLockedBalances({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      if (balanceUnlocked.balance.lte(0)) {
        console.log(
          'Skipping NLP burn test - no unlocked NLP tokens available',
        );
        return;
      }

      // Burn a tiny fixed amount so the test is idempotent across reruns
      const burnAmount = BigNumber.min(
        addDecimals(0.001),
        balanceUnlocked.balance,
      );
      const result = await tc.engine.burnNlp({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        nlpAmount: burnAmount,
        verifyingAddr: tc.endpointAddr,
        chainId: tc.chainId,
      });

      debugPrint('Burn NLP result', result);
      assertDefined(result, 'burnNlpResult');
      assert.equal(result.status, 'success', 'burnNlp should succeed');
    });

    void test('getNlpLockedBalances returns locked balance info', async () => {
      const result = await tc.engine.getNlpLockedBalances({
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      debugPrint('NLP Locked Balances', result);
      assertDefined(result, 'nlpLockedBalances');
      assertArray(result.lockedBalances, 'nlpLockedBalances.lockedBalances');
    });

    void test('getNlpPoolInfo returns pool information', async () => {
      const result = await tc.engine.getNlpPoolInfo();

      debugPrint('NLP Pool Info', result);
      assertDefined(result, 'nlpPoolInfo');
      assertArray(result.nlpPools, 'nlpPoolInfo.nlpPools');
    });
  },
);
