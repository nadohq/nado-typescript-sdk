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
 * @param opts
 * @param accountOpts
 */
export function createNadoClient(
  opts: CreateNadoClientContextOpts,
  accountOpts: CreateNadoClientContextAccountOpts,
): NadoClient {
  return new NadoClient(createClientContext(opts, accountOpts));
}
