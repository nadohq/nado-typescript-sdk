import { cleanupTestState } from '../utils/cleanup';
import { createTestClients } from '../utils/createTestClients';

const { engine, trigger, walletClientAddress, endpointAddr, chainId } =
  createTestClients();

await cleanupTestState(
  { engine, trigger },
  { subaccountOwner: walletClientAddress, endpointAddr, chainId },
);

console.log('Cleanup complete.');
