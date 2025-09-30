import {
  EngineLinkSignerParams,
  EngineLiquidateSubaccountParams,
} from '@nadohq/engine-client';
import { AccountWithPrivateKey } from '@nadohq/shared';
import { OptionalSignatureParams, OptionalSubaccountOwner } from '../types';

export type LinkSignerParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineLinkSignerParams>
>;

export type LiquidateSubaccountParams = OptionalSignatureParams<
  OptionalSubaccountOwner<EngineLiquidateSubaccountParams>
>;

export type CreateStandardLinkedSignerResult = AccountWithPrivateKey;
