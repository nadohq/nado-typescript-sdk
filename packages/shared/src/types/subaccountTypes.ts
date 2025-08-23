import { Bytes } from './bytes';

export type SubaccountBytes32 = Bytes;

export type SubaccountNameBytes12 = Bytes;

export interface Subaccount {
  subaccountOwner: string;
  /**
   * If the subaccount is not a valid UTF-8 string, it will be the hex representation of the bytes
   */
  subaccountName: string;
}
