import { NadoClient } from './client';
import {
  createClientContext,
  CreateNadoClientContextAccountOpts,
  CreateNadoClientContextOpts,
} from './context';

/**
 * Creates a Nado client from given options.
 * {@label CLIENT}
 *
 * @param opts - A chain env or custom endpoints, optionally with the `clientType` identifying the
 * calling client. The client type is sent as a header with every request made by the client.
 * @param accountOpts
 *
 * @example
 * const nadoClient = createNadoClient(
 *   { chainEnv: 'inkMainnet', clientType: 'web' },
 *   { publicClient, walletClient },
 * );
 */
export function createNadoClient(
  opts: CreateNadoClientContextOpts,
  accountOpts: CreateNadoClientContextAccountOpts,
): NadoClient {
  return new NadoClient(createClientContext(opts, accountOpts));
}
