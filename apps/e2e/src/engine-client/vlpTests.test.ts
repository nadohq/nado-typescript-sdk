import { EngineClient } from '@nadohq/engine-client';
import { NADO_ABIS, VLP_PRODUCT_ID } from '@nadohq/contracts';
import { addDecimals, removeDecimals, BigDecimals } from '@nadohq/utils';
import { RunContext } from '../utils/types';
import { getContract } from 'viem';
import { runWithContext } from '../utils/runWithContext';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';

async function vlpTests(context: RunContext) {
  const walletClient = context.getWalletClient();
  const walletClientAddress = walletClient.account.address;
  const chainId = walletClient.chain.id;

  const client = new EngineClient({
    url: context.endpoints.engine,
    walletClient,
  });

  const clearinghouse = getContract({
    abi: NADO_ABIS.clearinghouse,
    address: context.contracts.clearinghouse,
    client: walletClient,
  });

  const endpointAddr = await clearinghouse.read.getEndpoint();

  const maxMintVlpAmount = await client.getMaxMintVlpAmount({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    spotLeverage: true,
  });
  debugPrint('Max mint VLP amount', maxMintVlpAmount);

  const mintVlpResult = await client.mintVlp({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    quoteAmount: addDecimals(10),
    verifyingAddr: endpointAddr,
    chainId,
  });
  debugPrint('Done minting VLP', mintVlpResult);

  const subaccountInfoAfterVlpMint = await client.getSubaccountSummary({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
  });
  const vlpBalanceAmount =
    subaccountInfoAfterVlpMint.balances.find(
      (bal) => bal.productId === VLP_PRODUCT_ID,
    )?.amount ?? BigDecimals.ZERO;
  debugPrint('VLP Balance', removeDecimals(vlpBalanceAmount));

  const burnVlpResult = await client.burnVlp({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    vlpAmount: vlpBalanceAmount,
    verifyingAddr: endpointAddr,
    chainId,
  });
  debugPrint('Done burning VLP', burnVlpResult);
}

void test('[engine-client]: Running VLP tests', () => runWithContext(vlpTests));
