import { toBigDecimal } from '@nadohq/utils';
import {
  BalanceWithProduct,
  HealthStatusByType,
  Subaccount,
  WithContract,
} from '../common';
import { subaccountToHex } from '../utils/bytes32';
import {
  mapContractPerpProduct,
  mapContractSpotProduct,
  mapHealthContributions,
} from './utils';

/**
 * Encapsulates health for an account or an account balance
 */

export type GetSubaccountSummaryParams = Subaccount;

export interface SubaccountSummaryResponse {
  exists: boolean;
  balances: BalanceWithProduct[];
  health: HealthStatusByType;
}

/**
 * Returns a comprehensive summary for a subaaccount, including its balances and health
 *
 * {@label CONTRACTS}
 */
export async function getSubaccountSummary({
  subaccountOwner,
  subaccountName,
  querier,
}: WithContract<
  'querier',
  GetSubaccountSummaryParams
>): Promise<SubaccountSummaryResponse> {
  const subaccount = subaccountToHex({
    subaccountOwner: subaccountOwner,
    subaccountName: subaccountName,
  });
  const subaccountInfo = await querier.read.getSubaccountInfo([subaccount]);

  const balances: SubaccountSummaryResponse['balances'] = [];

  subaccountInfo.spotBalances.forEach((spotBalance) => {
    const product = subaccountInfo.spotProducts.find(
      (product) => product.productId === spotBalance.productId,
    );
    if (!product) {
      console.warn('Spot product not found for balance', spotBalance.productId);
      return;
    }

    balances.push({
      amount: toBigDecimal(spotBalance.balance.amount),
      healthContributions: mapHealthContributions(
        subaccountInfo.healthContributions[Number(spotBalance.productId)],
      ),
      ...mapContractSpotProduct(product),
    });
  });

  subaccountInfo.perpBalances.forEach((perpBalance) => {
    const product = subaccountInfo.perpProducts.find(
      (product) => product.productId === perpBalance.productId,
    );
    if (!product) {
      console.warn('Perp product not found for balance', perpBalance.productId);
      return;
    }

    balances.push({
      amount: toBigDecimal(perpBalance.balance.amount),
      vQuoteBalance: toBigDecimal(perpBalance.balance.vQuoteBalance),
      healthContributions: mapHealthContributions(
        subaccountInfo.healthContributions[Number(perpBalance.productId)],
      ),
      ...mapContractPerpProduct(product),
    });
  });

  return {
    exists: subaccountInfo.exists,
    health: {
      initial: {
        health: toBigDecimal(subaccountInfo.healths[0].health),
        assets: toBigDecimal(subaccountInfo.healths[0].assets),
        liabilities: toBigDecimal(subaccountInfo.healths[0].liabilities),
      },
      maintenance: {
        health: toBigDecimal(subaccountInfo.healths[1].health),
        assets: toBigDecimal(subaccountInfo.healths[1].assets),
        liabilities: toBigDecimal(subaccountInfo.healths[1].liabilities),
      },
      unweighted: {
        health: toBigDecimal(subaccountInfo.healths[2].health),
        assets: toBigDecimal(subaccountInfo.healths[2].assets),
        liabilities: toBigDecimal(subaccountInfo.healths[2].liabilities),
      },
    },
    balances,
  };
}
