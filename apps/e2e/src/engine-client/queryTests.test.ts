import { EngineClient } from '@nadohq/engine-client';
import { RunContext } from '../utils/types';
import { runWithContext } from '../utils/runWithContext';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';

async function queryTests(context: RunContext) {
  const walletClient = context.getWalletClient();
  const walletClientAddress = walletClient.account.address;

  const client = new EngineClient({
    url: context.endpoints.engine,
    walletClient,
  });

  const subaccountInfo = await client.getSubaccountSummary({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
  });
  debugPrint('Subaccount info', subaccountInfo);

  const symbols = await client.getSymbols({});
  debugPrint('Symbols', symbols);

  const products = await client.getAllMarkets();
  debugPrint('All products', products);

  const healthGroups = await client.getHealthGroups();
  debugPrint('Health groups', healthGroups);

  const insurance = await client.getInsurance();
  debugPrint('Insurance', insurance);

  const minDepositRates = await client.getMinDepositRates();
  debugPrint('Min deposit rates', minDepositRates);
}

void test('[engine-client]: Running query tests', () =>
  runWithContext(queryTests));
