import { createNadoClient, NadoClient } from '@nadohq/client';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';

async function queryTests(context: RunContext) {
  const walletClient = context.getWalletClient();
  const publicClient = context.publicClient;

  const nadoClient: NadoClient = createNadoClient(context.env.chainEnv, {
    walletClient,
    publicClient,
  });

  const walletClientAddress = walletClient.account.address;

  debugPrint('Engine time', await nadoClient.context.engineClient.getTime());
  debugPrint('Symbols', await nadoClient.context.engineClient.getSymbols({}));

  // Fetches state from offchain sequencer
  debugPrint(
    'Engine All Markets',
    await nadoClient.market.getAllEngineMarkets(),
  );
  debugPrint('Edge all markets', await nadoClient.market.getAllEngineMarkets());

  // Fetches state from Arbitrum
  debugPrint('On-Chain all markets', await nadoClient.market.getAllMarkets());

  debugPrint(
    'Latest market prices',
    await nadoClient.market.getLatestMarketPrices({
      productIds: [1, 2, 3],
    }),
  );
  debugPrint(
    'Market liquidity',
    await nadoClient.market.getMarketLiquidity({
      productId: 3,
      // Per side of the book
      depth: 5,
    }),
  );

  // Subaccount state from engine
  debugPrint(
    'Subaccount state from engine',
    await nadoClient.subaccount.getEngineSubaccountSummary({
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
    }),
  );
  // Subaccount state from Arbitrum
  debugPrint(
    'Subaccount state on-chain',
    await nadoClient.subaccount.getSubaccountSummary({
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
    }),
  );

  debugPrint(
    'Isolated positions',
    await nadoClient.subaccount.getIsolatedPositions({
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
    }),
  );

  debugPrint(
    'Subaccount fee rates',
    await nadoClient.subaccount.getSubaccountFeeRates({
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
    }),
  );

  debugPrint(
    'Subaccount linked signer with rate limit',
    await nadoClient.subaccount.getSubaccountLinkedSignerWithRateLimit({
      subaccount: {
        subaccountOwner: walletClientAddress,
        subaccountName: 'default',
      },
    }),
  );

  debugPrint(
    'Referral code',
    await nadoClient.subaccount.getReferralCode({
      subaccount: {
        subaccountOwner: walletClientAddress,
        subaccountName: 'default',
      },
    }),
  );

  debugPrint(
    'Open subaccount orders',
    await nadoClient.market.getOpenSubaccountOrders({
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
      productId: 1,
    }),
  );

  debugPrint(
    'Open subaccount multi-product orders',
    await nadoClient.market.getOpenSubaccountMultiProductOrders({
      subaccountOwner: walletClientAddress,
      subaccountName: 'default',
      productIds: [1, 2, 3],
    }),
  );
}

void test('[client]: Running query tests', () => runWithContext(queryTests));
