import 'dotenv/config';
import { ChainEnv } from '@nadohq/contracts';
import { getValidatedHex } from '@nadohq/utils';
import { Env } from './types';

const chainEnv: ChainEnv =
  (process.env.CHAIN_ENV as ChainEnv) ?? 'arbitrumTestnet';
const privateKey = getValidatedHex(process.env.PRIVATE_KEY ?? '');

export const env: Env = {
  chainEnv,
  privateKey,
};
