import { cleanupTestState } from '../utils/cleanup';
import { createTestContext } from '../utils/runWithContext';

const { engine, trigger, walletClientAddress, endpointAddr, chainId } =
  createTestContext();

await cleanupTestState(
  { engine, trigger },
  { subaccountOwner: walletClientAddress, endpointAddr, chainId },
);

console.log('Cleanup complete.');
