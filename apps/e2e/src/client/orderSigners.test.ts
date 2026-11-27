import {
  createNadoClient,
  ENGINE_ERROR_CODES,
  EngineServerFailureError,
  NadoClient,
} from '@nadohq/client';
import { subaccountToHex } from '@nadohq/shared';
import assert from 'node:assert/strict';
import {
  after,
  before,
  beforeEach,
  describe,
  test,
  TestContext,
} from 'node:test';
import { Address } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';

/**
 * Round trip through `NadoClient.subaccount`, which fills in the subaccount owner, verifying
 * address and chain id that the engine-client suite passes explicitly. Adds are rate limited per
 * week, so the suite skips when the shared account has no adds left.
 */
void describe(
  '[client]: order signers',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let nadoClient: NadoClient;
    let walletClientAddress: string;
    let orderSignerAddress: Address;
    let hasRemainingAdds: boolean;

    const orderSignerParams = () => ({
      subaccountName: TEST_SUBACCOUNT_NAME,
      signer: subaccountToHex({
        subaccountOwner: orderSignerAddress,
        subaccountName: '',
      }),
    });

    const includesOrderSigner = (orderSigners: string[]) =>
      orderSigners.some(
        (signer) => signer.toLowerCase() === orderSignerAddress.toLowerCase(),
      );

    // Data-dependent skip: the weekly add limit is shared by every CI run against this account
    const skipIfAddLimitReached = (context: TestContext) => {
      if (!hasRemainingAdds) {
        context.skip('weekly order signer add limit reached');
      }
      return !hasRemainingAdds;
    };

    before(async () => {
      await delay(TEST_DELAYS.LONG);

      const context = createTestContext();
      walletClientAddress = context.walletClientAddress;
      nadoClient = createNadoClient(
        { chainEnv: context.env.chainEnv },
        {
          walletClient: context.walletClient,
          publicClient: context.publicClient,
        },
      );
      orderSignerAddress = privateKeyToAccount(generatePrivateKey()).address;
      debugPrint('Order signer address', orderSignerAddress);

      const rateLimit =
        await nadoClient.subaccount.getSubaccountOrderSignerRateLimit({
          subaccount: {
            subaccountOwner: walletClientAddress,
            subaccountName: TEST_SUBACCOUNT_NAME,
          },
        });
      hasRemainingAdds = rateLimit.remainingTxs.gt(0);
    });

    after(async () => {
      // Best-effort delete so a failed run doesn't leave the signer on the shared subaccount
      try {
        await nadoClient.subaccount.deleteOrderSigner(orderSignerParams());
      } catch (error) {
        const isAlreadyDeleted =
          error instanceof EngineServerFailureError &&
          error.errorCode === ENGINE_ERROR_CODES.ORDER_SIGNER_NOT_FOUND;
        if (!isAlreadyDeleted) {
          debugPrint('Order signer cleanup failed', error);
        }
      }
    });

    beforeEach(async () => {
      await delay(TEST_DELAYS.STANDARD);
    });

    void test('addOrderSigner adds the signer', async (context) => {
      if (skipIfAddLimitReached(context)) return;

      const result =
        await nadoClient.subaccount.addOrderSigner(orderSignerParams());

      debugPrint('Add order signer result', result);
      assert.equal(result.status, 'success', 'addOrderSigner should succeed');

      const orderSigners =
        await nadoClient.subaccount.getSubaccountOrderSigners({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        });
      assert.ok(
        includesOrderSigner(orderSigners.orderSigners),
        'order signers should include the added signer',
      );
    });

    void test('getOrderSignerEvents reports the add once indexed', async (context) => {
      if (skipIfAddLimitReached(context)) return;

      // The indexer lags the engine, so poll briefly for the add event
      const addEvent = await retryWithBackoff(
        async () => {
          const events = await nadoClient.subaccount.getOrderSignerEvents({
            subaccount: {
              subaccountOwner: walletClientAddress,
              subaccountName: TEST_SUBACCOUNT_NAME,
            },
            limit: 20,
          });
          const event = events.find(
            (e) =>
              e.added &&
              e.signer.toLowerCase() === orderSignerAddress.toLowerCase(),
          );
          if (!event) {
            throw new Error('add event not indexed yet');
          }
          return event;
        },
        {
          // Retry the not-indexed-yet error, not just rate limits
          retryIf: () => true,
          maxAttempts: 8,
          initialDelayMs: 1000,
        },
      );

      debugPrint('Order signer add event', addEvent);
      assert.equal(
        addEvent.subaccount.subaccountOwner.toLowerCase(),
        walletClientAddress.toLowerCase(),
        'event should belong to the test subaccount',
      );
    });

    void test('deleteOrderSigner removes the signer', async (context) => {
      if (skipIfAddLimitReached(context)) return;

      const result =
        await nadoClient.subaccount.deleteOrderSigner(orderSignerParams());

      debugPrint('Delete order signer result', result);
      assert.equal(
        result.status,
        'success',
        'deleteOrderSigner should succeed',
      );

      const orderSigners =
        await nadoClient.subaccount.getSubaccountOrderSigners({
          subaccountOwner: walletClientAddress,
          subaccountName: TEST_SUBACCOUNT_NAME,
        });
      assert.ok(
        !includesOrderSigner(orderSigners.orderSigners),
        'order signers should no longer include the deleted signer',
      );
    });
  },
);
