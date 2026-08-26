import { EngineClient } from '@nadohq/engine-client';
import { IndexerClient } from '@nadohq/indexer-client';
import { MobileClient } from '@nadohq/mobile-client';
import { NuanzeClient } from '@nadohq/nuanze-client';
import {
  ChainEnv,
  NadoDeploymentAddresses,
  WalletClientWithAccount,
} from '@nadohq/shared';
import { TriggerClient } from '@nadohq/trigger-client';
import { Address, Hex, PublicClient } from 'viem';

export interface Env {
  chainEnv: ChainEnv;
  privateKey: Hex;
}

export interface RunContext {
  env: Env;
  walletClient: WalletClientWithAccount;
  walletClientAddress: string;
  publicClient: PublicClient;
  chainId: number;
  endpointAddr: Address;
  endpoints: {
    engine: string;
    trigger: string;
    indexer: string;
    mobile: string;
    nuanze: string;
  };
  contracts: NadoDeploymentAddresses;
  engine: EngineClient;
  indexer: IndexerClient;
  trigger: TriggerClient;
  mobile: MobileClient;
  nuanze: NuanzeClient;
}
