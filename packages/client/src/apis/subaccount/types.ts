import { AccountWithPrivateKey } from '@nadohq/contracts';
import {
  EngineLinkSignerParams,
  EngineLiquidateSubaccountParams,
} from '@nadohq/engine-client';
import { OptionalSignatureParams, OptionalSubaccountOwner } from '../types';

export type LinkSignerParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineLinkSignerParams>
>;

export type LiquidateSubaccountParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineLiquidateSubaccountParams>
>;

export type CreateStandardLinkedSignerResult = AccountWithPrivateKey;
