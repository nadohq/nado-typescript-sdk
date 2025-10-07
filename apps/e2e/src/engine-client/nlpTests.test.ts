import { EngineClient } from '@nadohq/engine-client';
import {
  addDecimals,
  BigDecimals,
  NADO_ABIS,
  NLP_PRODUCT_ID,
  removeDecimals,
} from '@nadohq/shared';
import test from 'node:test';
import { getContract } from 'viem';
import { debugPrint } from '../utils/debugPrint';
import { runWithContext } from '../utils/runWithContext';
import { RunContext } from '../utils/types';

async function nlpTests(context: RunContext) {
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

  const maxMintNlpAmount = await client.getMaxMintNlpAmount({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    spotLeverage: true,
  });
  debugPrint('Max mint NLP amount', maxMintNlpAmount);

  const mintNlpResult = await client.mintNlp({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    quoteAmount: addDecimals(10),
    verifyingAddr: endpointAddr,
    chainId,
  });
  debugPrint('Done minting NLP', mintNlpResult);

  const subaccountInfoAfterNlpMint = await client.getSubaccountSummary({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
  });
  const nlpBalanceAmount =
    subaccountInfoAfterNlpMint.balances.find(
      (bal) => bal.productId === NLP_PRODUCT_ID,
    )?.amount ?? BigDecimals.ZERO;
  debugPrint('NLP Balance', removeDecimals(nlpBalanceAmount));

  const maxBurnNlpAmount = await client.getMaxBurnNlpAmount({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
  });
  debugPrint('Max burn NLP amount', maxBurnNlpAmount);

  const burnNlpResult = await client.burnNlp({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    nlpAmount: nlpBalanceAmount,
    verifyingAddr: endpointAddr,
    chainId,
  });
  debugPrint('Done burning NLP', burnNlpResult);

  const nlpLockedBalances = await client.getNlpLockedBalances({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
  });

  debugPrint('NLP Locked Balances', nlpLockedBalances);
}

void test('[engine-client]: Running NLP tests', () => runWithContext(nlpTests));
