import 'dotenv/config';
import { ChainEnv } from '@nadohq/shared';
import { getValidatedHex } from '@nadohq/shared';
import { Env } from './types';

const chainEnv: ChainEnv =
  (process.env.CHAIN_ENV as ChainEnv) ?? 'arbitrumTestnet';
const privateKey = getValidatedHex(process.env.PRIVATE_KEY ?? '');

export const env: Env = {
  chainEnv,
  privateKey,
};
