import { EngineClient } from '@nadohq/engine-client';
import { NADO_ABIS, NLP_PRODUCT_ID } from '@nadohq/contracts';
import { addDecimals, removeDecimals, BigDecimals } from '@nadohq/utils';
import { RunContext } from '../utils/types';
import { getContract } from 'viem';
import { runWithContext } from '../utils/runWithContext';
import test from 'node:test';
import { debugPrint } from '../utils/debugPrint';

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

  const burnNlpResult = await client.burnNlp({
    subaccountOwner: walletClientAddress,
    subaccountName: 'default',
    nlpAmount: nlpBalanceAmount,
    verifyingAddr: endpointAddr,
    chainId,
  });
  debugPrint('Done burning NLP', burnNlpResult);
}

void test('[engine-client]: Running NLP tests', () => runWithContext(nlpTests));
