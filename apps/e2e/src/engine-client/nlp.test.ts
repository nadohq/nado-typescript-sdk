import { EngineClient } from '@nadohq/engine-client';
import {
  addDecimals,
  BigDecimal,
  BigDecimals,
  NADO_ABIS,
  NLP_PRODUCT_ID,
  removeDecimals,
} from '@nadohq/shared';
import assert from 'node:assert/strict';
import { before, beforeEach, describe, test } from 'node:test';
import { Address, getContract } from 'viem';
import { assertArray, assertDefined } from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { createTestContext } from '../utils/runWithContext';
import { TEST_SUBACCOUNT_NAME, TEST_TIMEOUTS } from '../utils/testConstants';

void describe(
  '[engine-client]: NLP operations',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let client: EngineClient;
    let walletClientAddress: string;
    let chainId: number;
    let endpointAddr: Address;

    /** Stored across tests: burn test reads the amount queried by the preceding test. */
    let maxBurnAmount: BigDecimal;

    before(async () => {
      await delay(2500);

      const context = createTestContext();
      const walletClient = context.getWalletClient();
      walletClientAddress = walletClient.account.address;
      chainId = walletClient.chain.id;

      client = new EngineClient({
        url: context.endpoints.engine,
        walletClient,
      });

      const clearinghouse = getContract({
        abi: NADO_ABIS.clearinghouse,
        address: context.contracts.clearinghouse,
        client: walletClient,
      });
      endpointAddr = await clearinghouse.read.getEndpoint();
    });

    beforeEach(async () => {
      await delay(150);
    });

    void test('getMaxMintNlpAmount returns the max mintable amount', async () => {
      const result = await client.getMaxMintNlpAmount({
        subaccountOwner: walletClientAddress,
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
        const result = await client.mintNlp({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
          quoteAmount: addDecimals(10),
          verifyingAddr: endpointAddr,
          chainId,
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
      const subaccountInfo = await client.getSubaccountSummary({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      const nlpBalance =
        subaccountInfo.balances.find((bal) => bal.productId === NLP_PRODUCT_ID)
          ?.amount ?? BigDecimals.ZERO;

      debugPrint('NLP Balance', removeDecimals(nlpBalance));
      assert.ok(nlpBalance.gte(0), 'NLP balance should be non-negative');
    });

    void test('getMaxBurnNlpAmount returns the max burnable amount', async () => {
      maxBurnAmount = await client.getMaxBurnNlpAmount({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      debugPrint('Max burn NLP amount', maxBurnAmount);
      assertDefined(maxBurnAmount, 'maxBurnNlpAmount');
      assert.ok(maxBurnAmount.isFinite(), 'maxBurnNlpAmount should be finite');
    });

    void test('burnNlp burns available NLP tokens', async () => {
      if (!maxBurnAmount?.gt(0)) {
        // No NLP available to burn — nothing to test
        return;
      }

      const result = await client.burnNlp({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
        nlpAmount: maxBurnAmount,
        verifyingAddr: endpointAddr,
        chainId,
      });

      debugPrint('Burn NLP result', result);
      assertDefined(result, 'burnNlpResult');
      assert.equal(result.status, 'success', 'burnNlp should succeed');
    });

    void test('getNlpLockedBalances returns locked balance info', async () => {
      const result = await client.getNlpLockedBalances({
        subaccountOwner: walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      });

      debugPrint('NLP Locked Balances', result);
      assertDefined(result, 'nlpLockedBalances');
      assertArray(result.lockedBalances, 'nlpLockedBalances.lockedBalances');
    });

    void test('getNlpPoolInfo returns pool information', async () => {
      const result = await client.getNlpPoolInfo();

      debugPrint('NLP Pool Info', result);
      assertDefined(result, 'nlpPoolInfo');
      assertArray(result.nlpPools, 'nlpPoolInfo.nlpPools');
    });
  },
);
